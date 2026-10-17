import {ADMIN_IDLE_MS,adminIdleExpired} from './admin-idle';
import { BadRequestException, HttpException, Injectable, ServiceUnavailableException, UnauthorizedException, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { randomBytes } from "node:crypto";
import { Model, Types } from "mongoose";
import { normalizeEmail, validEmail, type UserRecord, type SessionRecord, type ThrottleRecord, type AuditRecord } from "./auth.schemas";
import { hashPassword, verifyPassword } from "./password";
import { hashToken, type AuthIdentity, type AuthRequest } from "./auth-http";
import { StaffRolesService } from "./staff-roles.service";

@Injectable()
export class AuthService implements OnModuleInit {
  private dummyHash!: string;
  constructor(
    @InjectModel("User") private readonly users: Model<UserRecord>,
    @InjectModel("AuthSession") private readonly sessions: Model<SessionRecord>,
    @InjectModel("LoginThrottle") private readonly throttles: Model<ThrottleRecord>,
    @InjectModel("AuthAudit") private readonly audits: Model<AuditRecord>,
    private readonly config: ConfigService,private readonly staffRoles:StaffRolesService,
  ) {}
  async onModuleInit(): Promise<void> { this.dummyHash = await hashPassword(randomBytes(32).toString("hex")); }
  async audit(event: AuditRecord["event"], outcome: AuditRecord["outcome"], userId?: string): Promise<void> {
    try { await this.audits.create({ event, outcome, ...(userId ? { userId: new Types.ObjectId(userId) } : {}) }); }
    catch { throw new ServiceUnavailableException(); }
  }
  async throttle(ip: string, email: string, event: AuditRecord["event"] = "login"): Promise<void> {
    const now = Date.now();
    const window = Math.floor(now / 900_000);
    const expiresAt = new Date((window + 1) * 900_000);
    try {
      const counters = await Promise.all([`ip:${ip}`, `email:${email}`].map(async identity => {
        const key = hashToken(`${identity}:${window}`);
        const update = { $inc: { attempts: 1 }, $setOnInsert: { expiresAt } };
        try {
          return await this.throttles.findOneAndUpdate({ key }, update, { upsert: true, new: true }).maxTimeMS(1500).lean();
        } catch (error) {
          // Concurrent first attempts can race on the unique index: retry without upsert.
          if (!(error instanceof Error) || !("code" in error) || error.code !== 11000) throw error;
          return await this.throttles.findOneAndUpdate({ key }, { $inc: { attempts: 1 } }, { new: true }).maxTimeMS(1500).lean();
        }
      }));
      if (!counters[0] || !counters[1]) throw new ServiceUnavailableException();
      if (counters[0].attempts > 30 || counters[1].attempts > 5) {
        await this.audit(event, "throttled");
        throw new HttpException("Login throttled", 429);
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException();
    }
  }
  async login(body: unknown, ip: string, previousToken?: string, publicAccount = false) {
    const input = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
    const email = typeof input.email === "string" ? normalizeEmail(input.email.slice(0, 1024)) : "";
    // Every CSRF-valid attempt, including malformed bodies, consumes the IP budget.
    await this.throttle(ip, email);
    if (Object.keys(input).length !== 2 || !validEmail(email) || typeof input.password !== "string" ||
      input.password.length < 1 || input.password.length > 128 || Buffer.byteLength(input.password) > 1024) {
      await this.audit("login", "invalid_request");
      throw new BadRequestException();
    }
    let user;
    let verified: boolean;
    try {
      user = await this.users.findOne({ email: { $eq: email } }).select("+passwordHash").maxTimeMS(1500).lean();
      verified = await verifyPassword(user?.passwordHash ?? this.dummyHash, input.password);
    } catch { throw new ServiceUnavailableException(); }
    let rolePolicy;try{rolePolicy=await this.staffRoles.resolve(user?.role);}catch{throw new ServiceUnavailableException();}
    if (!user || !verified || !user.enabled || !rolePolicy.known || (publicAccount ? user.role !== "MEMBER" : user.role === "MEMBER")) {
      await this.audit("login", "invalid_credentials");
      throw new UnauthorizedException();
    }
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + this.config.getOrThrow<number>("AUTH_SESSION_TTL_SECONDS") * 1000);
    let sessionId: Types.ObjectId | undefined;
    try {
      // Never reuse a client-supplied token. Revoke the previous browser session on successful login.
      if (previousToken) await this.sessions.updateOne({ tokenHash: hashToken(previousToken), revokedAt: null }, { $set: { revokedAt: new Date() } }).maxTimeMS(1500);
      // Bind the session to the access and role revisions checked above, including concurrent edits.
      const session = await this.sessions.create({ userId: user._id, tokenHash: hashToken(token), expiresAt,accessVersion:user.accessVersion??0,customRoleRevision:rolePolicy.revision, ...(user.role!=="MEMBER"?{adminActivityAt:new Date()}: {}) });
      sessionId = session._id;
      await this.audit("login", "success", String(user._id));
    } catch {
      if (sessionId) await this.sessions.updateOne({ _id: sessionId }, { $set: { revokedAt: new Date() } }).catch(() => undefined);
      throw new ServiceUnavailableException();
    }
    return { token, expiresAt, user: { id: String(user._id), email: user.email, role: user.role } satisfies AuthIdentity };
  }
  async authenticate(token: string | undefined):Promise<NonNullable<AuthRequest['auth']>> {
    if (!token) throw new UnauthorizedException();
    try {
      const session = await this.sessions.findOne({ tokenHash: hashToken(token), revokedAt: null, expiresAt: { $gt: new Date() } }).maxTimeMS(1500).lean();
      if (!session) throw new UnauthorizedException();
      // Reload enabled/role on EVERY request; no stale permission or account-status cache.
      const user = await this.users.findOne({ _id: session.userId, enabled: true }).maxTimeMS(1500).lean();
      const rolePolicy=await this.staffRoles.resolve(user?.role);
      if (!user || !rolePolicy.known||session.accessVersion!==undefined&&session.accessVersion!==(user.accessVersion??0)||user.role.startsWith("CUSTOM_")&&session.customRoleRevision!==rolePolicy.revision) throw new UnauthorizedException();
      const lastActivity=session.adminActivityAt??session.createdAt;
      if(user.role!=="MEMBER"&&adminIdleExpired(lastActivity)){
        const revoked=await this.sessions.updateOne({_id:session._id,revokedAt:null,adminActivityAt:session.adminActivityAt??{$exists:false}},{$set:{revokedAt:new Date()}}).maxTimeMS(1500);
        if(!revoked.modifiedCount)return this.authenticate(token);
        throw new UnauthorizedException();
      }
      return { sessionId: String(session._id),passwordChangeRequired:user.role!=="MEMBER"&&!!user.mustChangePassword, ...(user.role!=="MEMBER"?{adminSession:{lastActivityAt:lastActivity.toISOString(),createdAt:session.createdAt.toISOString(),idleExpiresAt:new Date(+lastActivity+ADMIN_IDLE_MS).toISOString()}}:{}), user: { id: String(user._id), email: user.email, role: user.role,...(user.role.startsWith("CUSTOM_")?{permissions:rolePolicy.permissions,roleName:rolePolicy.name}:{}) } satisfies AuthIdentity };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException();
    }
  }
  async adminActivity(sessionId:string,user:AuthIdentity){
    if(user.role==='MEMBER')throw new UnauthorizedException();
    const now=new Date(),cutoff=new Date(+now-ADMIN_IDLE_MS);
    try{const result=await this.sessions.findOneAndUpdate({_id:sessionId,revokedAt:null,expiresAt:{$gt:now},$or:[{adminActivityAt:{$gt:cutoff}},{adminActivityAt:{$exists:false},createdAt:{$gt:cutoff}}]},{$set:{adminActivityAt:now}},{returnDocument:'after'}).maxTimeMS(1500).lean();
      if(!result)throw new UnauthorizedException();return {lastActivityAt:now.toISOString(),createdAt:result.createdAt.toISOString(),idleExpiresAt:new Date(+now+ADMIN_IDLE_MS).toISOString()};
    }catch(error){if(error instanceof HttpException)throw error;throw new ServiceUnavailableException();}
  }
  async logout(sessionId: string, userId: string): Promise<void> {
    try { await this.sessions.updateOne({ _id: sessionId }, { $set: { revokedAt: new Date() } }).maxTimeMS(1500); }
    catch { throw new ServiceUnavailableException(); }
    await this.audit("logout", "success", userId);
  }
}
