import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { mediaDefinition,mediaAuditDefinition } from './media.schema';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { R2Storage } from './r2.storage';
import { MediaExceptionFilter } from './media.filter';
@Module({imports:[MongooseModule.forFeature([mediaDefinition,mediaAuditDefinition]),MulterModule.registerAsync({inject:[ConfigService],useFactory:(c:ConfigService)=>({limits:{fileSize:c.getOrThrow<number>('MEDIA_MAX_BYTES'),files:1,fields:3,parts:4,fieldSize:1024}})})],controllers:[MediaController],providers:[MediaService,R2Storage,MediaExceptionFilter],exports:[MediaService]})
export class MediaModule {}
