import {BadRequestException,Body,Controller,Get,Param,Post,Query,Req,Res,UploadedFile,UseInterceptors} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import type {Response} from 'express';
import {Authenticated,MultipartMutation,PublicEndpoint,RequirePermissions,ValidatedQuery} from '../auth/permissions';
import type {AuthRequest} from '../auth/auth-http';
import {CHAT_FILE_BYTES} from './chat-media.service';
import {DirectService} from './direct.service';
import {sendPrivateMedia} from './private-media-response';
@Controller('account/direct') @Authenticated()
export class DirectController {
 constructor(private readonly service:DirectService){}
 @Get('users') @ValidatedQuery() users(@Req() r:AuthRequest,@Query() q:Record<string,unknown>){return this.service.users(r.auth!.user,q);}
 @Get('recipient/:id') resolve(@Req() r:AuthRequest,@Param('id') id:string){return this.service.resolve(r.auth!.user,id);}
 @Post('recipient/:id') prepare(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.prepare(r.auth!.user,id,b);}
 @Get() @ValidatedQuery() list(@Req() r:AuthRequest,@Query() q:Record<string,unknown>){return this.service.list(r.auth!.user,q);}
 @Post('messages') send(@Req() r:AuthRequest,@Body() b:unknown){return this.service.send(r.auth!.user,b);}
 @Get('media/:id/status') scanStatus(@Req() r:AuthRequest,@Param('id') id:string){return this.service.scanStatus(r.auth!.user,id);}
 @Post('media/:id/retry') retryScan(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.retryScan(r.auth!.user,id,b);}
 @Get('media/:id') async media(@Req() r:AuthRequest,@Param('id') id:string,@Res() res:Response){return sendPrivateMedia(await this.service.media(r.auth!.user,id),r,res);}
 @Get(':id') @ValidatedQuery() detail(@Req() r:AuthRequest,@Param('id') id:string,@Query() q:Record<string,unknown>){return this.service.detail(r.auth!.user,id,q);}
 @Post(':id/read') read(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.read(r.auth!.user,id,b);}
 @Post(':id/action') action(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.action(r.auth!.user,id,b);}
 @Post(':id/report') report(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.report(r.auth!.user,id,b);}
 @Post(':id/media') @MultipartMutation() @UseInterceptors(FileInterceptor('file',{limits:{fileSize:CHAT_FILE_BYTES,files:1,fields:1,fieldSize:100,parts:2}}))
 upload(@Req() r:AuthRequest,@Param('id') id:string,@UploadedFile() file:{buffer:Buffer;originalname:string;mimetype:string}|undefined,@Body() b:Record<string,unknown>){if(Object.keys(b).some(k=>k!=='key'))throw new BadRequestException();return this.service.upload(r.auth!.user,id,file,b.key);}
}
@Controller('admin/direct-reports') @RequirePermissions('admin:access','direct-reports:review')
export class DirectReportsController {
 constructor(private readonly service:DirectService){}
 @Get() list(){return this.service.reports();}
}

@Controller('community/members') @PublicEndpoint()
export class PublicMemberController {constructor(private readonly service:DirectService){} @Get(':id') profile(@Param('id') id:string){return this.service.publicProfile(id);}}
