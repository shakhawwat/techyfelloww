import {Body,Controller,Get,Param,Post,Query,Req,Res} from '@nestjs/common';
import type {Response} from 'express';
import {Authenticated,RequirePermissions,ValidatedQuery} from '../auth/permissions';
import type {AuthRequest} from '../auth/auth-http';
import {ModerationService} from './moderation.service';
import {sendPrivateMedia} from './private-media-response';
@Controller('admin/community-moderation') @RequirePermissions('admin:access','direct-reports:review')
export class ModerationController {
 constructor(private readonly service:ModerationService){}
 @Get() @ValidatedQuery() list(@Req() r:AuthRequest,@Query() q:Record<string,unknown>){return this.service.list(r,q);}
 @Get('lookup') @RequirePermissions('admin:access','community:conversations') @ValidatedQuery() lookup(@Req() r:AuthRequest,@Query() q:Record<string,unknown>){return this.service.lookup(r,q);}
 @Post('reviews') @RequirePermissions('admin:access','community:conversations') open(@Req() r:AuthRequest,@Body() b:unknown){return this.service.open(r,b);}
 @Get('reviews/:id') @RequirePermissions('admin:access','community:conversations') @ValidatedQuery() history(@Req() r:AuthRequest,@Param('id') id:string,@Query() q:Record<string,unknown>){return this.service.history(r,id,q);}
 @Get('reviews/:id/files/:file/status') @RequirePermissions('admin:access','community:conversations','community:attachments') status(@Req() r:AuthRequest,@Param('id') id:string,@Param('file') file:string){return this.service.scanStatus(r,id,file);}
 @Post('reviews/:id/files/:file/retry') @RequirePermissions('admin:access','community:conversations','community:attachments','community:actions') retry(@Req() r:AuthRequest,@Param('id') id:string,@Param('file') file:string,@Body() b:unknown){return this.service.retryScan(r,id,file,b);}
 @Get('reviews/:id/files/:file') @RequirePermissions('admin:access','community:conversations','community:attachments') async media(@Req() r:AuthRequest,@Param('id') id:string,@Param('file') file:string,@Res() response:Response){return sendPrivateMedia(await this.service.media(r,id,file),r,response);}
 @Post('reviews/:id/files/:file/scan') @RequirePermissions('admin:access','community:conversations','community:attachments','community:actions') scan(@Req() r:AuthRequest,@Param('id') id:string,@Param('file') file:string,@Body() b:unknown){return this.service.scan(r,id,file,b);}
 @Post('reviews/:id/actions') @RequirePermissions('admin:access','community:conversations','community:actions') action(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.action(r,id,b);}
 @Post('reviews/:id/actions/:action/reverse') @RequirePermissions('admin:access','community:conversations','community:actions') reverse(@Req() r:AuthRequest,@Param('id') id:string,@Param('action') action:string,@Body() b:unknown){return this.service.reverse(r,id,action,b);}
 @Post('reviews/:id/appeals/:appeal/resolve') @RequirePermissions('admin:access','community:conversations','community:actions') resolve(@Req() r:AuthRequest,@Param('id') id:string,@Param('appeal') appeal:string,@Body() b:unknown){return this.service.resolveAppeal(r,id,appeal,b);}
}
@Controller('account/moderation') @Authenticated()
export class MemberModerationController {
 constructor(private readonly service:ModerationService){}
 @Get() list(@Req() r:AuthRequest){return this.service.memberActions(r);}
 @Post(':id/appeal') appeal(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.appeal(r,id,b);}
}
