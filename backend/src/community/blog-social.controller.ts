import {Body,Controller,Delete,Get,Param,Patch,Post,Query,Req} from '@nestjs/common';
import {Authenticated,PublicEndpoint,RequirePermissions,ValidatedQuery} from '../auth/permissions';
import type {AuthRequest} from '../auth/auth-http';
import {BlogSocialService} from './blog-social.service';
@Controller('community/blog') @PublicEndpoint()
export class PublicBlogSocialController{
 constructor(private readonly service:BlogSocialService){}
 @Get('feed/network') network(){return this.service.network();}
 @Get(':id/interactions') state(@Param('id') id:string){return this.service.state(id);}
 @Get(':id/comments') @ValidatedQuery() comments(@Param('id') id:string,@Query() q:Record<string,unknown>){return this.service.comments(id,q);}
}
@Controller('account/blog') @Authenticated()
export class MemberBlogSocialController{
 constructor(private readonly service:BlogSocialService){}
 @Get('feed/following') @ValidatedQuery() following(@Req() r:AuthRequest,@Query() q:Record<string,unknown>){return this.service.following(r.auth!.user,q);}
 @Get('feed/preferences') preferences(@Req() r:AuthRequest){return this.service.preferences(r.auth!.user);}
 @Get('feed/saved') saved(@Req() r:AuthRequest){return this.service.saved(r.auth!.user);}
 @Patch('feed/cover') cover(@Req() r:AuthRequest,@Body() b:unknown){return this.service.cover(r.auth!.user,b);}
 @Post('authors/:author/follow') follow(@Req() r:AuthRequest,@Param('author') author:string,@Body() b:unknown){return this.service.follow(r.auth!.user,author,b);}
 @Patch(':id/preferences') preference(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.preference(r.auth!.user,id,b);}
 @Post(':id/repost') repost(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.repost(r.auth!.user,id,b);}
 @Delete(':id/reposts/:repost') removeRepost(@Req() r:AuthRequest,@Param('id') id:string,@Param('repost') repost:string){return this.service.removeRepost(r.auth!.user,id,repost);}
 @Patch(':id/comments-setting') setting(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.commentsSetting(r.auth!.user,id,b);}
 @Post(':id/report') report(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.report(r.auth!.user,id,b);}
 @Post(':id/send') send(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.inboxSend(r.auth!.user,id,b,String(r.headers.origin));}
 @Get(':id/interactions') state(@Req() r:AuthRequest,@Param('id') id:string){return this.service.state(id,r.auth!.user);}
 @Post(':id/like') like(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.like(r.auth!.user,id,b);}
 @Post(':id/comments') add(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.add(r.auth!.user,id,b);}
 @Patch(':id/comments/:comment') edit(@Req() r:AuthRequest,@Param('id') id:string,@Param('comment') c:string,@Body() b:unknown){return this.service.change(r.auth!.user,id,c,b);}
 @Delete(':id/comments/:comment') remove(@Req() r:AuthRequest,@Param('id') id:string,@Param('comment') c:string,@Body() b:unknown){return this.service.change(r.auth!.user,id,c,b,true);}
}
@Controller('admin/blog') @RequirePermissions('admin:access','blog:read','blog:review')
export class AdminBlogSocialController{
 constructor(private readonly service:BlogSocialService){}
 @Get('moderation/reports') reports(){return this.service.reports();}
 @Patch('moderation/reports/:report') resolve(@Param('report') report:string,@Body() b:unknown){return this.service.resolveReport(report,b);}
 @Patch(':id/comments-setting') setting(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.commentsSetting(r.auth!.user,id,b,true);}
 @Delete(':id/comments/:comment') remove(@Req() r:AuthRequest,@Param('id') id:string,@Param('comment') c:string,@Body() b:unknown){return this.service.change(r.auth!.user,id,c,b,true,true);}
}
