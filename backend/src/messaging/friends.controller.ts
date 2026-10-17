import {Body,Controller,Get,Param,Post,Query,Req} from '@nestjs/common';
import {Authenticated,ValidatedQuery} from '../auth/permissions';
import type {AuthRequest} from '../auth/auth-http';
import {FriendsService} from './friends.service';
@Controller('account/friends') @Authenticated()
export class FriendsController {
 constructor(private readonly friends:FriendsService){}
 @Get() @ValidatedQuery() list(@Req() r:AuthRequest,@Query() q:Record<string,unknown>){return this.friends.list(r.auth!.user,q);}
 @Get(':id') state(@Req() r:AuthRequest,@Param('id') id:string){return this.friends.state(r.auth!.user,id);}
 @Post(':id') change(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.friends.change(r.auth!.user,id,b);}
}
