import {normalizeStaffPermissions} from '../auth/staff-role-policy';
import {Controller,Get,Header,Module,Req,UseFilters,Injectable,ForbiddenException,ServiceUnavailableException} from '@nestjs/common';
import {InjectConnection} from '@nestjs/mongoose';
import {Connection} from 'mongoose';
import {hasIdentityPermission,RequireAnyPermissions,resources,roles,isRoleKey,isBuiltinRole} from '../auth/permissions';
import type {AuthIdentity,AuthRequest} from '../auth/auth-http';
import {AuthExceptionFilter} from '../auth/auth-exception.filter';
import {contentDefinitions} from '../content/content.schemas';
type Card={id:string;label:string;count:number;href:string};
type Activity={id:string;action:string;record:string;at:string;href:string};
@Injectable()
export class DashboardService {
 constructor(@InjectConnection() private readonly db:Connection){}
 async read(actor:AuthIdentity){
  const can=(permission:string)=>hasIdentityPermission(actor,permission);
  if(actor.role==='MEMBER'||!['admin:access',...resources.map(resource=>`${resource}:read`)].some(can))throw new ForbiddenException();
  const now=new Date(),cards:Card[]=[],activity:Activity[]=[],attention:{id:string;label:string;href:string}[]=[],actions:{label:string;href:string}[]=[];
  const collection=(name:string)=>this.db.collection(name);
  const count=async(id:string,label:string,name:string,filter:Record<string,unknown>,href:string)=>{cards.push({id,label,count:await collection(name).countDocuments(filter,{maxTimeMS:3000}),href});};
  const published={status:'published',publishedAt:{$lte:now}};
  try {
   // Plan only authorized reads; restricted staff never query unrelated collections.
   const tasks:Promise<unknown>[]=[];
   if(can('courses:read'))tasks.push(count('courses-published','Published courses','courses',published,'/admin/courses'),count('courses-draft','Course drafts','courses',{status:'draft'},'/admin/courses'));
   for(const resource of ['projects','research','publications'] as const)if(can(`${resource}:read`))tasks.push(count(resource,`Published ${resource}`,contentDefinitions[resource].collection,published,`/admin/${resource}`));
   if(can('courses:edit')){
    tasks.push(count('enrollments','Active enrollments','academy_enrollments',{active:true},'/admin/academy/enrollments'),count('orders','Confirmed scholarship orders','academy_orders',{status:'scholarship'},'/admin/academy/orders'),count('scholarships','Active scholarship codes','academy_scholarships',{active:true,startsAt:{$lte:now},$or:[{expiresAt:{$gt:now}},{expiresAt:{$exists:false}},{expiresAt:null}],$expr:{$lt:['$redeemed','$totalLimit']}},'/admin/academy/scholarships'));
    actions.push({label:'Add course',href:'/admin/academy/courses/new'},{label:'Generate scholarship',href:'/admin/academy/scholarships'});
    tasks.push((async()=>{const orders=await collection('academy_orders').find({createdAt:{$type:'date'}},{projection:{status:1,createdAt:1}}).sort({createdAt:-1,_id:-1}).limit(8).maxTimeMS(3000).toArray();for(const row of orders){const labels:Record<string,string>={scholarship:'Scholarship order confirmed',pending:'Order pending — balance outstanding',free:'Free order confirmed',paid:'Order confirmed',failed:'Order failed',blocked:'Order blocked',cancelled:'Order cancelled',expired:'Order expired',payment_review:'Order requires review'};activity.push({id:`order:${row._id}`,action:labels[String(row.status)]??'Order recorded',record:`Order …${String(row._id).slice(-8)}`,at:row.createdAt.toISOString(),href:`/api/v1/academy/admin/orders/${row._id}/memo.pdf`});}
     const redemptions=await collection('academy_redemptions').find({createdAt:{$type:'date'}},{projection:{createdAt:1}}).sort({createdAt:-1,_id:-1}).limit(8).maxTimeMS(3000).toArray();for(const row of redemptions)activity.push({id:`redemption:${row._id}`,action:'Scholarship redeemed',record:`Redemption …${String(row._id).slice(-8)}`,at:row.createdAt.toISOString(),href:'/admin/academy/scholarships'});
    })());
   }
   if(can('leads:read')){tasks.push(count('inquiries','New inquiries','leads',{status:'received'},'/admin/leads'));}
   if(actor.role==='SUPER_ADMIN'){
    // Use the existing account consistency rules, including validated custom roles.
    tasks.push((async()=>{const custom=await collection('auth_staff_roles').find({},{projection:{key:1,permissions:1,revision:1}}).toArray();const staff:string[]=roles.filter(role=>role!=='MEMBER');for(const role of custom)try{if(isRoleKey(role.key)&&!isBuiltinRole(role.key)&&Number.isSafeInteger(role.revision)&&role.revision>0){normalizeStaffPermissions(role.permissions);staff.push(role.key);}}catch{/* Invalid role definitions do not classify staff. */}
      await Promise.all([count('staff','Staff accounts','users',{role:{$in:staff},enabled:{$type:'bool'},$or:[{accountType:{$exists:false}},{accountType:'STAFF'}]},'/admin/users'),count('members','Normal users','users',{role:'MEMBER',enabled:{$type:'bool'},$or:[{accountType:{$exists:false}},{accountType:'MEMBER'}]},'/admin/users')]);})());
   }
   for(const [resource,label] of [['projects','Add project'],['research','Add research'],['publications','Add publication']] as const)if(can(`${resource}:edit`))actions.push({label,href:`/admin/${resource}/new`});
   if(can('leads:read'))actions.push({label:'Review inquiries',href:'/admin/leads'});
   const readable=resources.filter(resource=>can(`${resource}:read`));
   if(readable.length)tasks.push((async()=>{const failed=await collection('media').find({resource:{$in:readable},status:'failed'},{projection:{resource:1}}).sort({_id:-1}).limit(5).maxTimeMS(3000).toArray();for(const row of failed)attention.push({id:String(row._id),label:`Failed media upload · ${row.resource}`,href:'/admin/media'});})());
   if(readable.length)tasks.push((async()=>{const events=await collection('content_audits').find({resource:{$in:readable},action:{$in:['create','edit','publish','unpublish','archive']},createdAt:{$type:'date'}},{projection:{resource:1,action:1,contentId:1,createdAt:1}}).sort({createdAt:-1,_id:-1}).limit(12).maxTimeMS(3000).toArray();for(const event of events){const resource=event.resource as typeof readable[number],record=await collection(contentDefinitions[resource].collection).findOne({_id:event.contentId},{projection:{title:1,name:1}});if(!record)continue;const labels:Record<string,string>={create:'Draft created',edit:'Content edited',publish:'Content published',unpublish:'Content unpublished',archive:'Content archived'};activity.push({id:`content:${event._id}`,action:labels[event.action],record:String(record.title??record.name??resource),at:event.createdAt.toISOString(),href:resource==='courses'&&can('courses:edit')?`/admin/academy/courses/${event.contentId}`:`/admin/${resource}/${event.contentId}`});}})());
   await Promise.all(tasks);
   const order=['courses-published','courses-draft','enrollments','orders','scholarships','inquiries','projects','research','publications','staff','members'];
   return {attention,cards:cards.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id)),actions,activity:activity.sort((a,b)=>b.at.localeCompare(a.at)||a.id.localeCompare(b.id)).slice(0,12),checkedAt:now.toISOString()};
  }catch{throw new ServiceUnavailableException();}
 }
}
@Controller('admin/dashboard') @UseFilters(AuthExceptionFilter)
export class DashboardController {
 constructor(private readonly dashboard:DashboardService){}
 @Get() @RequireAnyPermissions('admin:access',...resources.map(resource=>`${resource}:read`)) @Header('Cache-Control','private, no-store') async read(@Req() req:AuthRequest){return {data:await this.dashboard.read(req.auth!.user)};}
}
@Module({controllers:[DashboardController],providers:[DashboardService]})
export class DashboardModule{}
