import { Schema, type Types } from "mongoose";
import { isRoleKey, type Role } from "./permissions";

export function normalizeEmail(value: string): string { return value.trim().toLowerCase(); }
export function validEmail(value: string): boolean {
  return value.length <= 254 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(value);
}
export interface UserRecord {
  mustChangePassword?:boolean; accessVersion?:number; accessLockRevision?:number; name?: string; emailVerifiedAt?: Date; email: string; passwordHash: string; role: Role; enabled: boolean;
  createdAt: Date; updatedAt: Date;
}
export interface SessionRecord {
  userId: Types.ObjectId; tokenHash: string; expiresAt: Date; revokedAt?: Date;
  createdAt: Date; updatedAt: Date; adminActivityAt?:Date;customRoleRevision?:number;accessVersion?:number;
}
export interface ThrottleRecord { key: string; attempts: number; expiresAt: Date }
export interface AuditRecord {
  event: "login" | "logout" | "register" | "verify_email" | "password_change" | "access_change" | "staff_create" | "role_create" | "role_update" | "role_delete"; outcome: "success" | "invalid_credentials" | "throttled" | "invalid_request" | "csrf_rejected";
  targetRole?:string;roleName?:string;previousPermissions?:string[];nextPermissions?:string[];targetUserId?:Types.ObjectId; previousRole?:string; nextRole?:string; previousEnabled?:boolean; nextEnabled?:boolean; userId?: Types.ObjectId; createdAt: Date;
}
const options = { autoCreate: false, autoIndex: false, strict: true };
const userSchema = new Schema<UserRecord>({
  mustChangePassword:{type:Boolean,default:false},accessVersion:{type:Number,default:0},accessLockRevision:{type:Number,default:0},
  name: { type: String, trim: true, maxlength: 120 },
  emailVerifiedAt: Date,
  email: { type: String, required: true, set: normalizeEmail, validate: validEmail },
  passwordHash: { type: String, required: true, select: false, maxlength: 512, match: /^\$argon2id\$/ },
  role: { type: String, required: true, validate:isRoleKey },
  enabled: { type: Boolean, required: true, default: true },
}, { ...options, timestamps: true });
userSchema.index({ email: 1 }, { unique: true, name: "email_unique" });
const sessionSchema = new Schema<SessionRecord>({
  userId: { type: Schema.Types.ObjectId, required: true },
  tokenHash: { type: String, required: true, select: false, match: /^[a-f0-9]{64}$/ },
  expiresAt: { type: Date, required: true },
  revokedAt: Date,
  adminActivityAt: Date,customRoleRevision:Number,accessVersion:Number,
}, { ...options, timestamps: true });
sessionSchema.index({ tokenHash: 1 }, { unique: true, name: "session_token_unique" });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "session_expiry" });
sessionSchema.index({ userId: 1, revokedAt: 1 }, { name: "session_user" });
const throttleSchema = new Schema<ThrottleRecord>({
  key: { type: String, required: true }, attempts: { type: Number, required: true }, expiresAt: { type: Date, required: true },
}, options);
throttleSchema.index({ key: 1 }, { unique: true, name: "throttle_key_unique" });
throttleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "throttle_expiry" });
const auditSchema = new Schema<AuditRecord>({
  event: { type: String, enum: ["login", "logout", "register", "verify_email", "password_change", "access_change", "staff_create", "role_create", "role_update", "role_delete"], required: true },
  outcome: { type: String, enum: ["success", "invalid_credentials", "throttled", "invalid_request", "csrf_rejected"], required: true },
  targetRole:String,roleName:String,previousPermissions:[String],nextPermissions:[String],
  targetUserId:Schema.Types.ObjectId,previousRole:String,nextRole:String,previousEnabled:Boolean,nextEnabled:Boolean,
  userId: Schema.Types.ObjectId,
  createdAt: { type: Date, required: true, default: Date.now, immutable: true },
}, options);
auditSchema.index({ createdAt: -1 }, { name: "audit_created" });
export interface StaffRoleRecord {key:string;name:string;nameKey:string;description:string;permissions:string[];revision:number;assignmentRevision:number;}
const staffRoleSchema=new Schema<StaffRoleRecord>({key:{type:String,required:true,match:/^CUSTOM_[a-f0-9]{24}$/},name:{type:String,required:true,maxlength:64},nameKey:{type:String,required:true},description:{type:String,maxlength:400},permissions:[String],revision:{type:Number,required:true},assignmentRevision:{type:Number,default:0}},options);
staffRoleSchema.index({key:1},{unique:true,name:'staff_role_key_unique'});staffRoleSchema.index({nameKey:1},{unique:true,name:'staff_role_name_unique'});
export const authDefinitions = {
  staffRole:{name:'StaffRole',collection:'auth_staff_roles',schema:staffRoleSchema},
  user: { name: "User", collection: "users", schema: userSchema },
  session: { name: "AuthSession", collection: "auth_sessions", schema: sessionSchema },
  throttle: { name: "LoginThrottle", collection: "login_throttles", schema: throttleSchema },
  audit: { name: "AuthAudit", collection: "auth_audits", schema: auditSchema },
};
