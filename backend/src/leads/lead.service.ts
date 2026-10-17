import {StaffRolesService} from "../auth/staff-roles.service";
import { NotificationService } from "../notifications/notification.service";
import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { randomBytes } from "node:crypto";
import { Connection, Model, Types, type ClientSession } from "mongoose";
import { hashToken, type AuthIdentity } from "../auth/auth-http";
import { hasIdentityPermission } from "../auth/permissions";
import type { UserRecord } from "../auth/auth.schemas";
import { leadId, parseInquiry, parseLeadQuery, parseLeadUpdate, invalid } from "./lead-input";
import { transitions, type LeadRecord, type LeadAuditRecord, type LeadThrottleRecord } from "./lead.schema";
export function leadDto(record: Record<string, unknown>, detail: boolean) {
  const common = { id: String(record._id), reference: record.reference, type: record.type, name: record.name, email: record.email,
    status: record.status, ownerId: record.ownerId ? String(record.ownerId) : null, revision: record.revision, createdAt: record.createdAt, updatedAt: record.updatedAt };
  return detail ? { ...common, phone: record.phone, organization: record.organization, payload: record.payload, consent: record.consent, marketingConsent: record.marketingConsent, source: record.source,
    notes: Array.isArray(record.notes) ? record.notes.map(note => ({ text: note.text, actor: String(note.actor), createdAt: note.createdAt })) : [] } : common;
}
@Injectable()
export class LeadService {
  constructor(@InjectConnection() private readonly connection: Connection, private readonly notifications: NotificationService,
    @InjectModel("Lead") private readonly leads: Model<LeadRecord>, @InjectModel("LeadAudit") private readonly audits: Model<LeadAuditRecord>,
    @InjectModel("LeadThrottle") private readonly throttles: Model<LeadThrottleRecord>, @InjectModel("User") private readonly users: Model<UserRecord>,private readonly staffRoles:StaffRolesService) {}
  private authorize(actor: AuthIdentity, action: "read" | "manage") { if (!hasIdentityPermission(actor, `leads:${action}`)) throw new ForbiddenException(); }
  private failure(error: unknown): never { if (error instanceof HttpException) throw error; throw new ServiceUnavailableException(); }
  private async throttle(identity: string, limit: number) {
    const window = Math.floor(Date.now() / 900000), key = hashToken(`${identity}:${window}`);
    try {
      let result;
      try { result = await this.throttles.findOneAndUpdate({ key }, { $inc: { attempts: 1 }, $setOnInsert: { expiresAt: new Date((window + 1) * 900000) } }, { upsert: true, new: true }).maxTimeMS(1500).lean(); }
      catch (error) { if (!(error instanceof Error) || !("code" in error) || error.code !== 11000) throw error; result = await this.throttles.findOneAndUpdate({ key }, { $inc: { attempts: 1 } }, { new: true }).maxTimeMS(1500).lean(); }
      if (!result) throw new ServiceUnavailableException(); if (result.attempts > limit) throw new HttpException("Throttled", 429);
    } catch (error) { return this.failure(error); }
  }
  async submit(body: unknown, key: unknown, ip: string) {
    await this.throttle(`ip:${ip}`, 30);
    const input = parseInquiry(body);
    if (typeof key !== "string" || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) return invalid("idempotencyKey");
    await this.throttle(`email:${input.email}`, 5);
    const idempotencyHash = hashToken(key), payloadHash = hashToken(JSON.stringify(input));
    const acknowledge = (record: { reference: string; payloadHash: string }) => { if (record.payloadHash !== payloadHash) throw new ConflictException(); return { data: { reference: record.reference, status: "received" } }; };
    try {
      const existing = await this.leads.findOne({ idempotencyHash }).select("reference +payloadHash").maxTimeMS(1500).lean();
      if (existing) return acknowledge(existing);
      try {
        const session = await this.connection.startSession();
        try { return await session.withTransaction(async () => {
          const [record] = await this.leads.create([{ ...input, reference: `TF-${randomBytes(12).toString("hex").toUpperCase()}`, status: "received", revision: 1, notes: [], idempotencyHash, payloadHash }], { session });
          await this.notifications.enqueue(record, session); return acknowledge(record);
        }, { readPreference: "primary", readConcern: { level: "snapshot" }, writeConcern: { w: "majority" }, maxCommitTimeMS: 1500, timeoutMS: 5000 }); }
        finally { await session.endSession(); }
      }
      catch (error) {
        if (!(error instanceof Error) || !("code" in error) || error.code !== 11000) throw error;
        const duplicate = await this.leads.findOne({ idempotencyHash }).select("reference +payloadHash").maxTimeMS(1500).lean();
        if (!duplicate) throw new ServiceUnavailableException(); return acknowledge(duplicate);
      }
    } catch (error) { return this.failure(error); }
  }
  async list(raw: Record<string, unknown>, actor: AuthIdentity) {
    this.authorize(actor, "read"); const { page, limit, skip, filter, sort } = parseLeadQuery(raw);
    try {
      const [records, total] = await Promise.all([this.leads.find(filter).select("reference type name email status ownerId revision createdAt updatedAt").sort(sort).skip(skip).limit(limit).maxTimeMS(1500).lean<Record<string, unknown>[]>(), this.leads.countDocuments(filter).maxTimeMS(1500)]);
      return { data: records.map(record => leadDto(record, false)), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    } catch (error) { return this.failure(error); }
  }
  async owners(raw: Record<string, unknown>, actor: AuthIdentity) {
    this.authorize(actor, "manage"); const { page, limit, skip } = parseLeadQuery(raw);
    if (Object.keys(raw).some(key => !["page", "limit"].includes(key))) return invalid("query");
    try {
      const eligible=(await this.staffRoles.available()).filter(role=>role.permissions.includes("leads:manage")).map(role=>role.role);
      const filter = { enabled: true, role: { $in: eligible } };
      const [users, total] = await Promise.all([this.users.find(filter).select("email role").sort({ email: 1 }).skip(skip).limit(limit).maxTimeMS(1500).lean(), this.users.countDocuments(filter).maxTimeMS(1500)]);
      return { data: users.map(user => ({ id: String(user._id), email: user.email, role: user.role })), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    } catch (error) { return this.failure(error); }
  }
  async detail(value: string, actor: AuthIdentity) {
    this.authorize(actor, "read"); const id = leadId(value);
    try { const record = await this.leads.findById(id).maxTimeMS(1500).lean<Record<string, unknown>>(); if (!record) throw new NotFoundException(); return { data: leadDto(record, true) }; }
    catch (error) { return this.failure(error); }
  }
  async update(value: string, body: unknown, actor: AuthIdentity) {
    this.authorize(actor, "manage"); const id = new Types.ObjectId(leadId(value)), input = parseLeadUpdate(body); let session: ClientSession | undefined;
    try {
      session = await this.connection.startSession();
      return await session.withTransaction(async () => {
        const lead = await this.leads.findById(id).session(session!).maxTimeMS(1500); if (!lead) throw new NotFoundException();
        if (lead.revision !== input.revision) throw new ConflictException();
        const changes: Record<string, unknown> = {}, unset: Record<string, 1> = {}, fields: string[] = [];
        if (input.status !== undefined) { if (!transitions[lead.status].includes(input.status)) throw new ConflictException(); changes.status = input.status; fields.push("status"); }
        if (input.ownerId !== undefined) {
          if (input.ownerId !== null) {
            const owner=await this.users.findOne({_id:new Types.ObjectId(input.ownerId),enabled:true}).session(session!).maxTimeMS(1500).lean();
            const policy=await this.staffRoles.resolve(owner?.role,session!);
            if(!owner||!policy.known||!policy.permissions.includes("leads:manage"))throw new BadRequestException({fields:["ownerId"]});
          }
          if ((lead.ownerId ? String(lead.ownerId) : null) !== input.ownerId) { if (input.ownerId === null) unset.ownerId = 1; else changes.ownerId = new Types.ObjectId(input.ownerId); fields.push("ownerId"); }
        }
        if (input.note) { if (lead.notes.length >= 1000) throw new ConflictException(); fields.push("note"); }
        if (!fields.length) throw new ConflictException(); changes.revision = input.revision + 1;
        const result = await this.leads.findOneAndUpdate({ _id: id, revision: input.revision }, { $set: changes, ...(Object.keys(unset).length ? { $unset: unset } : {}), ...(input.note ? { $push: { notes: { text: input.note, actor: new Types.ObjectId(actor.id), createdAt: new Date() } } } : {}) }, { new: true, runValidators: true, session }).maxTimeMS(1500).lean<Record<string, unknown>>();
        if (!result) throw new ConflictException();
        await this.audits.create([{ actor: new Types.ObjectId(actor.id), action: "update", resource: "leads", leadId: id, revision: input.revision + 1, fields }], { session });
        return { data: leadDto(result, true) };
      }, { readPreference: "primary", readConcern: { level: "snapshot" }, writeConcern: { w: "majority" }, maxCommitTimeMS: 1500, timeoutMS: 5000 });
    } catch (error) { return this.failure(error); } finally { await session?.endSession(); }
  }
}
