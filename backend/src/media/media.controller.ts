import { Body, Controller, Get, Param, Patch, Post, Query, Req, UploadedFile, UseFilters, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {parseAcademyVideo} from '../academy/academy-video';
import {object} from '../academy/academy-input';
import { Authenticated, MultipartMutation, RequireAnyPermissions, ValidatedQuery, resources } from '../auth/permissions';
import type { AuthRequest } from '../auth/auth-http';
import { MediaService, type UploadFile } from './media.service';
import { MediaExceptionFilter } from './media.filter';
@Controller('admin/media') @UseFilters(MediaExceptionFilter)
export class MediaController {
  constructor(private readonly media: MediaService) {}
  @Post('video-preview') @RequireAnyPermissions(...resources.map(resource=>`${resource}:edit`))
  video(@Body() body:unknown){return {data:{embedUrl:parseAcademyVideo(object(body,['input']).input)}};}
  @Get() @Authenticated() @ValidatedQuery()
  list(@Query() query: Record<string,unknown>,@Req() request:AuthRequest){return this.media.list(query,request.auth!.user);}
  @Get(':id') @Authenticated()
  detail(@Param('id') id:string,@Req() request:AuthRequest){return this.media.detail(id,request.auth!.user);}
  @Post('upload') @RequireAnyPermissions(...resources.map(resource=>`${resource}:edit`)) @MultipartMutation() @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file:UploadFile|undefined,@Body() body:unknown,@Req() request:AuthRequest){return this.media.upload(file,body,request.auth!.user);}
  @Patch(':id') @RequireAnyPermissions(...resources.map(resource=>`${resource}:edit`))
  update(@Param('id') id:string,@Body() body:unknown,@Req() request:AuthRequest){return this.media.update(id,body,request.auth!.user);}
}
