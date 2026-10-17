import {UsersAccessService} from './users-access.service';
import { Body, Controller, Get, Header, HttpCode, Post, Req, Res, UseFilters, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import { Authenticated, grantedPermissions, PublicEndpoint, RequirePermissions } from "./permissions";
import { AuthService } from "./auth.service";
import { AuthExceptionFilter } from "./auth-exception.filter";
import { clearSessionCookie, cookieName, cookieOptions, readSessionToken, type AuthRequest } from "./auth-http";

@Controller("auth")
@UseFilters(AuthExceptionFilter)
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService,private readonly users:UsersAccessService) {}
  @Post("login") @PublicEndpoint() @HttpCode(200) @Header("Cache-Control", "no-store")
  async login(@Body() body: unknown, @Req() request: AuthRequest, @Res({ passthrough: true }) response: Response) {
    if (Object.keys(request.query).length) { await this.auth.audit("login", "invalid_request"); throw new BadRequestException(); }
    const production = this.config.get("NODE_ENV") === "production";
    const result = await this.auth.login(body, request.ip ?? request.socket.remoteAddress ?? "unknown", readSessionToken(request, production));
    response.cookie(cookieName(production), result.token, { ...cookieOptions(production), expires: result.expiresAt });
    return { data: { user: result.user } };
  }
  @Post("logout") @Authenticated() @HttpCode(200)
  async logout(@Req() request: AuthRequest, @Res({ passthrough: true }) response: Response) {
    const { sessionId, user } = request.auth!;
    await this.auth.logout(sessionId, user.id);
    clearSessionCookie(response, this.config.get("NODE_ENV") === "production");
    return { data: { loggedOut: true } };
  }
  @Post('change-password') @Authenticated() @HttpCode(200) @Header('Cache-Control','private, no-store')
  async changePassword(@Body() body:unknown,@Req() request:AuthRequest,@Res({passthrough:true}) response:Response){await this.auth.throttle(request.ip??request.socket.remoteAddress??'unknown',request.auth!.user.email);const result=await this.users.changePassword(body,request.auth!.user);clearSessionCookie(response,this.config.get('NODE_ENV')==='production');return {data:result};}
  @Post("activity") @Authenticated() @HttpCode(200) @Header('Cache-Control','private, no-store')
  async activity(@Body() body:unknown,@Req() request:AuthRequest){if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length||Object.keys(request.query).length)throw new BadRequestException();return {data:{adminSession:await this.auth.adminActivity(request.auth!.sessionId,request.auth!.user)}};}
  @Get("me") @Authenticated()
  me(@Req() request: AuthRequest) { return { data: { user: request.auth!.user, ...(request.auth!.passwordChangeRequired?{passwordChangeRequired:true}:{}), ...(request.auth!.adminSession?{adminSession:request.auth!.adminSession}:{}) } }; }
}
@Controller("admin")
@UseFilters(AuthExceptionFilter)
export class AdminAccessController {
  @Get("access") @RequirePermissions("admin:access")
  access(@Req() request: AuthRequest) {
    return { data: { user: request.auth!.user, permissions: (request.auth!.user.permissions??grantedPermissions(request.auth!.user.role)) } };
  }
}
