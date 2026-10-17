import {BadRequestException,ForbiddenException,HttpException,Injectable,ServiceUnavailableException,UnauthorizedException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {InjectConnection,InjectModel} from '@nestjs/mongoose';
import {randomBytes} from 'node:crypto';
import {Connection,Model} from 'mongoose';
import {AuthService} from '../auth/auth.service';
import {normalizeEmail,validEmail,type UserRecord} from '../auth/auth.schemas';
import {hashPassword,validMemberPassword} from '../auth/password';
import {hashToken} from '../auth/auth-http';
import {encryptVerificationToken,verificationConfiguration} from './verification-config';
import type {VerificationRecord,VerificationJobRecord} from './account.schemas';
export function parseRegistration(body:unknown){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new BadRequestException();
 const value=body as Record<string,unknown>,keys=Object.keys(value);
 if(keys.length!==4||keys.some(key=>!['name','email','password','passwordConfirmation'].includes(key))||typeof value.name!=='string'||typeof value.email!=='string'||!validMemberPassword(value.password)||value.passwordConfirmation!==value.password)throw new BadRequestException();
 const name=value.name.trim(),email=normalizeEmail(value.email);
 if(!name||name.length>120||/[\x00-\x1f\x7f]/.test(name)||!validEmail(email))throw new BadRequestException();
 return {name,email,password:value.password};
}
export function accountDto(user:UserRecord&{_id:unknown}){return {id:String(user._id),...(user.name?{name:user.name}:{}),email:user.email,role:user.role,emailVerified:!!user.emailVerifiedAt};}
@Injectable()
export class AccountService{
 constructor(@InjectConnection() private readonly connection:Connection,private readonly auth:AuthService,private readonly config:ConfigService,@InjectModel('User') private readonly users:Model<UserRecord>,@InjectModel('AccountVerification') private readonly verifications:Model<VerificationRecord>,@InjectModel('AccountVerificationJob') private readonly jobs:Model<VerificationJobRecord>){}
 async register(body:unknown,ip:string){
 const candidate=body&&typeof body==='object'&&!Array.isArray(body)?(body as Record<string,unknown>).email:undefined;
 await this.auth.throttle(ip,typeof candidate==='string'?normalizeEmail(candidate.slice(0,1024)):'','register');
 let input:ReturnType<typeof parseRegistration>;
 try{input=parseRegistration(body);}catch(error){await this.auth.audit('register','invalid_request');throw error;}
 try{
 const passwordHash=await hashPassword(input.password),mail=verificationConfiguration(Object.fromEntries(['ACCOUNT_VERIFICATION_KEY','EMAIL_FROM','RESEND_API_KEY','EMAIL_ENABLED'].map(key=>[key,this.config.get(key)])));
 // ConfigService reads the same validated process environment; verification secrets stay server-side.
 const session=await this.connection.startSession();
 try{return await session.withTransaction(async()=>{
 const [user]=await this.users.create([{name:input.name,email:input.email,passwordHash,role:'MEMBER',enabled:true}],{session});
 if(mail.canQueue){const token=randomBytes(32).toString('base64url'),expiresAt=new Date(Date.now()+3600000);
 const [verification]=await this.verifications.create([{userId:user._id,tokenHash:hashToken(token),expiresAt}],{session});
 await this.jobs.create([{verificationId:verification._id,encryptedToken:encryptVerificationToken(token,mail.key),status:'pending',attempts:0,nextAttemptAt:new Date(),expiresAt}],{session});}
 // Transactional success audit must not leave an orphan user on failure.
 await this.connection.collection('auth_audits').insertOne({event:'register',outcome:'success',userId:user._id,createdAt:new Date()},{session});
 return {user:accountDto(user),verification:{status:mail.canQueue?'pending':'unavailable'}};
 },{readPreference:'primary',readConcern:{level:'snapshot'},writeConcern:{w:'majority'},maxCommitTimeMS:1500,timeoutMS:10000});}finally{await session.endSession();}
 }catch(error){if(error instanceof Error&&'code' in error&&error.code===11000){await this.auth.audit('register','invalid_request');throw new BadRequestException();}if(error instanceof HttpException)throw error;throw new ServiceUnavailableException();}
 }
 async me(userId:string){try{const user=await this.users.findOne({_id:userId,enabled:true}).maxTimeMS(1500).lean();if(!user)throw new UnauthorizedException();const profile=await this.connection.collection('member_profiles').findOne({owner:userId},{projection:{photo:1}});return {...accountDto(user),photoUrl:profile?.photo?`/api/v1/community/images/${profile.photo}`:''};}catch(error){if(error instanceof HttpException)throw error;throw new ServiceUnavailableException();}}
 /** Future sensitive MEMBER transactions must call this inside their authorization path. */
 async requireVerifiedMember(userId:string){const user=await this.me(userId);if(user.role!=='MEMBER'||!user.emailVerified)throw new ForbiddenException();return user;}
 async verifyEmail(body:unknown,ip:string){
 const candidate=body&&typeof body==='object'&&!Array.isArray(body)&&'token'in body&&typeof body.token==='string'?body.token.slice(0,128):'';
 await this.auth.throttle(ip,`verification:${hashToken(candidate)}`,'verify_email');
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==1||!('token'in body)||typeof body.token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(body.token))throw new BadRequestException();
 const tokenHash=hashToken(body.token);
 try{const session=await this.connection.startSession();try{return await session.withTransaction(async()=>{
 const verification=await this.verifications.findOneAndUpdate({tokenHash,consumedAt:null,expiresAt:{$gt:new Date()}},{$set:{consumedAt:new Date()}},{new:true,session}).maxTimeMS(1500).lean();if(!verification)throw new BadRequestException();
 const updated=await this.users.updateOne({_id:verification.userId,enabled:true,role:'MEMBER',emailVerifiedAt:null},{$set:{emailVerifiedAt:new Date()}},{session}).maxTimeMS(1500);if(updated.modifiedCount!==1)throw new BadRequestException();
 await this.jobs.updateOne({verificationId:verification._id},{$unset:{encryptedToken:1}},{session}).maxTimeMS(1500);
 await this.connection.collection('auth_audits').insertOne({event:'verify_email',outcome:'success',userId:verification.userId,createdAt:new Date()},{session});return {emailVerified:true};
 },{readPreference:'primary',readConcern:{level:'snapshot'},writeConcern:{w:'majority'},maxCommitTimeMS:1500,timeoutMS:5000});}finally{await session.endSession();}}
 catch(error){if(error instanceof HttpException)throw error;throw new ServiceUnavailableException();}
 }
}
