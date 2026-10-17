import {Body,Controller,Get,Header,Param,Patch,Post,Query,Req,UseFilters} from '@nestjs/common';
import {RequirePermissions,ValidatedQuery} from './permissions';
import type {AuthRequest} from './auth-http';
import {AuthExceptionFilter} from './auth-exception.filter';
import {UsersAccessService} from './users-access.service';
@Controller('admin/users') @RequirePermissions('admin:access','users:admin') @UseFilters(AuthExceptionFilter)
export class UsersAccessController{
 constructor(private readonly users:UsersAccessService){}
 @Get() @ValidatedQuery() @Header('Cache-Control','private, no-store')
 list(@Query() query:Record<string,unknown>){return this.users.list(query);}
 @Post() @Header('Cache-Control','private, no-store')
 async create(@Body() body:unknown,@Req() request:AuthRequest){return {data:await this.users.createStaff(body,request.auth!.user)};}
 @Patch(':id/access') @Header('Cache-Control','private, no-store')
 async update(@Param('id') id:string,@Body() body:unknown,@Req() request:AuthRequest){return {data:await this.users.update(id,body,request.auth!.user)};}
}
