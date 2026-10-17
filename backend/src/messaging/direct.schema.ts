import {Schema} from 'mongoose';
import {chatMediaDefinition} from './chat-media.schema';
import type {SupportFile} from './messaging.schema';
export interface DirectConversation {type:'direct';pair:string;members:string[];initiator:string;status:'pending'|'accepted'|'declined';sequence:number;reads:Record<string,number>;blocked:string[];revision:number;updatedAt:Date;}
export interface DirectMessage {conversation:string;key:string;sender:string;recipient:string;text:string;attachments:SupportFile[];sequence:number;at:Date;notificationReadAt?:Date;}
const options={autoCreate:false,autoIndex:false,strict:true};
const conversation=new Schema<DirectConversation>({type:{type:String,enum:['direct'],default:'direct'},pair:{type:String,required:true},members:[String],initiator:String,status:{type:String,enum:['pending','accepted','declined']},sequence:{type:Number,default:0},reads:{type:Schema.Types.Mixed,default:{}},blocked:{type:[String],default:[]},revision:{type:Number,default:0},updatedAt:Date},options);
conversation.index({pair:1},{unique:true});conversation.index({members:1,updatedAt:-1});
const message=new Schema<DirectMessage>({conversation:String,key:String,sender:String,recipient:String,text:String,attachments:[new Schema({id:String,name:String,mimeType:String,size:Number},{_id:false})],sequence:Number,at:Date,notificationReadAt:Date},options);
message.index({conversation:1,sender:1,key:1},{unique:true});message.index({conversation:1,sequence:1},{unique:true});message.index({recipient:1,at:-1});
const report=new Schema({conversation:String,history:[Schema.Types.Mixed],owner:String,key:String,reportedUser:String,reason:String,messages:[new Schema({id:String,sender:String,text:String,at:Date,attachments:[new Schema({name:String,mimeType:String},{_id:false})]},{_id:false})],status:{type:String,default:'open'},createdAt:Date},options);report.index({owner:1,key:1},{unique:true});
export const directDefinitions:import('@nestjs/mongoose').ModelDefinition[]=[{name:'DirectConversation',collection:'direct_conversations',schema:conversation},{name:'DirectMessage',collection:'direct_messages',schema:message},{name:'DirectAttachment',collection:'direct_attachments',schema:chatMediaDefinition.schema.clone()},{name:'DirectReport',collection:'direct_reports',schema:report}];

export interface Friendship {pair:string;members:string[];requester:string;status:'none'|'pending'|'friends';revision:number;generation:number;updatedAt:Date;}
const friendship=new Schema<Friendship>({pair:{type:String,required:true},members:[String],requester:String,status:{type:String,enum:['none','pending','friends'],default:'none'},revision:{type:Number,default:0},generation:{type:Number,default:0},updatedAt:Date},options);friendship.index({pair:1},{unique:true});friendship.index({members:1,status:1,updatedAt:-1});
const friendOperation=new Schema({owner:String,key:String,target:String,action:String,revision:Number,result:Schema.Types.Mixed},options);friendOperation.index({owner:1,key:1},{unique:true});
const friendNotification=new Schema({owner:String,actor:String,friendship:String,generation:Number,kind:String,createdAt:Date,readAt:Date},options);friendNotification.index({owner:1,friendship:1,generation:1,kind:1},{unique:true});friendNotification.index({owner:1,createdAt:-1});
directDefinitions.push({name:'Friendship',collection:'friendships',schema:friendship},{name:'FriendOperation',collection:'friend_operations',schema:friendOperation},{name:'FriendNotification',collection:'friend_notifications',schema:friendNotification});
