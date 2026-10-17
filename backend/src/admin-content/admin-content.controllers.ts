import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req, UseFilters, type Type } from "@nestjs/common";
import { RequirePermissions, ValidatedQuery } from "../auth/permissions";
import type { AuthRequest } from "../auth/auth-http";
import type { ContentKind } from "../content/content.types";
import { AdminContentService } from "./admin-content.service";
import { AdminExceptionFilter } from "./admin-exception.filter";
function controller(kind: ContentKind): Type {
  @Controller(`admin/${kind}`)
  @UseFilters(AdminExceptionFilter)
  class AdminContentController {
    constructor(private readonly content: AdminContentService) {}
    @Get() @RequirePermissions(`${kind}:read`) @ValidatedQuery()
    list(@Query() query: Record<string, unknown>, @Req() request: AuthRequest) { return this.content.list(kind, query, request.auth!.user); }
    @Get(":id") @RequirePermissions(`${kind}:read`)
    detail(@Param("id") id: string, @Req() request: AuthRequest) { return this.content.detail(kind, id, request.auth!.user); }
    @Post() @RequirePermissions(`${kind}:edit`)
    create(@Body() body: unknown, @Req() request: AuthRequest) { return this.content.create(kind, body, request.auth!.user); }
    @Patch(":id") @RequirePermissions(`${kind}:edit`)
    edit(@Param("id") id: string, @Body() body: unknown, @Req() request: AuthRequest) { return this.content.mutate(kind, id, "edit", body, request.auth!.user); }
    @Post(":id/publish") @HttpCode(200) @RequirePermissions(`${kind}:publish`)
    publish(@Param("id") id: string, @Body() body: unknown, @Req() request: AuthRequest) { return this.content.mutate(kind, id, "publish", body, request.auth!.user); }
    @Post(":id/unpublish") @HttpCode(200) @RequirePermissions(`${kind}:publish`)
    unpublish(@Param("id") id: string, @Body() body: unknown, @Req() request: AuthRequest) { return this.content.mutate(kind, id, "unpublish", body, request.auth!.user); }
    @Post(":id/archive") @HttpCode(200) @RequirePermissions(`${kind}:edit`)
    archive(@Param("id") id: string, @Body() body: unknown, @Req() request: AuthRequest) { return this.content.mutate(kind, id, "archive", body, request.auth!.user); }
  }
  return AdminContentController;
}
export const adminContentControllers = (["projects", "research", "publications", "team", "courses", "pages", "products"] as const).map(controller);
