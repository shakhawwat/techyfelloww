import {createHash} from 'node:crypto';
import {ChatMediaService,attachmentIds} from './chat-media.service';
import {BadRequestException,ConflictException,ForbiddenException,HttpException,Injectable,NotFoundException} from '@nestjs/common';
import {InjectConnection,InjectModel} from '@nestjs/mongoose';
import {Connection,Model,Types,type ClientSession} from 'mongoose';
import type {AuthIdentity} from '../auth/auth-http';
import {hasIdentityPermission} from '../auth/permissions';
import {StaffRolesService} from '../auth/staff-roles.service';
import type {ThrottleRecord} from '../auth/auth.schemas';
import type {Conversation} from './messaging.schema';
export function input(raw:unknown,allowed:string[]){if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!allowed.includes(k)))throw new BadRequestException();return raw as Record<string,unknown>;}
export function text(value:unknown,max:number){if(typeof value!=='string'||!value.trim()||value.trim().length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value))throw new BadRequestException();return value.trim();}
function key(value:unknown){if(typeof value!=='string'||! /^[a-f0-9-]{36}$/.test(value))throw new BadRequestException();return value;}
function id(value:string){if(!/^[a-f0-9]{24}$/.test(value))throw new NotFoundException();return value;}
@Injectable()
export class MessagingService {
 constructor(@InjectModel('SupportConversation') private readonly threads:Model<Conversation>,@InjectConnection() private readonly db:Connection,private readonly roles:StaffRolesService,@InjectModel('LoginThrottle') private readonly throttles:Model<ThrottleRecord>,private readonly media:ChatMediaService){}
 private async throttle(owner:string){const window=Math.floor(Date.now()/60000),key=`support:${owner}:${window}`,update={$inc:{attempts:1},$setOnInsert:{expiresAt:new Date((window+2)*60000)}};let counter;try{counter=await this.throttles.findOneAndUpdate({key},update,{upsert:true,returnDocument:'after'}).lean();}catch(e){if((e as {code?:number}).code!==11000)throw e;counter=await this.throttles.findOneAndUpdate({key},{$inc:{attempts:1}},{returnDocument:'after'}).lean();}if(!counter||counter.attempts>30)throw new HttpException('Too many messages',429);}
 private access(actor:AuthIdentity,staff:boolean,write=false){if(staff&&!hasIdentityPermission(actor,write?'inbox:manage':'inbox:read'))throw new ForbiddenException();}
 private filter(actor:AuthIdentity,staff:boolean,thread?:string){this.access(actor,staff);return {...(thread?{_id:id(thread)}:{}),...(staff?{}:{owner:actor.id})};}
 private dto(row:Conversation & {_id:unknown},staff:boolean,detail=false,contextAllowed=false){return {id:String(row._id),type:'support',subject:row.subject,kind:row.kind,reference:row.kind==='order'&&staff&&!contextAllowed?'':row.reference,status:row.status,assignee:row.assignee,updatedAt:row.updatedAt,lastMessage:row.messages.at(-1)?.text||row.messages.at(-1)?.attachments?.map(file=>file.name).join(', ')||'',unread:row.messages.slice(staff?row.staffRead:row.clientRead).filter(m=>m.staff!==staff).length,...(detail?{messages:row.messages.map((m,index)=>({id:m.key,text:m.text,staff:m.staff,at:m.at,sequence:index+1,attachments:m.attachments??[]}))}:{})};}
 async list(actor:AuthIdentity,staff:boolean,raw:Record<string,unknown>){
  input(raw,['search','filter','page']);const filter:Record<string,unknown>=this.filter(actor,staff);
  const search=raw.search===undefined?'':text(raw.search,100),state=raw.filter??'all',page=raw.page===undefined?1:Number(raw.page);
  if(!['all','unread','open','closed'].includes(String(state))||!Number.isSafeInteger(page)||page<1||page>1000000||raw.page!==undefined&&!/^[1-9]\d*$/.test(String(raw.page)))throw new BadRequestException();
  if(search){const escaped=search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const clients=staff?await this.db.collection('users').find({$or:[{name:{$regex:escaped,$options:'i'}},{email:{$regex:escaped,$options:'i'}}]},{projection:{_id:1}}).toArray():[];filter.$or=[{subject:{$regex:escaped,$options:'i'}},{'messages.text':{$regex:escaped,$options:'i'}},...(staff?[{owner:{$in:clients.map(client=>String(client._id))}}]:[])];}
  const unread={$gt:[{$size:{$filter:{input:{$slice:['$messages',{$ifNull:[staff?'$staffRead':'$clientRead',0]},500]},as:'message',cond:{$ne:['$$message.staff',staff]}}}},0]};
  const allFilter={...filter};
  if(state==='open'||state==='closed')filter.status=state;
  if(state==='unread')filter.$expr=unread;
  const [rows,all,unreadCount]=await Promise.all([this.threads.find(filter).sort({updatedAt:-1,_id:-1}).skip((page-1)*50).limit(51).lean(),this.threads.countDocuments(allFilter),this.threads.countDocuments({...allFilter,$expr:unread})]);
  const clients=staff?await this.db.collection('users').find({_id:{$in:rows.map(row=>new Types.ObjectId(row.owner))}},{projection:{name:1,email:1}}).toArray():[];
  const profiles=staff?await this.db.collection('member_profiles').find({owner:{$in:rows.map(row=>row.owner)}},{projection:{owner:1,photo:1}}).toArray():[];
  return {data:rows.slice(0,50).map(r=>({...this.dto(r,staff,false,hasIdentityPermission(actor,'courses:edit')),...(staff?{client:{id:r.owner,photoUrl:profiles.find(profile=>profile.owner===r.owner)?.photo?`/api/v1/community/images/${profiles.find(profile=>profile.owner===r.owner)!.photo}`:'',name:clients.find(user=>String(user._id)===r.owner)?.name||clients.find(user=>String(user._id)===r.owner)?.email||'Client'}}:{})})),counts:{all,unread:unreadCount},pagination:{page,hasMore:rows.length>50}};
 }
 async detail(actor:AuthIdentity,staff:boolean,thread:string){const row=await this.threads.findOne(this.filter(actor,staff,thread)).lean();if(!row)throw new NotFoundException();const client=staff?await this.db.collection('users').findOne({_id:new Types.ObjectId(row.owner)},{projection:{name:1,email:1,createdAt:1,enabled:1,emailVerifiedAt:1}}):null;const profile=staff?await this.db.collection('member_profiles').findOne({owner:row.owner},{projection:{photo:1}}):null;return {data:{...this.dto(row,staff,true,hasIdentityPermission(actor,'courses:edit')),...(staff?{client:{id:row.owner,photoUrl:profile?.photo?`/api/v1/community/images/${profile.photo}`:'',name:client?.name||client?.email||'Client',email:client?.email??'',createdAt:client?.createdAt??null,enabled:client?.enabled??null,emailVerified:!!client?.emailVerifiedAt}}:{})}};}
 async create(actor:AuthIdentity,raw:unknown):Promise<{data:ReturnType<MessagingService['dto']>} >{const b=input(raw,['key','subject','kind','reference','text']),requestKey=key(b.key),subject=text(b.subject,160),message=text(b.text,4000);if(!['general','course','order'].includes(String(b.kind)))throw new BadRequestException();const reference=b.kind==='general'?'':text(b.reference,120);
 if(b.kind==='order'&&!await this.db.collection('academy_orders').findOne({_id:new Types.ObjectId(id(reference)),userId:actor.id},{projection:{_id:1}}))throw new NotFoundException();
 if(b.kind==='course'&&!await this.db.collection('courses').findOne({slug:reference,status:'published'},{projection:{_id:1}}))throw new NotFoundException();
 const previous=await this.threads.findOne({owner:actor.id,key:requestKey}).lean();if(previous){if(previous.subject!==subject||previous.messages[0].text!==message||previous.kind!==b.kind||previous.reference!==reference)throw new ConflictException();return {data:this.dto(previous,false,true)};}
 await this.throttle(actor.id);
 try{const row=await this.threads.create({owner:actor.id,key:requestKey,subject,kind:String(b.kind),reference,status:'open',messages:[{key:requestKey,sender:actor.id,staff:false,text:message,at:new Date()}],updatedAt:new Date()});return {data:this.dto(row,false,true)};}catch(e){if((e as {code?:number}).code===11000)return this.create(actor,raw);throw e;}}
 async send(actor:AuthIdentity,staff:boolean,thread:string,raw:unknown){
  this.access(actor,staff,true);const body=input(raw,['key','text','attachments']),requestKey=key(body.key),ids=attachmentIds(body.attachments);
  const message=body.text===undefined||typeof body.text==='string'&&!body.text.trim()?'':text(body.text,4000);if(!message&&!ids.length)throw new BadRequestException();
  const filter=this.filter(actor,staff,thread);
  const work=async(session:ClientSession|null)=>{
   const row=await this.threads.findOne(filter).session(session).lean();if(!row)throw new NotFoundException();
   const previous=row.messages.find(m=>m.key===requestKey),same=(m:typeof row.messages[number])=>m.sender===actor.id&&m.text===message&&JSON.stringify((m.attachments??[]).map(a=>a.id))===JSON.stringify(ids);
   if(previous){if(!same(previous))throw new ConflictException();return {data:this.dto(row,staff,true,hasIdentityPermission(actor,'courses:edit'))};}
   if(row.messages.length>=500)throw new ConflictException();
   // Rate counters stay outside the message transaction so rejected sends are bounded too.
   await this.throttle(actor.id);
   const attachments=ids.length?await this.media.bind(ids,actor,thread,requestKey,session!,staff):[];
   const saved=await this.threads.findOneAndUpdate({...filter,'messages.key':{$ne:requestKey},'messages.499':{$exists:false}},{$push:{messages:{key:requestKey,sender:actor.id,staff,text:message,attachments,at:new Date()}},$set:{updatedAt:new Date(),status:'open'}},{returnDocument:'after',session}).lean();
   if(!saved){const current=await this.threads.findOne(filter).session(session).lean(),duplicate=current?.messages.find(m=>m.key===requestKey);if(duplicate&&same(duplicate))return {data:this.dto(current!,staff,true)};throw new ConflictException();}return {data:this.dto(saved,staff,true,hasIdentityPermission(actor,'courses:edit'))};
  };
  return ids.length?this.db.transaction(session=>work(session)):work(null);
 }
 async chat(actor:AuthIdentity,raw:Record<string,unknown>){
  input(raw,['conversation']);let selected=raw.conversation;if(selected!==undefined){if(typeof selected!=='string')throw new BadRequestException();const reference=await this.threads.findById(id(selected)).select('owner').lean();if(reference&&reference.owner!==actor.id)throw new NotFoundException();if(!reference)selected=undefined;}
  const rows=await this.threads.find({owner:actor.id}).sort({updatedAt:-1,_id:-1}).lean();
  return {data:{conversationId:selected??String(rows[0]?._id??''),messages:rows.flatMap(row=>row.messages.map((m,index)=>({id:`${row._id}:${m.key}`,text:m.text,staff:m.staff,at:m.at,attachments:m.attachments??[],conversationId:String(row._id),sequence:index+1}))).sort((a,b)=>a.at.getTime()-b.at.getTime()||a.conversationId.localeCompare(b.conversationId)||a.sequence-b.sequence),sequences:rows.map(row=>({id:String(row._id),sequence:row.messages.length}))}};
 }
 async chatSend(actor:AuthIdentity,raw:unknown){
  const body=input(raw,['key','text','attachments','conversationId']),requestKey=key(body.key),ids=attachmentIds(body.attachments);if(body.text!==undefined&&typeof body.text!=='string')throw new BadRequestException();if(String(body.text??'').trim())text(body.text,4000);else if(!ids.length)throw new BadRequestException();
  let row=await this.threads.findOne({owner:actor.id,'messages.key':requestKey}).lean();
  if(!row&&body.conversationId){if(typeof body.conversationId!=='string')throw new BadRequestException();const reference=await this.threads.findById(id(body.conversationId)).lean();if(reference&&reference.owner!==actor.id)throw new NotFoundException();row=reference;}
  row??=await this.threads.findOne({owner:actor.id}).sort({updatedAt:-1,_id:-1}).lean();
  if(!row||row.messages.length>=500&&!row.messages.some(m=>m.key===requestKey)){
   const stable=createHash('sha256').update(`${actor.id}:support-chat:${row?._id??'first'}`).digest('hex').slice(0,24);
   row=await this.threads.findOneAndUpdate({_id:stable,owner:actor.id},{$setOnInsert:{owner:actor.id,key:`chat:${stable}`,subject:'Support chat',kind:'general',reference:'',status:'open',messages:[],updatedAt:new Date()}},{upsert:true,returnDocument:'after'}).lean();
  }
  return this.send(actor,false,String(row!._id),{key:requestKey,text:body.text,attachments:ids});
 }
 async read(actor:AuthIdentity,staff:boolean,thread:string,raw:unknown){const b=input(raw,['sequence']);if(!Number.isSafeInteger(b.sequence)||Number(b.sequence)<0)throw new BadRequestException();const filter=this.filter(actor,staff,thread),row=await this.threads.findOne(filter).lean();if(!row)throw new NotFoundException();if(Number(b.sequence)>row.messages.length)throw new BadRequestException();await this.threads.updateOne(filter,{$max:{[staff?'staffRead':'clientRead']:b.sequence}});return {data:{saved:true}};}
 async owners(actor:AuthIdentity){this.access(actor,true,true);const users=await this.db.collection('users').find({enabled:true,mustChangePassword:{$ne:true},role:{$ne:'MEMBER'}},{projection:{name:1,role:1}}).toArray();const data=[];for(const u of users){const resolved=await this.roles.resolve(u.role);if(resolved.permissions.includes('inbox:manage')&&resolved.permissions.includes('admin:access'))data.push({id:String(u._id),name:u.name||resolved.name});}return {data};}
 async update(actor:AuthIdentity,thread:string,raw:unknown){this.access(actor,true,true);const b=input(raw,['status','assignee']);if(!Object.keys(b).length)throw new BadRequestException();if(b.status!==undefined&&!['open','closed'].includes(String(b.status)))throw new BadRequestException();if(b.assignee!==undefined&&(typeof b.assignee!=='string'||b.assignee!==''&&!(await this.owners(actor)).data.some(u=>u.id===b.assignee)))throw new BadRequestException();const result=await this.threads.updateOne(this.filter(actor,true,thread),{$set:b});if(!result.matchedCount)throw new NotFoundException();return {data:{saved:true}};}
}
