import {FriendsService} from './friends.service';
import {BadRequestException,Injectable,NotFoundException} from '@nestjs/common';
import {InjectConnection,InjectModel} from '@nestjs/mongoose';
import {Connection,Model,Types} from 'mongoose';
import type {AuthIdentity} from '../auth/auth-http';
import {input} from './messaging.service';
import type {Conversation} from './messaging.schema';

@Injectable()
export class ReplyNotificationsService {
 constructor(private readonly friends:FriendsService,@InjectConnection() private readonly db:Connection,@InjectModel('SupportConversation') private readonly threads:Model<Conversation>){}
 private blogVisible(owner:string){return [{$match:{owner}},{$lookup:{from:'blog_posts',let:{post:'$post'},pipeline:[{$match:{$expr:{$eq:[{$toString:'$_id'},'$$post']},status:'published',deletedAt:null}}],as:'postData'}},{$unwind:'$postData'},{$lookup:{from:'blog_comments',let:{comment:'$comment'},pipeline:[{$match:{$expr:{$eq:[{$toString:'$_id'},'$$comment']},deletedAt:null}}],as:'commentData'}},{$unwind:'$commentData'}];}
 async list(actor:AuthIdentity){
  const through=new Date();
  const [result]=await this.threads.aggregate([
   {$match:{owner:actor.id}},{$unwind:'$messages'},
   {$match:{'messages.staff':true,'messages.sender':{$ne:actor.id}}},
   {$facet:{items:[{$sort:{'messages.at':-1,'messages.key':1}},{$limit:20},{$project:{_id:0,id:{$concat:[{$toString:'$_id'},':','$messages.key']},conversationId:{$toString:'$_id'},subject:1,text:{$substrCP:[{$cond:[{$ne:['$messages.text','']},'$messages.text',{$ifNull:[{$arrayElemAt:['$messages.attachments.name',0]},'Attachment']}]},0,180]},createdAt:'$messages.at',readAt:{$ifNull:['$messages.notificationReadAt',null]}}}],unread:[{$match:{'messages.notificationReadAt':null}},{$count:'count'}]}}
  ]).exec();
  const [blog]=await this.db.collection('blog_notifications').aggregate([...this.blogVisible(actor.id),{$facet:{items:[{$sort:{createdAt:-1}},{$limit:20},{$project:{_id:0,id:{$concat:['blog:',{$toString:'$_id'}]},kind:{$literal:'blog-comment'},href:{$concat:['/blog/','$postData.slug','#comment-','$comment']},subject:'$postData.title',text:'$commentData.text',createdAt:1,readAt:1}}],unread:[{$match:{readAt:null}},{$count:'count'}]}}]).toArray();
  const direct=actor.role==='MEMBER'?await this.db.collection('direct_messages').find({recipient:actor.id}).sort({at:-1}).limit(20).toArray():[];
  const directItems=direct.map(m=>({id:`direct:${m.conversation}:${m.key}`,kind:'direct-message',conversationId:m.conversation,href:`/blog/messages/${m.conversation}`,subject:'Private message',text:m.text||m.attachments?.[0]?.name||'Attachment',createdAt:m.at,readAt:m.notificationReadAt??null}));
  const directUnread=actor.role==='MEMBER'?await this.db.collection('direct_messages').countDocuments({recipient:actor.id,notificationReadAt:null}):0;
  const friend=await this.friends.notifications(actor);
  const moderation=actor.role==='MEMBER'?await this.db.collection('moderation_notifications').find({owner:actor.id}).sort({createdAt:-1}).limit(20).toArray():[];const moderationItems=moderation.map(n=>({id:'moderation:'+String(n._id),kind:'community-moderation',href:'/blog/safety#action-'+n.enforcement,subject:'Community safety',text:n.text,createdAt:n.createdAt,readAt:n.readAt??null}));const moderationUnread=actor.role==='MEMBER'?await this.db.collection('moderation_notifications').countDocuments({owner:actor.id,readAt:null}):0;
  const items=[...moderationItems,...friend.items,...directItems,...(result?.items??[]),...(blog?.items??[])].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,20);
  return {data:{ownerId:actor.id,items,unread:(result?.unread[0]?.count??0)+(blog?.unread[0]?.count??0)+directUnread+friend.unread+moderationUnread,through:through.toISOString()}};
 }
 async read(actor:AuthIdentity,notificationId:string,raw:unknown){
  if(Object.keys(input(raw,[])).length)throw new BadRequestException();
  if(/^moderation:[a-f0-9]{24}$/.test(notificationId)){if(actor.role!=='MEMBER')throw new NotFoundException();const result=await this.db.collection('moderation_notifications').updateOne({_id:new Types.ObjectId(notificationId.slice(11)),owner:actor.id},{$set:{readAt:new Date()}});if(!result.matchedCount)throw new NotFoundException();return {data:{saved:true}};}
  if(notificationId.startsWith('friend:')){await this.friends.readNotification(actor,notificationId);return {data:{saved:true}};}
  const direct=/^direct:([a-f0-9]{24}):([a-f0-9-]{36})$/.exec(notificationId);if(direct){if(actor.role!=='MEMBER')throw new NotFoundException();const result=await this.db.collection('direct_messages').updateOne({conversation:direct[1],key:direct[2],recipient:actor.id},{$set:{notificationReadAt:new Date()}});if(!result.matchedCount)throw new NotFoundException();return {data:{saved:true}};}
  if(/^blog:[a-f0-9]{24}$/.test(notificationId)){const _id=new Types.ObjectId(notificationId.slice(5));const visible=await this.db.collection('blog_notifications').aggregate([...this.blogVisible(actor.id),{$match:{_id}}]).next();if(!visible)throw new NotFoundException();await this.db.collection('blog_notifications').updateOne({_id,owner:actor.id,readAt:null},{$set:{readAt:new Date()}});return {data:{saved:true}};}
  const match=/^([a-f0-9]{24}):([a-f0-9-]{36})$/.exec(notificationId);if(!match)throw new NotFoundException();
  const result=await this.threads.updateOne({_id:match[1],owner:actor.id,messages:{$elemMatch:{key:match[2],staff:true,sender:{$ne:actor.id}}}},{$set:{'messages.$[message].notificationReadAt':new Date()}},{arrayFilters:[{'message.key':match[2],'message.staff':true,'message.sender':{$ne:actor.id},'message.notificationReadAt':null}]});
  if(!result.matchedCount)throw new NotFoundException();return {data:{saved:true}};
 }
 async readAll(actor:AuthIdentity,raw:unknown){
  const body=input(raw,['through']);if(typeof body.through!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(body.through))throw new BadRequestException();
  const through=new Date(body.through);if(!Number.isFinite(through.getTime())||through.getTime()>Date.now())throw new BadRequestException();
  await this.threads.updateMany({owner:actor.id},{$set:{'messages.$[message].notificationReadAt':new Date()}},{arrayFilters:[{'message.staff':true,'message.sender':{$ne:actor.id},'message.at':{$lte:through},'message.notificationReadAt':null}]});
  await this.db.collection('blog_notifications').updateMany({owner:actor.id,createdAt:{$lte:through},readAt:null},{$set:{readAt:new Date()}});
  if(actor.role==='MEMBER')await this.db.collection('moderation_notifications').updateMany({owner:actor.id,createdAt:{$lte:through},readAt:null},{$set:{readAt:new Date()}});
  if(actor.role==='MEMBER')await this.db.collection('friend_notifications').updateMany({owner:actor.id,createdAt:{$lte:through},readAt:null},{$set:{readAt:new Date()}});
  if(actor.role==='MEMBER')await this.db.collection('direct_messages').updateMany({recipient:actor.id,at:{$lte:through},notificationReadAt:null},{$set:{notificationReadAt:new Date()}});
  return {data:{saved:true}};
 }
}
