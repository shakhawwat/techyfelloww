import {AuthModule} from "../auth/auth.module";
import { NotificationModule } from "../notifications/notification.module";
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { authDefinitions } from "../auth/auth.schemas";
import { leadDefinitions } from "./lead.schema";
import { LeadService } from "./lead.service";
import { AdminLeadController, PublicLeadController } from "./lead.controller";
import { LeadExceptionFilter } from "./lead.filter";
@Module({ imports: [AuthModule,NotificationModule, MongooseModule.forFeature([...Object.values(leadDefinitions), authDefinitions.user])], controllers: [PublicLeadController, AdminLeadController], providers: [LeadService, LeadExceptionFilter] })
export class LeadModule {}
