import {Injectable,HttpException,ServiceUnavailableException,type CanActivate,type ExecutionContext} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Model} from 'mongoose';
import {hashToken,type AuthRequest} from '../auth/auth-http';
import type {ThrottleRecord} from '../auth/auth.schemas';
@Injectable()
export class CodeAttemptGuard implements CanActivate {
 constructor(@InjectModel('LoginThrottle') private readonly attempts:Model<ThrottleRecord>){}
 async canActivate(context:ExecutionContext){
  const req=context.switchToHttp().getRequest<AuthRequest>(),body=req.body as {code?:unknown;items?:unknown[]}|undefined;
  const weight=body&&typeof body==='object'?(Object.hasOwn(body,'code')?1:0)+(Array.isArray(body.items)?body.items.filter(item=>item&&typeof item==='object'&&Object.hasOwn(item,'code')).length:0):0;
  if(!weight)return true;
  // Shared across quote, direct redemption and order routes. Codes never enter
  // limiter keys; neither rotating a guessed code nor changing routes resets it.
  const ip=req.ip??req.socket.remoteAddress??'unknown',now=Date.now(),identity=req.auth?.user.id;
  try{for(const [windowMs,userLimit,ipLimit] of [[900000,20,60],[86400000,100,300]]){
   const window=Math.floor(now/windowMs);
   for(const [subject,limit] of [[`ip:${ip}`,ipLimit],...(identity?[[`user:${identity}`,userLimit]]:[])] as [string,number][]){
    const key=hashToken(`academy-code-attempt:${windowMs}:${window}:${subject}`),expiresAt=new Date((window+1)*windowMs);let result;
    try{result=await this.attempts.findOneAndUpdate({key},{$inc:{attempts:weight},$setOnInsert:{expiresAt}},{upsert:true,returnDocument:'after'}).maxTimeMS(1500).lean();}
    catch(error){if((error as {code?:number})?.code!==11000)throw error;result=await this.attempts.findOneAndUpdate({key},{$inc:{attempts:weight}},{returnDocument:'after'}).maxTimeMS(1500).lean();}
    if(!result)throw new ServiceUnavailableException();if(result.attempts>limit)throw new HttpException('Too many scholarship attempts.',429);
   }
  }return true;}catch(error){if(error instanceof HttpException)throw error;throw new ServiceUnavailableException();}
 }
}
