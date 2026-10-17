import {Body,Controller,Get,Param,Patch,Post,Query,Req} from '@nestjs/common';
import {Authenticated,RequirePermissions,ValidatedQuery} from '../auth/permissions';
import type {AuthRequest} from '../auth/auth-http';
import {MessagingService} from './messaging.service';
@Controller('account/messages') @Authenticated()
export class ClientMessagesController {
 constructor(private readonly service:MessagingService){}
 @Get() @ValidatedQuery() list(@Req() r:AuthRequest,@Query() q:Record<string,unknown>){return this.service.list(r.auth!.user,false,q);}
 @Post() create(@Req() r:AuthRequest,@Body() b:unknown){return this.service.create(r.auth!.user,b);}
 @Get(':id') detail(@Req() r:AuthRequest,@Param('id') id:string){return this.service.detail(r.auth!.user,false,id);}
 @Post(':id/messages') send(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.send(r.auth!.user,false,id,b);}
 @Post(':id/read') read(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.read(r.auth!.user,false,id,b);}
}
@Controller('admin/inbox') @RequirePermissions('admin:access','inbox:read')
export class AdminInboxController {
 constructor(private readonly service:MessagingService){}
 @Get() @ValidatedQuery() list(@Req() r:AuthRequest,@Query() q:Record<string,unknown>){return this.service.list(r.auth!.user,true,q);}
 @Get('staff') @RequirePermissions('admin:access','inbox:read','inbox:manage') owners(@Req() r:AuthRequest){return this.service.owners(r.auth!.user);}
 @Get(':id') detail(@Req() r:AuthRequest,@Param('id') id:string){return this.service.detail(r.auth!.user,true,id);}
 @Post(':id/messages') @RequirePermissions('admin:access','inbox:read','inbox:manage') send(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.send(r.auth!.user,true,id,b);}
 @Post(':id/read') read(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.read(r.auth!.user,true,id,b);}
 @Patch(':id') @RequirePermissions('admin:access','inbox:read','inbox:manage') update(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.update(r.auth!.user,id,b);}
}

@Controller('account/chat') @Authenticated()
export class ClientChatController {
 constructor(private readonly service:MessagingService){}
 @Get() @ValidatedQuery() history(@Req() r:AuthRequest,@Query() query:Record<string,unknown>){return this.service.chat(r.auth!.user,query);}
 @Post('messages') send(@Req() r:AuthRequest,@Body() body:unknown){return this.service.chatSend(r.auth!.user,body);}
}
