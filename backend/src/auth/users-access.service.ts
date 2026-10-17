import {StaffRolesService} from './staff-roles.service';
import {BadRequestException,ConflictException,ForbiddenException,Injectable,NotFoundException,ServiceUnavailableException,HttpException} from '@nestjs/common';
import {InjectConnection,InjectModel} from '@nestjs/mongoose';
import {Connection,Model,Types} from 'mongoose';
import {normalizeEmail,validEmail,type UserRecord,type SessionRecord,type AuditRecord} from './auth.schemas';
import {isRoleKey,type Role} from './permissions';
import {hashPassword,verifyPassword,validBootstrapPassword} from './password';
import type {AuthIdentity} from './auth-http';
@Injectable()
export class UsersAccessService{
 constructor(@InjectConnection() private readonly db:Connection,@InjectModel('User') private readonly users:Model<UserRecord>,@InjectModel('AuthSession') private readonly sessions:Model<SessionRecord>,@InjectModel('AuthAudit') private readonly audits:Model<AuditRecord>,private readonly staffRoles:StaffRolesService){}
 private consistentAccounts(roleKeys:readonly string[]):Record<string,unknown>{const staff=roleKeys.filter(role=>role!=='MEMBER');return {$and:[{role:{$in:[...roleKeys]}},{enabled:{$type:'bool'}},{$or:[{accountType:{$exists:false}},{role:'MEMBER',accountType:'MEMBER'},{role:{$in:staff},accountType:'STAFF'}]}]};}
 private accountIssue(row:{role?:unknown;enabled?:unknown;accountType?:unknown},roleKeys:readonly string[]){
  if(!roleKeys.includes(String(row.role)))return 'Unsupported or missing role';if(typeof row.enabled!=='boolean')return 'Missing or invalid account status';
  if(row.accountType!==undefined&&row.accountType!==(row.role==='MEMBER'?'MEMBER':'STAFF'))return 'Stored account type conflicts with role';return undefined;
 }
 async list(query:Record<string,unknown>){
  if(Object.keys(query).some(key=>!['q','page','accountType'].includes(key))||query.q!==undefined&&typeof query.q!=='string'||query.accountType!==undefined&&!['STAFF','MEMBER'].includes(String(query.accountType)))throw new BadRequestException();
  const q=String(query.q??'').trim();if(q.length>120)throw new BadRequestException();const page=Number(query.page??1);if(!Number.isSafeInteger(page)||page<1||page>10000)throw new BadRequestException();
  const available=await this.staffRoles.available(),roleKeys=['MEMBER',...available.map(value=>value.role)];
  const literal=q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),consistent=this.consistentAccounts(roleKeys),staff=roleKeys.filter(role=>role!=='MEMBER');
  const filter={$and:[consistent,...(query.accountType?[{role:query.accountType==='MEMBER'?'MEMBER':{$in:staff}}]:[]),...(q?[{$or:[{email:{$regex:literal,$options:'i'}},{name:{$regex:literal,$options:'i'}}]}]:[])]};
  const collection=this.db.collection<UserRecord&{accountType?:unknown}>('users');
  const [rows,total,staffCount,memberCount,inconsistentCount,inconsistent]=await Promise.all([
   collection.find(filter,{projection:{name:1,email:1,role:1,enabled:1,accessVersion:1}}).sort({email:1,_id:1}).skip((page-1)*25).limit(25).toArray(),collection.countDocuments(filter),
   collection.countDocuments({$and:[consistent,{role:{$in:staff}}]}),collection.countDocuments({$and:[consistent,{role:'MEMBER'}]}),collection.countDocuments({$nor:[consistent]}),
   collection.find({$nor:[consistent]},{projection:{email:1,role:1,enabled:1,accountType:1}}).sort({_id:1}).limit(10).toArray()
  ]);
  return {data:rows.map(row=>({id:String(row._id),name:row.name,email:row.email,accountType:row.role==='MEMBER'?'MEMBER':'STAFF',role:row.role,enabled:row.enabled,revision:row.accessVersion??0,permissions:available.find(value=>value.role===row.role)?.permissions??[]})),roles:available,counts:{staff:staffCount,members:memberCount,inconsistent:inconsistentCount},inconsistencies:inconsistent.map(row=>({id:String(row._id),email:row.email,reason:this.accountIssue(row,roleKeys)})),pagination:{page,total,totalPages:Math.max(1,Math.ceil(total/25))}};
 }
 async createStaff(raw:unknown,actor:AuthIdentity){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new BadRequestException();const input=raw as Record<string,unknown>;
  if(Object.keys(input).length!==5||Object.keys(input).some(key=>!['name','email','role','password','passwordConfirmation'].includes(key))||typeof input.name!=='string'||typeof input.email!=='string'||!validBootstrapPassword(input.password)||input.password!==input.passwordConfirmation||!isRoleKey(input.role)||input.role==='MEMBER')throw new BadRequestException();
  const name=input.name.trim(),email=normalizeEmail(input.email),role=input.role as Role;if(!name||name.length>120||/[\x00-\x1f\x7f]/.test(name)||!validEmail(email))throw new BadRequestException();
  const passwordHash=await hashPassword(input.password),session=await this.db.startSession();
  try{return await session.withTransaction(async()=>{
   await this.staffRoles.lockAdmin(actor,session);await this.staffRoles.assign(role,session);
   const [user]=await this.users.create([{name,email,passwordHash,role,enabled:true,mustChangePassword:true}],{session});
   await this.audits.create([{event:'staff_create',outcome:'success',userId:new Types.ObjectId(actor.id),targetUserId:user._id,nextRole:role,nextEnabled:true}],{session});
   return {created:true,id:String(user._id),role,enabled:true,passwordChangeRequired:true};
  });}catch(error){if((error as {code?:number})?.code===11000)throw new ConflictException();if(error instanceof HttpException)throw error;throw new ServiceUnavailableException();}finally{await session.endSession();}
 }
 async update(id:string,raw:unknown,actor:AuthIdentity){
  if(!/^[a-f0-9]{24}$/.test(id)||!raw||typeof raw!=='object'||Array.isArray(raw))throw new BadRequestException();const input=raw as Record<string,unknown>;
  if(Object.keys(input).length!==3||Object.keys(input).some(key=>!['role','enabled','revision'].includes(key))||!isRoleKey(input.role)||typeof input.enabled!=='boolean'||!Number.isSafeInteger(input.revision)||Number(input.revision)<0)throw new BadRequestException();
  const enabled=input.enabled;
  if(id===actor.id)throw new ForbiddenException();
  const session=await this.db.startSession();try{return await session.withTransaction(async()=>{
   await this.staffRoles.lockAdmin(actor,session);
   const target=await this.users.findById(id).select('name email role enabled accountType accessVersion mustChangePassword').session(session).lean();if(!target)throw new NotFoundException();if((target.accessVersion??0)!==input.revision)throw new ConflictException();
   const available=await this.staffRoles.resolve(target.role,session);if(!available.known||this.accountIssue(target,[target.role]))throw new ConflictException();
   const nextRole=input.role as Role;if((target.role==='MEMBER')!==(nextRole==='MEMBER'))throw new ForbiddenException();
   if(nextRole!=='MEMBER')await this.staffRoles.assign(nextRole,session);
   if(target.role==='SUPER_ADMIN'&&target.enabled&&(nextRole!=='SUPER_ADMIN'||!input.enabled)&&await this.users.countDocuments({role:'SUPER_ADMIN',enabled:true}).session(session)<=1)throw new ConflictException();
   if(target.role===nextRole&&target.enabled===input.enabled)return {saved:true,revision:target.accessVersion??0};
   await this.users.updateOne({_id:target._id},{$set:{role:nextRole,enabled:input.enabled},$inc:{accessVersion:1}},{session});
   await this.sessions.updateMany({userId:target._id,revokedAt:null},{$set:{revokedAt:new Date()}},{session});
   await this.audits.create([{event:'access_change',outcome:'success',userId:new Types.ObjectId(actor.id),targetUserId:target._id,previousRole:target.role,nextRole,previousEnabled:target.enabled,nextEnabled:enabled}],{session});
   return {saved:true,revision:(target.accessVersion??0)+1};
  });}catch(error){if(error instanceof HttpException)throw error;throw new ServiceUnavailableException();}finally{await session.endSession();}
 }
 async changePassword(raw:unknown,user:AuthIdentity){
  if(user.role==='MEMBER')throw new ForbiddenException();if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new BadRequestException();const input=raw as Record<string,unknown>;
  if(Object.keys(input).length!==3||Object.keys(input).some(key=>!['currentPassword','password','passwordConfirmation'].includes(key))||typeof input.currentPassword!=='string'||input.currentPassword.length>128||!validBootstrapPassword(input.password)||input.password!==input.passwordConfirmation||input.currentPassword===input.password)throw new BadRequestException();
  const current=await this.users.findById(user.id).select('+passwordHash').lean();if(!current||!await verifyPassword(current.passwordHash,input.currentPassword))throw new ForbiddenException();const passwordHash=await hashPassword(input.password);
  const session=await this.db.startSession();try{return await session.withTransaction(async()=>{const saved=await this.users.updateOne({_id:user.id,enabled:true,role:{$ne:'MEMBER'},passwordHash:current.passwordHash},{$set:{passwordHash,mustChangePassword:false}},{session});if(saved.modifiedCount!==1)throw new ConflictException();await this.sessions.updateMany({userId:new Types.ObjectId(user.id),revokedAt:null},{$set:{revokedAt:new Date()}},{session});await this.audits.create([{event:'password_change',outcome:'success',userId:new Types.ObjectId(user.id)}],{session});return {changed:true,loginRequired:true};});}catch(error){if(error instanceof HttpException)throw error;throw new ServiceUnavailableException();}finally{await session.endSession();}
 }
}
