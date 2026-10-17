import {MessagingModule} from '../messaging/messaging.module';
import {BlogSocialService} from './blog-social.service';
import {PublicBlogSocialController,MemberBlogSocialController,AdminBlogSocialController} from './blog-social.controller';
import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {AuthModule} from '../auth/auth.module';
import {communityDefinitions} from './community.schemas';
import {CommunityService} from './community.service';
import {ProfileController,AuthorBlogController,PublicCommunityController,AdminBlogController} from './community.controller';
@Module({imports:[AuthModule,MessagingModule,MongooseModule.forFeature(communityDefinitions)],controllers:[PublicBlogSocialController,MemberBlogSocialController,AdminBlogSocialController,ProfileController,AuthorBlogController,PublicCommunityController,AdminBlogController],providers:[CommunityService,BlogSocialService]})
export class CommunityModule{}
