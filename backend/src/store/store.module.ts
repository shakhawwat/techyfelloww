import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {MediaModule} from '../media/media.module';
import {ContentModule} from '../content/content.module';
import {contentDefinitions} from '../content/content.schemas';
import {storeDefinitions} from './store.schemas';
import {StoreService} from './store.service';
import {StoreAccountController,StoreAdminController,StoreController} from './store.controller';
@Module({imports:[ContentModule,MediaModule,MongooseModule.forFeature([contentDefinitions.products,...storeDefinitions])],controllers:[StoreController,StoreAccountController,StoreAdminController],providers:[StoreService]})
export class StoreModule{}
