import {Body,Controller,Delete,Get,Header,Param,Patch,Post,Req,UseFilters} from '@nestjs/common';
import {RequirePermissions} from './permissions';
import type {AuthRequest} from './auth-http';
import {AuthExceptionFilter} from './auth-exception.filter';
import {StaffRolesService} from './staff-roles.service';
@Controller('admin/staff-roles') @RequirePermissions('admin:access','users:admin') @UseFilters(AuthExceptionFilter)
export class StaffRolesController{
 constructor(private readonly roles:StaffRolesService){}
 @Get() @Header('Cache-Control','private, no-store') async list(@Req() req:AuthRequest){return this.roles.list(req.auth!.user);}
 @Post() @Header('Cache-Control','private, no-store') async create(@Body() body:unknown,@Req() req:AuthRequest){return {data:await this.roles.save(body,req.auth!.user)};}
 @Patch(':key') @Header('Cache-Control','private, no-store') async edit(@Param('key') key:string,@Body() body:unknown,@Req() req:AuthRequest){return {data:await this.roles.save(body,req.auth!.user,key)};}
 @Delete(':key') @Header('Cache-Control','private, no-store') async remove(@Param('key') key:string,@Body() body:unknown,@Req() req:AuthRequest){return {data:await this.roles.remove(key,body,req.auth!.user)};}
}
