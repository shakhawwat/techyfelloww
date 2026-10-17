import {sendPrivateMedia} from './private-media-response';
import {BadRequestException,Body,Controller,Get,Param,Post,Req,Res,UploadedFile,UseInterceptors} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import type {Response} from 'express';
import {Authenticated,MultipartMutation,RequirePermissions} from '../auth/permissions';
import type {AuthRequest} from '../auth/auth-http';
import {CHAT_FILE_BYTES,ChatMediaService} from './chat-media.service';
@Controller('support/media') @Authenticated()
export class ChatMediaController {
 constructor(private readonly media:ChatMediaService){}
 @Post() @MultipartMutation() @UseInterceptors(FileInterceptor('file',{limits:{fileSize:CHAT_FILE_BYTES,files:1,fields:1,fieldSize:100,parts:2}}))
 upload(@UploadedFile() file:{buffer:Buffer;originalname:string;mimetype:string}|undefined,@Body() raw:Record<string,unknown>,@Req() req:AuthRequest){if(Object.keys(raw).some(k=>k!=='key'))throw new BadRequestException();return this.media.upload(req.auth!.user,file,raw.key);}
 @Get(':id/status') scanStatus(@Param('id') id:string,@Req() req:AuthRequest){return this.media.scanStatus(id,req.auth!.user);}
 @Post(':id/retry') retryScan(@Param('id') id:string,@Req() req:AuthRequest,@Body() b:unknown){return this.media.retryScan(id,req.auth!.user,b);}
 @Get(':id') async read(@Param('id') id:string,@Req() req:AuthRequest,@Res() res:Response){
  return sendPrivateMedia(await this.media.read(id,req.auth!.user),req,res);
 }
}

@Controller('admin/inbox')
export class AdminChatMediaController {
 constructor(private readonly media:ChatMediaService){}
 @Post(':id/media') @RequirePermissions('admin:access','inbox:read','inbox:manage') @MultipartMutation() @UseInterceptors(FileInterceptor('file',{limits:{fileSize:CHAT_FILE_BYTES,files:1,fields:1,fieldSize:100,parts:2}}))
 upload(@Param('id') id:string,@UploadedFile() file:{buffer:Buffer;originalname:string;mimetype:string}|undefined,@Body() raw:Record<string,unknown>,@Req() req:AuthRequest){if(Object.keys(raw).some(k=>k!=='key'))throw new BadRequestException();return this.media.upload(req.auth!.user,file,raw.key,id);}
}
