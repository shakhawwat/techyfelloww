import {FileInterceptor} from '@nestjs/platform-express';
import type {UploadFile} from '../media/media.service';
import {object} from './academy-input';
import {parseAcademyVideo} from './academy-video';
import {Body,Controller,Get,Header,Param,Post,Query,Req,UseFilters,UseInterceptors,UploadedFile} from '@nestjs/common';
import {MultipartMutation,RequirePermissions,ValidatedQuery} from '../auth/permissions';
import type {AuthRequest} from '../auth/auth-http';
import {AcademyCommerceFilter} from './academy-commerce-errors';
import {AcademyManagementService} from './academy-management.service';
@Controller('admin/academy/management') @RequirePermissions('admin:access','courses:edit') @UseFilters(AcademyCommerceFilter)
export class AcademyManagementController {
 constructor(private readonly management:AcademyManagementService){}
 @Post('resources/upload') @MultipartMutation() @UseInterceptors(FileInterceptor('file',{limits:{fileSize:20*1024*1024,files:1,fields:0}})) @Header('Cache-Control','private, no-store') async upload(@UploadedFile() file:UploadFile|undefined,@Req() req:AuthRequest){return {data:await this.management.uploadResource(file,req.auth!.user)};}
 @Post('video-preview') @Header('Cache-Control','private, no-store') video(@Body() body:unknown){const value=object(body,['input']);return {data:{embedUrl:parseAcademyVideo(value.input)}};}
 @Get('dashboard') @Header('Cache-Control','private, no-store') async dashboard(){return {data:await this.management.dashboard()};}
 @Get('courses') @ValidatedQuery() @Header('Cache-Control','private, no-store') async courses(@Query() query:Record<string,unknown>,@Req() req:AuthRequest){return this.management.courses(query,req.auth!.user);}
 @Get('courses/:id') @Header('Cache-Control','private, no-store') async course(@Param('id') id:string,@Req() req:AuthRequest){return {data:await this.management.course(id,req.auth!.user)};}
 @Post('courses/:id/publish') @RequirePermissions('admin:access','courses:edit','courses:publish') @Header('Cache-Control','private, no-store') async publish(@Param('id') id:string,@Body() body:unknown,@Req() req:AuthRequest){return this.management.publish(id,body,req.auth!.user);}
 @Get('records/:kind') @ValidatedQuery() @Header('Cache-Control','private, no-store') async records(@Param('kind') kind:string,@Query() query:Record<string,unknown>){return this.management.records(kind,query);}
}
