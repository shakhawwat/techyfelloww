import { Schema, type Types } from 'mongoose';
import { resources } from '../auth/permissions';
import type { ContentKind } from '../content/content.types';
export interface MediaRecord {
  localPath?:string; storageKey: string; filename: string; mimeType: string; size: number; width: number; height: number; altText: string;
  resource: ContentKind; uploader: Types.ObjectId; status: 'uploading' | 'ready' | 'failed'; revision: number; cleanupPending: boolean; createdAt: Date; updatedAt: Date;
}
const schema = new Schema<MediaRecord>({
  localPath:{type:String,immutable:true,match:/^\/banner\/[a-zA-Z0-9_.-]+$/},
  storageKey: { type: String, required: true, immutable: true }, filename: { type: String, required: true, maxlength: 120 },
  mimeType: { type: String, enum: ['image/jpeg','image/png','image/webp','application/pdf','text/plain'], required: true }, size: { type: Number, required: true, min: 1 },
  width: { type: Number, required: true, min: 1 }, height: { type: Number, required: true, min: 1 },
  altText: { type: String, required: true, minlength: 3, maxlength: 500 }, resource: { type: String, enum: resources, required: true, immutable: true },
  uploader: { type: Schema.Types.ObjectId, required: true, immutable: true }, status: { type: String, enum: ['uploading','ready','failed'], required: true },
  revision: { type: Number, min: 1, required: true }, cleanupPending: { type: Boolean, default: true },
}, { timestamps: true, strict: true, autoCreate: false, autoIndex: false });
schema.index({ storageKey: 1 }, { unique: true, name: 'media_key_unique' });
schema.index({ resource: 1, status: 1, createdAt: -1, _id: -1 }, { name: 'media_library' });
schema.index({ status: 1, updatedAt: 1 }, { name: 'media_reconciliation' });
export const mediaDefinition = { name: 'Media', collection: 'media', schema };
export interface MediaAudit { actor: Types.ObjectId; action: string; mediaId: Types.ObjectId; resource: ContentKind; revision: number; createdAt: Date }
const auditSchema = new Schema<MediaAudit>({ actor: { type: Schema.Types.ObjectId, required: true },
  action: { type: String, enum: ['upload_started','upload_ready','upload_failed','metadata_edit','reconcile_failed'], required: true },
  mediaId: { type: Schema.Types.ObjectId, required: true }, resource: { type: String, enum: resources, required: true },
  revision: { type: Number, required: true, min: 1 }, createdAt: { type: Date, default: Date.now, immutable: true },
}, { strict: true, autoCreate: false, autoIndex: false });
auditSchema.index({ mediaId: 1, revision: 1 }, { unique: true, name: 'media_audit_revision' });
export const mediaAuditDefinition = { name: 'MediaAudit', collection: 'media_audits', schema: auditSchema };
