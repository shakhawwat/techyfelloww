import { academyDefinitions } from "../academy/academy.schemas";
import { MediaModule } from "../media/media.module";
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { contentDefinitions } from "./content.schemas";
import { ContentService } from "./content.service";
import { ContentExceptionFilter } from "./content-exception.filter";
import { PagesController, ProductsController, ProjectsController, ResearchController, PublicationsController, TeamController, CoursesController } from "./content.controllers";

@Module({
  imports: [MediaModule, MongooseModule.forFeature([...Object.values(contentDefinitions),academyDefinitions.find(definition=>definition.name==='LearningCourse')!])],
  controllers: [PagesController,ProductsController,ProjectsController, ResearchController, PublicationsController, TeamController, CoursesController],
  providers: [ContentService, ContentExceptionFilter],
  exports:[ContentService],
})
export class ContentModule {}
