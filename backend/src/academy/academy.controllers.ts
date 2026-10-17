import {UseGuards} from '@nestjs/common';
import {CodeAttemptGuard} from './code-attempt.guard';
import { BadRequestException, Body, Controller, Get, Header, HttpCode, Param, Patch, Post, Req, Res, UseFilters } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { PublicEndpoint, Authenticated, RequirePermissions } from '../auth/permissions';
import { AuthService } from '../auth/auth.service';
import { readSessionToken, type AuthRequest } from '../auth/auth-http';
import { AcademyCommerceFilter } from './academy-commerce-errors';
import { AcademyService } from './academy.service';
@Controller('academy/courses')
@UseFilters(AcademyCommerceFilter)
export class AcademyController {
    constructor(private readonly academy: AcademyService, private readonly auth: AuthService, private readonly config: ConfigService) {
    }
    private query(request: AuthRequest) {
        if (Object.keys(request.query).length)
            throw new BadRequestException();
    }
    private async identity(request: AuthRequest) {
        this.query(request);
        const token = readSessionToken(request, this.config.get('NODE_ENV') === 'production');
        return token ? (await this.auth.authenticate(token)).user : undefined;
    }
    @Header('Cache-Control', 'no-store')
    @Get(':slug')
    @PublicEndpoint()
    async course(
    @Param('slug')
    slug: string, 
    @Req()
    request: AuthRequest) {
        this.query(request);
        return {
            data: await this.academy.publicCourse(slug)
        };
    }
    @Header('Cache-Control', 'no-store')
    @Get(':slug/pricing')
    @PublicEndpoint()
    async pricing(@Param('slug') slug: string, @Req() request: AuthRequest) {
        this.query(request);
        return { data: await this.academy.pricing(slug) };
    }
    @Header('Cache-Control', 'no-store')
    @Get(':slug/access')
    @Authenticated()
    async access(
    @Param('slug')
    slug: string, 
    @Req()
    request: AuthRequest) {
        return {
            data: await this.academy.state(slug, request.auth!.user)
        };
    }
    @Header('Cache-Control', 'no-store')
    @Post(':slug/free-enrollment')
    @Authenticated()
    @HttpCode(200)
    async free(
    @Param('slug')
    slug: string, 
    @Body()
    body: unknown, 
    @Req()
    request: AuthRequest) {
        return {
            data: await this.academy.freeEnrollment(slug, request.auth!.user, body)
        };
    }
    @Header('Cache-Control', 'no-store')
    @UseGuards(CodeAttemptGuard) @Post(':slug/quote')
    @Authenticated()
    @HttpCode(200)
    async quote(
    @Param('slug')
    slug: string, 
    @Body()
    body: unknown, 
    @Req()
    request: AuthRequest) {
        return {
            data: await this.academy.quote(slug, request.auth!.user, body)
        };
    }
    @Header('Cache-Control', 'no-store')
    @UseGuards(CodeAttemptGuard) @Post(':slug/scholarship')
    @Authenticated()
    @HttpCode(200)
    async scholarship(
    @Param('slug')
    slug: string, 
    @Body()
    body: unknown, 
    @Req()
    request: AuthRequest) {
        return {
            data: await this.academy.redeem(slug, request.auth!.user, body)
        };
    }
    @Header('Cache-Control', 'no-store')
    @Get(':slug/lessons/:lessonId')
    @PublicEndpoint()
    async lesson(
    @Param('slug')
    slug: string, 
    @Param('lessonId')
    lesson: string, 
    @Req()
    request: AuthRequest) {
        return {
            data: await this.academy.lesson(slug, lesson, await this.identity(request))
        };
    }
    @Header('Cache-Control', 'no-store')
    @Get(':slug/lessons/:lessonId/media')
    @PublicEndpoint()
    async media(
    @Param('slug')
    slug: string, 
    @Param('lessonId')
    lesson: string, 
    @Req()
    request: AuthRequest, 
    @Res()
    response: Response) {
        const media = await this.academy.videoMedia(slug, lesson, await this.identity(request));
        if('embedUrl' in media && media.embedUrl){response.setHeader('Cache-Control','no-store');response.json({data:{embedUrl:media.embedUrl}});}
        else if (media.youtubePreview) { response.setHeader('Cache-Control', 'no-store'); response.json({ data: { youtubePreview: media.youtubePreview } }); }
        else this.send(media.file!, response, false);
    }
    @Header('Cache-Control', 'no-store')
    @Get(':slug/lessons/:lessonId/resources/:resourceId')
    @PublicEndpoint()
    async resource(
    @Param('slug')
    slug: string, 
    @Param('lessonId')
    lesson: string, 
    @Param('resourceId')
    resource: string, 
    @Req()
    request: AuthRequest, 
    @Res()
    response: Response) {
        const file = await this.academy.asset(slug, lesson, resource, await this.identity(request));
        this.send(file, response, true);
    }
    private send(file: string, response: Response, download: boolean) {
        response.setHeader('Cache-Control', 'private, no-store');
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
        if (download)
            response.setHeader('Content-Disposition', 'attachment');
        response.sendFile(file, {
            acceptRanges: true
        }, error => {
            if (error && !response.headersSent)
                response.status(503).json({
                    error: {
                        code: 'SERVICE_UNAVAILABLE', message: 'Lesson media is unavailable.'
                    }
                });
        });
    }
}
@Controller('admin/academy')
@UseFilters(AcademyCommerceFilter)
@RequirePermissions('admin:access', 'courses:edit')
export class AcademyAdminController {
    constructor(private readonly academy: AcademyService) {
    }
    @Header('Cache-Control', 'no-store')
    @Get('courses/:slug')
    async get(
    @Param('slug')
    slug: string) {
        return {
            data: await this.academy.adminConfig(slug)
        };
    }
    @Header('Cache-Control', 'no-store')
    @Post('courses/:slug')
    @HttpCode(200)
    async save(
    @Param('slug')
    slug: string, 
    @Body()
    body: unknown, 
    @Req()
    request: AuthRequest) {
        return {
            data: await this.academy.saveConfig(slug, body, request.auth!.user)
        };
    }
    @Header('Cache-Control', 'no-store')
    @Patch('courses/:slug/pricing')
    async pricing(@Param('slug') slug: string, @Body() body: unknown, @Req() request: AuthRequest) {
        return { data: await this.academy.savePricing(slug, body, request.auth!.user) };
    }
    @Header('Cache-Control', 'no-store')
    @Patch('courses/:slug/purchase-availability')
    async purchase(@Param('slug') slug:string,@Body() body:unknown,@Req() request:AuthRequest){return {data:await this.academy.savePurchaseAvailability(slug,body,request.auth!.user)};}
    @Header('Cache-Control', 'no-store')
    @Post('courses/:slug/enrollment')
    @HttpCode(200)
    async enroll(
    @Param('slug')
    slug: string, 
    @Body()
    body: unknown, 
    @Req()
    request: AuthRequest) {
        return {
            data: await this.academy.adminEnrollment(slug, body, request.auth!.user)
        };
    }
    @Header('Cache-Control', 'no-store')
    @Get('scholarships')
    async list() {
        return {
            data: await this.academy.listCodes()
        };
    }
    @Header('Cache-Control', 'private, no-store')
    @Post('scholarships/generate')
    async generate(@Body() body:unknown,@Req() request:AuthRequest){return {data:await this.academy.generateCodes(body,request.auth!.user)};}
    @Header('Cache-Control', 'no-store')
    @Post('scholarships')
    async create(
    @Body()
    body: unknown, 
    @Req()
    request: AuthRequest) {
        return {
            data: await this.academy.saveCode(body, request.auth!.user)
        };
    }
    @Header('Cache-Control', 'no-store')
    @Patch('scholarships/:id')
    async update(
    @Param('id')
    id: string, 
    @Body()
    body: unknown, 
    @Req()
    request: AuthRequest) {
        return {
            data: await this.academy.saveCode(body, request.auth!.user, id)
        };
    }
    @Header('Cache-Control', 'no-store')
    @Post('scholarships/:id/state')
    @HttpCode(200)
    async state(
    @Param('id')
    id: string, 
    @Body()
    body: unknown, 
    @Req()
    request: AuthRequest) {
        return {
            data: await this.academy.codeState(id, body, request.auth!.user)
        };
    }
}
