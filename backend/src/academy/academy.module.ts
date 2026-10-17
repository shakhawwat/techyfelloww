import {CodeAttemptGuard} from './code-attempt.guard';
import {authDefinitions} from '../auth/auth.schemas';
import {MediaModule} from '../media/media.module';
import {AdminContentModule} from '../admin-content/admin-content.module';
import {AcademyManagementService} from './academy-management.service';
import {AcademyManagementController} from './academy-management.controller';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { contentDefinitions } from '../content/content.schemas';
import { academyDefinitions } from './academy.schemas';
import { AcademyPaymentGateway } from './academy-payment.gateway';
import { AcademyOrderController } from './academy-order.controller';
import { AcademyService } from './academy.service';
import { AcademyController, AcademyAdminController } from './academy.controllers';
@Module({
    imports: [AuthModule, MediaModule, AdminContentModule, MongooseModule.forFeature([authDefinitions.throttle,contentDefinitions.courses, ...academyDefinitions])], controllers: [AcademyController, AcademyAdminController, AcademyOrderController, AcademyManagementController], providers: [CodeAttemptGuard,AcademyManagementService, AcademyService, AcademyPaymentGateway]
})
export class AcademyModule {
}
