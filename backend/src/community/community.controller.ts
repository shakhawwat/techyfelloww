import {Body,Controller,Delete,Get,Param,Patch,Post,Query,Req,Res,UploadedFile,UseInterceptors} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import type {Response} from 'express';
import {Authenticated,hasIdentityPermission,MultipartMutation,PublicEndpoint,RequirePermissions,ValidatedQuery} from '../auth/permissions';
import type {AuthRequest} from '../auth/auth-http';
import type {UploadFile} from '../media/media.service';
import {CommunityService} from './community.service';
@Controller('account/profile') @Authenticated()
export class ProfileController{
 constructor(private readonly service:CommunityService){}
 @Get() profile(@Req() r:AuthRequest){return this.service.profile(r.auth!.user);}
 @Patch() save(@Req() r:AuthRequest,@Body() b:unknown){return this.service.saveProfile(r.auth!.user,b);}
 @Post('images') @MultipartMutation() @UseInterceptors(FileInterceptor('file',{limits:{fileSize:4*1024*1024,files:1,fields:1,parts:2}})) upload(@Req() r:AuthRequest,@UploadedFile() file:UploadFile|undefined,@Body() b:unknown){return this.service.upload(r.auth!.user,file,b);}
 @Get('images/:id') async image(@Req() r:AuthRequest,@Param('id') id:string,@Res() response:Response){const image=await this.service.image(id,r.auth!.user);response.setHeader('Content-Type',image.mimeType);response.setHeader('X-Content-Type-Options','nosniff');response.setHeader('Cache-Control','no-store');response.send(image.data);}
}
@Controller('account/blog') @Authenticated()
export class AuthorBlogController{
 constructor(private readonly service:CommunityService){}
 @Get() mine(@Req() r:AuthRequest){return this.service.mine(r.auth!.user);}
 @Post() create(@Req() r:AuthRequest,@Body() b:unknown){return this.service.savePost(r.auth!.user,b);}
 @Get(':id') detail(@Req() r:AuthRequest,@Param('id') id:string){return this.service.owned(r.auth!.user,id);}
 @Patch(':id') update(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.savePost(r.auth!.user,b,id);}
 @Delete(':id') remove(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.deletion(r.auth!.user,id,b);}
 @Post(':id/restore') restore(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.deletion(r.auth!.user,id,b,false,true);}
 @Post(':id/submit') submit(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.submit(r.auth!.user,id,b);}
}
@Controller('community') @PublicEndpoint()
export class PublicCommunityController{
 constructor(private readonly service:CommunityService){}
 @Get('blog') @ValidatedQuery() list(@Query() q:Record<string,unknown>){return this.service.published(q);}
 @Get('blog/:slug') article(@Param('slug') slug:string){return this.service.article(slug);}
 @Get('images/:id') async image(@Param('id') id:string,@Res() response:Response){const image=await this.service.image(id);response.setHeader('Content-Type',image.mimeType);response.setHeader('Cache-Control','no-store');response.setHeader('X-Content-Type-Options','nosniff');response.send(image.data);}
}
@Controller('admin/blog') @RequirePermissions('admin:access','blog:read')
export class AdminBlogController{
 constructor(private readonly service:CommunityService){}
 @Get('session') session(@Req() r:AuthRequest){const actor=r.auth!.user;return {data:{id:actor.id,name:actor.email,adminSession:r.auth!.adminSession,permissions:['read','review','publish','delete'].filter(action=>hasIdentityPermission(actor,`blog:${action}`))}};}
 @Get('images/:id') async image(@Req() r:AuthRequest,@Param('id') id:string,@Res() response:Response){const image=await this.service.image(id,r.auth!.user);response.setHeader('Content-Type',image.mimeType);response.setHeader('Cache-Control','no-store');response.setHeader('X-Content-Type-Options','nosniff');response.send(image.data);}
 @Get() @ValidatedQuery() list(@Query() q:Record<string,unknown>){return this.service.reviewList(q);}
 @Delete(':id') remove(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.deletion(r.auth!.user,id,b,true);}
 @Post(':id/restore') restore(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.deletion(r.auth!.user,id,b,true,true);}
 @Patch(':id') review(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.review(r.auth!.user,id,b);}
}
