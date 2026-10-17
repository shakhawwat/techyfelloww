import {validateDocument} from './document-validation';
import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'node:crypto';
import { Connection, Model, Types, type ClientSession } from 'mongoose';
import { hasIdentityPermission, resources } from '../auth/permissions';
import type { AuthIdentity } from '../auth/auth-http';
import type { ContentKind, MediaReference } from '../content/content.types';
import { parseRevision } from '../admin-content/content-input';
import { altText, validateImage } from './image-validation';
import type { MediaAudit, MediaRecord } from './media.schema';
import { R2Storage } from './r2.storage';
export type UploadFile = { buffer: Buffer; originalname: string };
@Injectable()
export class MediaService {
  constructor(@InjectConnection() private readonly connection: Connection, @InjectModel('Media') private readonly media: Model<MediaRecord>, @InjectModel('MediaAudit') private readonly audits: Model<MediaAudit>, private readonly config: ConfigService, private readonly storage: R2Storage) {}
  private scope(value: unknown, actor: AuthIdentity, action: 'read' | 'edit'): ContentKind {
    if (typeof value !== 'string' || !resources.includes(value as ContentKind)) throw new BadRequestException({ fields: ['resource'] });
    if (!hasIdentityPermission(actor, `${value}:${action}`)) throw new ForbiddenException(); return value as ContentKind;
  }
  private id(value: string) { if (!/^[a-f0-9]{24}$/i.test(value)) throw new BadRequestException({ fields: ['id'] }); return new Types.ObjectId(value); }
  private object(body: unknown, allowed: string[]): Record<string, unknown> { if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key=>!allowed.includes(key))) throw new BadRequestException(); return body as Record<string, unknown>; }
  private async transaction<T>(work: (session: ClientSession)=>Promise<T>): Promise<T> {
    const session = await this.connection.startSession(); try { return await session.withTransaction(work,{ readPreference:'primary',readConcern:{level:'snapshot'},writeConcern:{w:'majority'},maxCommitTimeMS:1500,timeoutMS:5000 }); } finally { await session.endSession(); }
  }
  private failure(error: unknown): never { if (error instanceof HttpException) throw error; throw new ServiceUnavailableException(); }
  private dto(record: MediaRecord & { _id: unknown }) { return { id:String(record._id),filename:record.filename,mimeType:record.mimeType,size:record.size,width:record.width,height:record.height,altText:record.altText,resource:record.resource,uploader:String(record.uploader),status:record.status,revision:record.revision,createdAt:record.createdAt,updatedAt:record.updatedAt,...(record.status==='ready'?{url:record.localPath??this.storage.url(record.storageKey)}:{}) }; }
  async list(raw: Record<string,unknown>, actor: AuthIdentity) {
    const resource=this.scope(raw.resource,actor,'read'); if (Object.keys(raw).some(key=>!['resource','page','limit','status','sort'].includes(key))) throw new BadRequestException();
    const integer=(v:unknown,d:number,max:number)=>{const n=Number(v??d);if(!/^\d+$/.test(String(v??d))||!Number.isSafeInteger(n)||n<1||n>max)throw new BadRequestException();return n;};
    const page=integer(raw.page,1,1000000),limit=integer(raw.limit,20,100),status=raw.status??'ready',sort=raw.sort??'-createdAt';
    if(typeof status!=='string'||typeof sort!=='string'||!['ready','failed','uploading'].includes(status)||!['-createdAt','filename'].includes(sort))throw new BadRequestException();
    try { const filter={resource,status:status as MediaRecord["status"]};const [records,total]=await Promise.all([this.media.find(filter).sort(sort==='filename'?{filename:1,_id:1}:{createdAt:-1,_id:-1}).skip((page-1)*limit).limit(limit).maxTimeMS(1500).exec(),this.media.countDocuments(filter).maxTimeMS(1500).exec()]);return {data:records.map(r=>this.dto(r)),pagination:{page,limit,total,totalPages:Math.ceil(total/limit)},settings:{maxBytes:this.config.getOrThrow<number>('MEDIA_MAX_BYTES'),maxDimension:this.config.getOrThrow<number>('MEDIA_MAX_DIMENSION'),maxPixels:this.config.getOrThrow<number>('MEDIA_MAX_PIXELS'),uploadAvailable:this.storage.configured()}};}catch(e){return this.failure(e);}
  }
  async detail(id:string,actor:AuthIdentity){const parsed=this.id(id);try{const r=await this.media.findById(parsed).maxTimeMS(1500).exec();if(!r)throw new NotFoundException();this.scope(r.resource,actor,'read');return {data:this.dto(r)};}catch(e){return this.failure(e);}}
  async upload(file:UploadFile|undefined,raw:unknown,actor:AuthIdentity){
    const body=this.object(raw,['resource','altText','kind']),resource=this.scope(body.resource,actor,'edit'),description=altText(body.altText);if(!file)throw new BadRequestException({fields:['file']});
    if(body.kind!==undefined&&!['image','document'].includes(String(body.kind)))throw new BadRequestException();
    const image=body.kind==='document'?validateDocument(file.buffer,file.originalname,this.config.getOrThrow<number>('MEDIA_MAX_BYTES')):await validateImage(file.buffer,file.originalname,{bytes:this.config.getOrThrow<number>('MEDIA_MAX_BYTES'),dimension:this.config.getOrThrow<number>('MEDIA_MAX_DIMENSION'),pixels:this.config.getOrThrow<number>('MEDIA_MAX_PIXELS')});this.storage.requireConfigured();
    const id=new Types.ObjectId(),key=`techyfellow/media/${randomBytes(16).toString('hex')}.${image.extension}`;
    try{
      await this.transaction(async session=>{await this.media.create([{_id:id,storageKey:key,filename:image.filename,mimeType:image.mimeType,size:image.size,width:image.width,height:image.height,altText:description,resource,uploader:new Types.ObjectId(actor.id),status:'uploading',revision:1,cleanupPending:true}],{session});await this.audits.create([{actor:new Types.ObjectId(actor.id),action:'upload_started',mediaId:id,resource,revision:1}],{session});});
      await this.storage.put(key,image.data,image.mimeType);
      const record=await this.transaction(async session=>{const r=await this.media.findOneAndUpdate({_id:id,status:'uploading',revision:1},{$set:{status:'ready',revision:2,cleanupPending:false}},{session,new:true}).exec();if(!r)throw new ConflictException();await this.audits.create([{actor:new Types.ObjectId(actor.id),action:'upload_ready',mediaId:id,resource,revision:2}],{session});return r;});return {data:this.dto(record)};
    }catch(e){
      // Claim non-ready state before storage cleanup. Ambiguous ready commits must retain their assets.
      try{const failed=await this.transaction(async session=>{const r=await this.media.findOneAndUpdate({_id:id,status:'uploading',revision:1},{$set:{status:'failed',revision:2,cleanupPending:true}},{session,new:true}).exec();if(r)await this.audits.create([{actor:new Types.ObjectId(actor.id),action:'upload_failed',mediaId:id,resource,revision:2}],{session});return r;});if(failed){await this.storage.removeFailed(key);await this.media.updateOne({_id:id,status:'failed'},{$set:{cleanupPending:false}}).exec();}}catch{/* Explicit reconciliation retains the pending key; never log driver/SDK messages. */}return this.failure(e);
    }
  }
  async update(id:string,raw:unknown,actor:AuthIdentity){const parsed=this.id(id),body=this.object(raw,['revision','altText']),revision=parseRevision(body.revision),description=altText(body.altText);try{return await this.transaction(async session=>{const current=await this.media.findById(parsed).session(session).exec();if(!current)throw new NotFoundException();this.scope(current.resource,actor,'edit');if(current.status!=='ready'||current.revision!==revision)throw new ConflictException();const r=await this.media.findOneAndUpdate({_id:parsed,status:'ready',revision},{$set:{altText:description,revision:revision+1}},{session,new:true}).exec();if(!r)throw new ConflictException();await this.audits.create([{actor:new Types.ObjectId(actor.id),action:'metadata_edit',mediaId:parsed,resource:r.resource,revision:revision+1}],{session});return {data:this.dto(r)};});}catch(e){return this.failure(e);}}
  async validateReferences(references:MediaReference[]|undefined,session:ClientSession,resource:ContentKind='projects'):Promise<void>{
    if(!references?.length)return;const ids:string[]=[];for(const [i,ref]of references.entries()){if(!['image','document'].includes(ref.type)||!/^[a-f0-9]{24}$/i.test(ref.reference))throw new BadRequestException({fields:[`media.${i}.reference`]});try{altText(ref.altText);}catch{throw new BadRequestException({fields:[`media.${i}.altText`]});}ids.push(ref.reference.toLowerCase());}
    const records=await this.media.find({_id:{$in:ids.map(id=>new Types.ObjectId(id))},status:'ready',resource}).session(session).select('_id mimeType').maxTimeMS(1500).exec(),ready=new Set(records.map(r=>String(r._id)));for(const [i,id]of ids.entries())if(!ready.has(id)||(references[i].type==='image')!==!!records.find(r=>String(r._id)===id)?.mimeType.startsWith('image/'))throw new BadRequestException({fields:[`media.${i}.reference`]});
  }
  async publicImages(references:MediaReference[]|undefined,resource:ContentKind='projects'){
    if(!references?.length)return [];const ids=references.filter(ref=>['image','document'].includes(ref.type)&&/^[a-f0-9]{24}$/i.test(ref.reference)).map(ref=>new Types.ObjectId(ref.reference));const records=await this.media.find({_id:{$in:ids},resource,status:'ready'}).maxTimeMS(1500).exec(),ready=new Map(records.map(r=>[String(r._id),r]));
    return references.filter(ref=>ready.has(ref.reference.toLowerCase())).map(ref=>{const r=ready.get(ref.reference.toLowerCase())!;return {reference:ref.reference,type:ref.type,altText:ref.altText,url:r.localPath??this.storage.url(r.storageKey),width:r.width,height:r.height,mimeType:r.mimeType};});
  }
  async publicCourseImages(ids:string[]){const records=await this.media.find({_id:{$in:ids.filter(id=>/^[a-f0-9]{24}$/.test(id)).map(id=>new Types.ObjectId(id))},resource:'courses',status:'ready',mimeType:{$regex:'^image/'}}).exec();return records.map(record=>({id:String(record._id),url:record.localPath??this.storage.url(record.storageKey)}));}
  async reconcile():Promise<number>{
    this.storage.requireConfigured();let count=0;const records=await this.media.find({status:{$in:['uploading','failed']},updatedAt:{$lt:new Date(Date.now()-15*60*1000)}}).limit(100).exec();
    for(const candidate of records){const failed=await this.transaction(async session=>{if(candidate.status==='failed')return await this.media.findOne({_id:candidate._id,status:'failed'}).session(session).exec();const r=await this.media.findOneAndUpdate({_id:candidate._id,status:'uploading',revision:candidate.revision},{$set:{status:'failed',cleanupPending:true},$inc:{revision:1}},{session,new:true}).exec();if(r)await this.audits.create([{actor:r.uploader,action:'reconcile_failed',mediaId:r._id,resource:r.resource,revision:r.revision}],{session});return r;});if(failed){await this.storage.removeFailed(failed.storageKey);await this.media.updateOne({_id:failed._id,status:'failed'},{$set:{cleanupPending:false}}).exec();count++;}}return count;
  }
}
