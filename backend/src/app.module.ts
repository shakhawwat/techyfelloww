import {StoreModule} from './store/store.module';
import {CommunityModule} from './community/community.module';
import {MessagingModule} from './messaging/messaging.module';
import {DashboardModule} from "./dashboard/dashboard.module";
import { AcademyModule } from "./academy/academy.module";
import { AccountModule } from "./account/account.module";
import { LeadModule } from "./leads/lead.module";
import { MediaModule } from "./media/media.module";
import { AdminContentModule } from "./admin-content/admin-content.module";
import { AuthModule } from "./auth/auth.module";
import { ContentModule } from "./content/content.module";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import { HealthController } from "./health.controller";
import { DatabaseService } from "./database.service";
import { databaseOptions, validateEnvironment } from "./config/environment";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, ignoreEnvFile: true, validate: validateEnvironment }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>("MONGODB_URI"),
        ...databaseOptions,
        lazyConnection: true,
        connectionFactory: (connection: Connection) => {
          connection.on("error", () => undefined);
          void connection.asPromise().catch(() => undefined);
          return connection;
        },
      }),
    }),
    StoreModule,
    CommunityModule,
    MessagingModule,
    DashboardModule,
    ContentModule,
    AcademyModule,
    AuthModule,
    AccountModule,
    AdminContentModule,
    MediaModule,
    LeadModule,
  ],
  controllers: [HealthController],
  providers: [DatabaseService],
})
export class AppModule {}
