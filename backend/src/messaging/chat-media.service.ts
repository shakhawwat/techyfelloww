import {AttachmentScanQueue} from './attachment-scan-queue.service';
import {MalwareScanner} from './malware-scanner.service';
import {BadRequestException,ConflictException,ForbiddenException,HttpException,Injectable,NotFoundException,PayloadTooLargeException} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {createHash} from 'node:crypto';
import {Model,type ClientSession} from 'mongoose';
import type {AuthIdentity} from '../auth/auth-http';
import {hasIdentityPermission} from '../auth/permissions';
import {validateChatFile} from './chat-file-validation';
import type {ChatAttachment} from './chat-media.schema';
import type {Conversation} from './messaging.schema';
import type {ThrottleRecord} from '../auth/auth.schemas';
export const CHAT_FILE_BYTES=8*1024*1024;
export function attachmentIds(raw:unknown):string[]{if(raw===undefined)return [];if(!Array.isArray(raw)||raw.length>3||raw.some(id=>typeof id!=='string'||!/^[a-f0-9]{24}$/.test(id))||new Set(raw).size!==raw.length)throw new BadRequestException();return raw;}
@Injectable()
export class ChatMediaService {
 constructor(private readonly scans:AttachmentScanQueue,private readonly scanner:MalwareScanner,@InjectModel('SupportAttachment') private readonly files:Model<ChatAttachment>,@InjectModel('SupportConversation') private readonly threads:Model<Conversation>,@InjectModel('LoginThrottle') private readonly throttles:Model<ThrottleRecord>){}
 dto(file:ChatAttachment & {_id:unknown}){return {id:String(file._id),name:file.name,mimeType:file.mimeType,size:file.size};}
 async upload(actor:AuthIdentity,file:{buffer:Buffer;originalname:string;mimetype:string}|undefined,key:unknown,targetConversation?:string){
  if(targetConversation){if(!hasIdentityPermission(actor,'admin:access')||!hasIdentityPermission(actor,'inbox:read')||!hasIdentityPermission(actor,'inbox:manage'))throw new ForbiddenException();if(!/^[a-f0-9]{24}$/.test(targetConversation)||!await this.threads.exists({_id:targetConversation}))throw new NotFoundException();}
  if(!file||typeof key!=='string'||!/^[a-f0-9-]{36}$/.test(key)||!file.buffer.length)throw new BadRequestException();if(file.buffer.length>CHAT_FILE_BYTES)throw new PayloadTooLargeException();
  const id=createHash('sha256').update(`${actor.id}:${key}`).digest('hex').slice(0,24),hash=createHash('sha256').update(file.buffer).digest('hex'),previous=await this.files.findById(id).select('+hash').lean();
  if(previous){if(previous.owner!==actor.id||previous.hash!==hash||(previous.targetConversation??'')!==(targetConversation??''))throw new ConflictException();return {data:this.dto(previous)};}
  const window=Math.floor(Date.now()/60000),rateKey=`support-upload:${actor.id}:${window}`;let counter;try{counter=await this.throttles.findOneAndUpdate({key:rateKey},{$inc:{attempts:1},$setOnInsert:{expiresAt:new Date((window+2)*60000)}},{upsert:true,returnDocument:'after'});}catch(e){if((e as {code?:number}).code!==11000)throw e;counter=await this.throttles.findOneAndUpdate({key:rateKey},{$inc:{attempts:1}},{returnDocument:'after'});}if(!counter||counter.attempts>30)throw new HttpException('Too many uploads',429);
  const [quota]=await this.files.aggregate([{$match:{owner:actor.id}},{$group:{_id:null,size:{$sum:'$size'}}}]);if((quota?.size??0)+file.buffer.length>200*1024*1024)throw new PayloadTooLargeException();
  const {data,mimeType,name}=await validateChatFile(file,CHAT_FILE_BYTES),scan=await this.scanner.validate(file.buffer,data);
  const record=await this.files.findOneAndUpdate({_id:id},{$setOnInsert:{owner:actor.id,key,hash,...scan,...(targetConversation?{targetConversation}:{}),name,mimeType,size:data.length,data,createdAt:new Date(),expiresAt:new Date(Date.now()+86400000)}},{upsert:true,returnDocument:'after'}).select('+hash').lean();if(!record||record.hash!==hash||(record.targetConversation??'')!==(targetConversation??''))throw new ConflictException();return {data:this.dto(record)};
 }
 async bind(ids:string[],actor:AuthIdentity,conversationId:string,messageKey:string,session:ClientSession,staff=false){
  const thread=await this.threads.findById(conversationId).session(session).select('owner').lean();if(!thread)throw new NotFoundException();
  if(staff){if(!hasIdentityPermission(actor,'admin:access')||!hasIdentityPermission(actor,'inbox:read')||!hasIdentityPermission(actor,'inbox:manage'))throw new ForbiddenException();}else if(thread.owner!==actor.id)throw new ForbiddenException();
  const files=await this.files.find({_id:{$in:ids},owner:actor.id,...(staff?{targetConversation:conversationId}:{targetConversation:{$exists:false}}),$or:[{conversationId:{$exists:false}},{conversationId,messageKey}]}).session(session).lean();if(files.length!==ids.length)throw new ForbiddenException();
  await this.files.updateMany({_id:{$in:ids},owner:actor.id},{$set:{conversationId,messageKey},$unset:{expiresAt:1}},{session});return ids.map(id=>this.dto(files.find(f=>String(f._id)===id)!));
 }
 async authorizedFile(id:string,actor:AuthIdentity,bytes=false){
  if(!/^[a-f0-9]{24}$/.test(id))throw new NotFoundException();const file=await this.files.findById(id).select(bytes?'+data':'-data').lean();if(!file)throw new NotFoundException();
  if(file.conversationId){
   const thread=await this.threads.findOne({_id:file.conversationId,messages:{$elemMatch:{key:file.messageKey,'attachments.id':id}}}).select('owner').lean();
   if(!thread||thread.owner!==actor.id&&(!hasIdentityPermission(actor,'admin:access')||!hasIdentityPermission(actor,'inbox:read')))throw new NotFoundException();
  }else if(file.owner!==actor.id||file.targetConversation&&(!hasIdentityPermission(actor,'admin:access')||!hasIdentityPermission(actor,'inbox:read')||!hasIdentityPermission(actor,'inbox:manage')))throw new NotFoundException();
  return file;
 }
 async read(id:string,actor:AuthIdentity){const file=await this.authorizedFile(id,actor,true);await this.scans.verifyStored('support_attachments',file);const safety=await this.files.findById(file._id).select('scanState manualQuarantine').lean();if(!safety)throw new NotFoundException();this.scanner.assertAvailable(safety);return file;}
 async scanStatus(id:string,actor:AuthIdentity){return {data:this.scans.status(await this.authorizedFile(id,actor))};}
 async retryScan(id:string,actor:AuthIdentity,raw:unknown){if(!raw||typeof raw!=='object'||Object.keys(raw).length)throw new BadRequestException();await this.authorizedFile(id,actor);return this.scans.retry('support_attachments',id);}
}
