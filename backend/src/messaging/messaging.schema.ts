import {Schema} from 'mongoose';
export interface SupportFile {id:string;name:string;mimeType:string;size:number;}
export interface SupportMessage {key:string;sender:string;staff:boolean;text:string;at:Date;notificationReadAt?:Date;attachments?:SupportFile[];}
export interface Conversation {type?:'support';owner:string;key:string;subject:string;kind:string;reference:string;status:string;assignee:string;messages:SupportMessage[];clientRead:number;staffRead:number;updatedAt:Date;}
const message=new Schema<SupportMessage>({key:String,sender:String,staff:Boolean,text:String,at:Date,notificationReadAt:Date,attachments:{type:[new Schema<SupportFile>({id:String,name:String,mimeType:String,size:Number},{_id:false})],default:undefined}},{_id:false});
const schema=new Schema<Conversation>({type:{type:String,enum:['support'],default:'support'},owner:{type:String,required:true},key:String,subject:String,kind:String,reference:String,status:{type:String,default:'open'},assignee:{type:String,default:''},messages:[message],clientRead:{type:Number,default:0},staffRead:{type:Number,default:0},updatedAt:Date},{autoIndex:false,autoCreate:false,strict:true});
schema.index({owner:1,key:1},{unique:true});schema.index({updatedAt:-1});
export const messagingDefinition={name:'SupportConversation',collection:'support_conversations',schema};
