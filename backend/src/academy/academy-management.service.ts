import {validateDocument} from '../media/document-validation';
import {realpath,writeFile,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import type {UploadFile} from '../media/media.service';
import {BadRequestException,Injectable,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import {InjectConnection} from '@nestjs/mongoose';
import {ConfigService} from '@nestjs/config';
import {Connection,Types} from 'mongoose';
import {AdminContentService} from '../admin-content/admin-content.service';
import {AcademyService} from './academy.service';
import {object,text} from './academy-input';
import type {AuthIdentity} from '../auth/auth-http';
import type {LearningCourse} from './academy.schemas';
@Injectable()
export class AcademyManagementService {
 constructor(@InjectConnection() private readonly db:Connection,private readonly academy:AcademyService,private readonly content:AdminContentService,private readonly config:ConfigService){}
 async uploadResource(file:UploadFile|undefined,actor:AuthIdentity){
  if(!file)throw new BadRequestException({fields:['file']});
  const document=validateDocument(file.buffer,file.originalname,this.config.getOrThrow<number>('MEDIA_MAX_BYTES'));
  const root=this.config.get<string>('ACADEMY_MEDIA_ROOT');if(!root)throw new ServiceUnavailableException();
  let path:string|undefined,stored=false;try{const directory=await realpath(root),key=`resource-${randomBytes(16).toString('hex')}.${document.extension}`;path=resolve(directory,key);await writeFile(path,document.data,{flag:'wx',mode:0o600});stored=true;await this.collection('academy_audits').insertOne({actor:actor.id,action:'private_resource_upload',target:key,createdAt:new Date()},{writeConcern:{w:'majority'}});return {key,filename:document.filename};}catch{if(path&&stored)try{await unlink(path);}catch{ /* Keep the generic storage error. */ }throw new ServiceUnavailableException();}
 }
 private collection(name:string){return this.db.db!.collection(name);}
 async dashboard(){
  const counts=await Promise.all(['courses','academy_enrollments','academy_orders','academy_scholarships','academy_redemptions'].map(name=>this.collection(name).countDocuments()));
  const group=async(name:string,field:string)=>this.collection(name).aggregate([{$group:{_id:`$${field}`,count:{$sum:1}}}]).toArray();
  return {courses:counts[0],enrollments:counts[1],orders:counts[2],scholarships:counts[3],redemptions:counts[4],activeEnrollments:await this.collection('academy_enrollments').countDocuments({active:true}),courseStates:await group('courses','status'),orderStates:await group('academy_orders','status'),paymentAvailable:false,privateVideoUploadAvailable:false,privateDeliveryConfigured:!!this.config.get('ACADEMY_MEDIA_ROOT')};
 }
 async courses(query:Record<string,unknown>,actor:AuthIdentity){return this.content.list('courses',query,actor);}
 async course(id:string,actor:AuthIdentity){const result=await this.content.detail('courses',id,actor);const config=await this.academy.adminConfig(String(result.data.slug));return {course:result.data,config,readiness:await this.academy.contentReadiness(config as LearningCourse|null)};}
 async publish(id:string,body:unknown,actor:AuthIdentity){return this.content.mutate('courses',id,'publish',body,actor,async(course,session)=>{
  const config=await this.collection('academy_learning_courses').findOne({slug:course.slug},{session}) as unknown as LearningCourse|null;
  if(!config?.enabled||!config.category?.trim()||!config.description?.trim()||!config.outcomes.length||!config.modules.length||!config.modules.every(module=>module.lessons.length&&module.lessons.every(lesson=>lesson.description?.trim())))throw new BadRequestException();
  const intro=config.modules[0]?.lessons[0];if(!intro||intro.access!=='public')throw new BadRequestException();
  if(config.purchaseEnabled&&!(await this.academy.contentReadiness(config)).eligible)throw new BadRequestException();
  // A concurrent configuration edit conflicts with this write inside the content publication transaction.
  const changed=await this.collection('academy_learning_courses').updateOne({slug:course.slug,revision:config.revision},{$inc:{revision:1}},{session});if(changed.modifiedCount!==1)throw new ServiceUnavailableException();
 });}
 async records(kind:string,raw:Record<string,unknown>){
  if(!['orders','enrollments','scholarships','redemptions','audits'].includes(kind))throw new NotFoundException();
  const input=object(raw,['q','state','course','page','recipient']),q=typeof input.q==='string'?input.q.trim():'',state=typeof input.state==='string'?input.state:'',recipient=typeof input.recipient==='string'?input.recipient.trim().toLowerCase():'';
  if(q.length>160||recipient.length>254)throw new BadRequestException();
  const page=Number(input.page??1);if(!Number.isSafeInteger(page)||page<1||page>100000)throw new BadRequestException();
  const filter:Record<string,unknown>={};const escape=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  if(input.course){const course=text(input.course,160);filter[kind==='scholarships'?'courses':'courseSlug']=course;}
  if(state){
   if(kind==='scholarships'){const now=new Date();if(state==='active')Object.assign(filter,{active:true,startsAt:{$lte:now},$or:[{expiresAt:{$gt:now}},{expiresAt:{$exists:false}},{expiresAt:null}],$expr:{$lt:['$redeemed','$totalLimit']}});else if(state==='revoked')filter.active=false;else if(state==='expired')filter.expiresAt={$lte:now};else if(state==='redeemed')filter.redeemed={$gt:0};else throw new BadRequestException();}
   else if(kind==='enrollments'){if(!['active','revoked'].includes(state))throw new BadRequestException();filter.active=state==='active';}
   else if(kind==='orders'){if(!['blocked','pending','paid','free','scholarship','failed','cancelled','expired','payment_review'].includes(state))throw new BadRequestException();filter.status=state;}else throw new BadRequestException();
  }
  const learners=q||recipient?await this.collection('users').find({email:{$regex:escape(recipient||q),$options:'i'}},{projection:{_id:1}}).limit(1000).toArray():[];
  if(recipient){if(kind==='scholarships')filter.recipientEmail=recipient;else filter.userId={$in:learners.map(user=>String(user._id))};}
  if(q){const fields=kind==='scholarships'?['label','recipientEmail']:kind==='audits'?['action','target','reason']:['courseSlug','courseTitle',...(kind==='redemptions'?['codeId']:[])];const clauses:Record<string,unknown>[]=fields.map(field=>({[field]:{$regex:escape(q),$options:'i'}}));if(/^[a-f0-9]{24}$/.test(q))clauses.push({_id:new Types.ObjectId(q)});if(learners.length&&kind!=='scholarships'&&kind!=='audits')clauses.push({userId:{$in:learners.map(user=>String(user._id))}});if(filter.$or){filter.$and=[{$or:filter.$or},{$or:clauses}];delete filter.$or;}else filter.$or=clauses;}
  const name=({orders:'academy_orders',enrollments:'academy_enrollments',scholarships:'academy_scholarships',redemptions:'academy_redemptions',audits:'academy_audits'} as Record<string,string>)[kind];
  // Explicit projection keeps hashes, payment references, request hashes and nonce keys private.
  const fields=kind==='orders'?['userId','courseSlug','courseTitle','status','subtotalMinor','discountMinor','finalMinor','createdAt','items']:kind==='enrollments'?['userId','courseSlug','source','active','createdAt']:kind==='scholarships'?['label','courses','anyCourse','kind','amount','amountMinor','startsAt','expiresAt','totalLimit','perAccountLimit','recipientEmail','active','redeemed','revision']:kind==='redemptions'?['codeId','userId','courseSlug','discountMinor','createdAt']:['actor','action','target','reason','createdAt'];
  const projection=Object.fromEntries(fields.map(field=>[field,1]));
  const [rows,total]=await Promise.all([this.collection(name).find(filter,{projection}).sort({_id:-1}).skip((page-1)*20).limit(20).toArray(),this.collection(name).countDocuments(filter)]);
  const data=await Promise.all(rows.map(async row=>{const userId=String(row.userId??row.actor??'');const learner=/^[a-f0-9]{24}$/.test(userId)?await this.collection('users').findOne({_id:new Types.ObjectId(userId)},{projection:{email:1,name:1}}):null;const course=row.courseSlug?await this.collection('courses').findOne({slug:row.courseSlug},{projection:{title:1}}):null;
   const items=Array.isArray(row.items)?row.items.map(item=>({courseSlug:item.courseSlug,courseTitle:item.courseTitle,finalMinor:item.finalMinor})):undefined;
   let orderReference:string|undefined;if(kind==='redemptions'){const order=await this.collection('academy_orders').findOne({userId:row.userId,$or:[{courseSlug:row.courseSlug,codeId:row.codeId},{items:{$elemMatch:{courseSlug:row.courseSlug,codeId:row.codeId}}}]},{projection:{_id:1}});orderReference=order?String(order._id):undefined;}
   let selectedCourses:string[]|undefined;if(kind==='scholarships'){const redeemed=await this.collection('academy_redemptions').distinct('courseSlug',{codeId:String(row._id)});selectedCourses=redeemed as string[];}
   return {...row,...(kind==='scholarships'?{state:!row.active?'Revoked':row.redeemed?'Used':row.expiresAt&&+row.expiresAt<=Date.now()?'Expired':'Active'}:{}),selectedCourses,_id:String(row._id),...(items?{items}:{}),learner:learner?{id:String(learner._id),email:learner.email,name:learner.name}:undefined,courseTitle:course?.title??row.courseTitle,orderReference};}));
  return {data,pagination:{page,total,totalPages:Math.ceil(total/20)}};
 }
}
