import {Body,Controller,Get,Param,Post,Req} from '@nestjs/common';
import {Authenticated} from '../auth/permissions';
import type {AuthRequest} from '../auth/auth-http';
import {ReplyNotificationsService} from './reply-notifications.service';
@Controller('account/notifications') @Authenticated()
export class ReplyNotificationsController {
 constructor(private readonly notifications:ReplyNotificationsService){}
 @Get() list(@Req() r:AuthRequest){return this.notifications.list(r.auth!.user);}
 @Post('read-all') readAll(@Req() r:AuthRequest,@Body() body:unknown){return this.notifications.readAll(r.auth!.user,body);}
 @Post(':id/read') read(@Req() r:AuthRequest,@Param('id') id:string,@Body() body:unknown){return this.notifications.read(r.auth!.user,id,body);}
}
