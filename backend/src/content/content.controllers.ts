import { PublicEndpoint } from "../auth/permissions";
import { Controller, Get, Param, Query, UseFilters } from "@nestjs/common";
import { ContentService } from "./content.service";
import { ContentExceptionFilter } from "./content-exception.filter";

@Controller("projects")
@UseFilters(ContentExceptionFilter)
export class ProjectsController {
  constructor(private readonly content: ContentService) {}
  @PublicEndpoint()
  @Get()
  list(@Query() query: Record<string, unknown>) { return this.content.list("projects", query); }
  @PublicEndpoint()
  @Get(":slug")
  detail(@Param("slug") slug: string, @Query() query: Record<string, unknown>) { return this.content.detail("projects", slug, query); }
}

@Controller("research")
@UseFilters(ContentExceptionFilter)
export class ResearchController {
  constructor(private readonly content: ContentService) {}
  @PublicEndpoint()
  @Get()
  list(@Query() query: Record<string, unknown>) { return this.content.list("research", query); }
  @PublicEndpoint()
  @Get(":slug")
  detail(@Param("slug") slug: string, @Query() query: Record<string, unknown>) { return this.content.detail("research", slug, query); }
}

@Controller("publications")
@UseFilters(ContentExceptionFilter)
export class PublicationsController {
  constructor(private readonly content: ContentService) {}
  @PublicEndpoint()
  @Get()
  list(@Query() query: Record<string, unknown>) { return this.content.list("publications", query); }
  @PublicEndpoint()
  @Get(":slug")
  detail(@Param("slug") slug: string, @Query() query: Record<string, unknown>) { return this.content.detail("publications", slug, query); }
}

@Controller("team")
@UseFilters(ContentExceptionFilter)
export class TeamController {
  constructor(private readonly content: ContentService) {}
  @PublicEndpoint()
  @Get()
  list(@Query() query: Record<string, unknown>) { return this.content.list("team", query); }
  @PublicEndpoint()
  @Get(":slug")
  detail(@Param("slug") slug: string, @Query() query: Record<string, unknown>) { return this.content.detail("team", slug, query); }
}

@Controller("courses")
@UseFilters(ContentExceptionFilter)
export class CoursesController {
  constructor(private readonly content: ContentService) {}
  @PublicEndpoint()
  @Get()
  list(@Query() query: Record<string, unknown>) { return this.content.list("courses", query); }
  @PublicEndpoint()
  @Get(":slug")
  detail(@Param("slug") slug: string, @Query() query: Record<string, unknown>) { return this.content.detail("courses", slug, query); }
}

@Controller('pages') @UseFilters(ContentExceptionFilter)
export class PagesController {constructor(private readonly content:ContentService){} @PublicEndpoint() @Get() list(@Query() query:Record<string,unknown>){return this.content.list('pages',query);} @PublicEndpoint() @Get(':slug') detail(@Param('slug') slug:string,@Query() query:Record<string,unknown>){return this.content.detail('pages',slug,query);}}
@Controller('products') @UseFilters(ContentExceptionFilter)
export class ProductsController {constructor(private readonly content:ContentService){} @PublicEndpoint() @Get() list(@Query() query:Record<string,unknown>){return this.content.list('products',query);} @PublicEndpoint() @Get(':slug') detail(@Param('slug') slug:string,@Query() query:Record<string,unknown>){return this.content.detail('products',slug,query);}}
