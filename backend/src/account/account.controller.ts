import {BadRequestException,Body,Controller,Get,Header,HttpCode,Post,Req,Res,UseFilters} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import type {Response} from 'express';
import {Authenticated,PublicEndpoint} from '../auth/permissions';
import {AuthService} from '../auth/auth.service';
import {AuthExceptionFilter} from '../auth/auth-exception.filter';
import {clearSessionCookie,cookieName,cookieOptions,readSessionToken,type AuthRequest} from '../auth/auth-http';
import {AccountService} from './account.service';
@Controller('account') @UseFilters(AuthExceptionFilter)
export class AccountController{
 constructor(private readonly account:AccountService,private readonly auth:AuthService,private readonly config:ConfigService){}
 private ip(request:AuthRequest){return request.ip??request.socket.remoteAddress??'unknown';}
 private query(request:AuthRequest){if(Object.keys(request.query).length)throw new BadRequestException();}
 @Post('register') @PublicEndpoint() @Header('Cache-Control','no-store')
 async register(@Body() body:unknown,@Req() request:AuthRequest){this.query(request);return {data:await this.account.register(body,this.ip(request))};}
 @Post('login') @PublicEndpoint() @HttpCode(200) @Header('Cache-Control','no-store')
 async login(@Body() body:unknown,@Req() request:AuthRequest,@Res({passthrough:true}) response:Response){this.query(request);const production=this.config.get('NODE_ENV')==='production';const result=await this.auth.login(body,this.ip(request),readSessionToken(request,production),true);const user=await this.account.me(result.user.id);response.cookie(cookieName(production,true),result.token,{...cookieOptions(production),expires:result.expiresAt});return {data:{user}};}
 @Post('logout') @Authenticated() @HttpCode(200)
 async logout(@Body() body:unknown,@Req() request:AuthRequest,@Res({passthrough:true}) response:Response){if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length)throw new BadRequestException();const {sessionId,user}=request.auth!;await this.auth.logout(sessionId,user.id);clearSessionCookie(response,this.config.get('NODE_ENV')==='production',true);return {data:{loggedOut:true}};}
 @Get('me') @Authenticated()
 async me(@Req() request:AuthRequest){return {data:{user:await this.account.me(request.auth!.user.id)}};}
 @Post('verify-email') @PublicEndpoint() @HttpCode(200) @Header('Cache-Control','no-store')
 async verifyEmail(@Body() body:unknown,@Req() request:AuthRequest){this.query(request);return {data:await this.account.verifyEmail(body,this.ip(request))};}
}
