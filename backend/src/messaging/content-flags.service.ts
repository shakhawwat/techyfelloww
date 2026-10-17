import {Injectable} from '@nestjs/common';
import {InjectConnection} from '@nestjs/mongoose';
import {Connection,Types,type ClientSession} from 'mongoose';
import {createHash} from 'node:crypto';
@Injectable()
export class ContentFlags {
 constructor(@InjectConnection() private readonly db:Connection){}
 rules(){let terms:string[]=[];try{const raw=JSON.parse(process.env.COMMUNITY_FLAG_TERMS??'[]');if(Array.isArray(raw)&&raw.length<=50&&raw.every(x=>typeof x==='string'&&x.length>0&&x.length<=256))terms=raw;}catch{}const limit=Number(process.env.COMMUNITY_MAX_LINKS??8);return {terms,maxLinks:Number.isInteger(limit)&&limit>=1&&limit<=50?limit:8};}
 async message(conversation:string,message:string,sender:string,text:string,files:{id:string}[],session:ClientSession){const rules=this.rules(),flags:string[]=[],normalized=text.toLowerCase().replace(/\s+/g,' ').trim();if((text.match(/https?:\/\//g)?.length??0)>rules.maxLinks)flags.push('link-volume');if(rules.terms.some(term=>normalized.includes(term.toLowerCase())))flags.push('configured-term');if(normalized&&await this.db.collection('direct_messages').countDocuments({sender,text,at:{$gte:new Date(Date.now()-60000)}},{session})>=3)flags.push('repeated-content');for(const rule of flags)await this.db.collection('community_flags').updateOne({conversation,message,file:'',rule},{$setOnInsert:{status:'open',createdAt:new Date(),evidenceHash:createHash('sha256').update(text).digest('hex'),history:[]}},{upsert:true,session});for(const file of files){const stored=await this.db.collection('direct_attachments').findOne({_id:new Types.ObjectId(file.id)},{session,projection:{scanState:1,hash:1}});if(stored?.scanState!=='clean')await this.db.collection('community_flags').updateOne({conversation,message,file:file.id,rule:'attachment-scan'},{$setOnInsert:{status:'open',createdAt:new Date(),evidenceHash:stored?.hash??'',history:[]}},{upsert:true,session});}}
}
