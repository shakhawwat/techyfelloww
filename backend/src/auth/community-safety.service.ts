import {ForbiddenException,Injectable} from '@nestjs/common';
import {InjectConnection} from '@nestjs/mongoose';
import {Connection,type ClientSession} from 'mongoose';
@Injectable()
export class CommunitySafety {
 constructor(@InjectConnection() private readonly db:Connection){}
 async check(user:string,messaging=false,session?:ClientSession){if(await this.db.collection('community_enforcements').findOne({target:user,active:true,kind:{$in:messaging?['suspend','restrict']:['suspend']}},{session}))throw new ForbiddenException('Community activity is restricted. View Safety notices to appeal.');}
}
