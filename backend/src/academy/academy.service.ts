import {generateScholarshipCode} from './scholarship-code';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, HttpException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Connection, Model, type ClientSession } from 'mongoose';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { MediaService } from '../media/media.service';
import { approvedPreviewPrices } from './approved-preview-prices';
import { AcademyPaymentGateway, type VerifiedPayment } from './academy-payment.gateway';
import { CartCourseError, PromoError } from './academy-commerce-errors';
import { realpath, stat } from 'node:fs/promises';
import { resolve, dirname, isAbsolute } from 'node:path';
import type { AuthIdentity } from '../auth/auth-http';
import type { ContentRecord } from '../content/content.types';
import { syllabusCurriculum } from './academy-curriculum';
import { coursePricing, codeTotals, priceInput, legacyMinor } from './academy-pricing';
import { codeHash, flag, integer, strings, object, slug, text, learningInput, scholarshipInput } from './academy-input';
import type { LearningCourse, Enrollment, Scholarship, Redemption, AcademyAudit, Lesson, AcademyOrder, AcademyOrderItem, AcademyCart, PaymentEventRecord } from './academy.schemas';
@Injectable()
export class AcademyService {
    constructor(
    @InjectConnection()
    private readonly db: Connection, private readonly config: ConfigService, 
    @InjectModel('Course')
    private readonly courses: Model<ContentRecord>, 
    @InjectModel('LearningCourse')
    private readonly learning: Model<LearningCourse>, 
    @InjectModel('AcademyEnrollment')
    private readonly enrollments: Model<Enrollment>, 
    @InjectModel('AcademyScholarship')
    private readonly codes: Model<Scholarship>, 
    @InjectModel('AcademyRedemption')
    private readonly redemptions: Model<Redemption>, 
    @InjectModel('AcademyAudit')
    private readonly audits: Model<AcademyAudit>,
    @InjectModel('AcademyCart') private readonly carts:Model<AcademyCart>,
    @InjectModel('AcademyOrder') private readonly orders: Model<AcademyOrder>,
    @InjectModel('AcademyPaymentEvent') private readonly paymentEvents: Model<PaymentEventRecord>,
    private readonly payments: AcademyPaymentGateway, private readonly media:MediaService) {
    }
    private async course(courseSlug: string, session?: ClientSession) {
        slug(courseSlug);
        const course = await this.courses.findOne({
            slug: courseSlug, status: 'published', publishedAt: {
                $lte: new Date()
            }
        }).session(session ?? null).lean();
        if (!course)
            throw new NotFoundException();
        return course;
    }
    private async adminCourse(courseSlug:string,session?:ClientSession){slug(courseSlug);const course=await this.courses.findOne({slug:courseSlug}).session(session??null).lean();if(!course)throw new NotFoundException();return course;}
    async contentReadiness(config:LearningCourse|null|undefined){return this.purchaseAvailability(config?{...config,purchaseEnabled:true}:config);}
    private async settings(courseSlug: string, session?: ClientSession) {
        if(await this.courses.exists({slug:courseSlug,"importProvenance.source":"frontend-demo"}).session(session??null))throw new ForbiddenException("Imported illustrative courses are not enrollable.");
        const settings = await this.learning.findOne({
            slug: courseSlug, enabled: true
        }).session(session ?? null).lean();
        if (!settings)
            throw new ServiceUnavailableException('Course access has not been configured.');
        return settings;
    }
    private async curriculum(courseSlug: string) {
        const course = await this.course(courseSlug);
        const config = await this.learning.findOne({ slug: courseSlug, enabled: true }).lean();
        return { config, modules: config?.modules.length ? config.modules : syllabusCurriculum(course) };
    }
    private async publicModules(modules: LearningCourse['modules'], previewVideoUrl?: string) {
        const positions = new Map(modules.flatMap(module => module.lessons).map((lesson, index) => [lesson, index]));
        return Promise.all(modules.map(async module => ({ id: module.id, title: module.title,
            lessons: await Promise.all(module.lessons.map(async lesson => ({ id: lesson.id, title: lesson.title,
                description: lesson.description ?? lesson.title, type: lesson.type, access: this.lessonAccess(lesson, positions.get(lesson)!),
                hasVideo: await this.hasVideo(lesson, positions.get(lesson) === 0 ? previewVideoUrl : undefined),
                durationSeconds: lesson.durationSeconds, resourceCount: lesson.resources.length })))
        })));
    }
    async publicCourse(courseSlug: string) {
        const { config, modules } = await this.curriculum(courseSlug);
        if (!config) return { configured: false, paymentAvailable: false, pricing: await this.pricing(courseSlug), commerce: await this.purchaseAvailability(config), modules: await this.publicModules(modules) };
        const intro = modules[0]?.lessons[0];
        const preview = intro?.type === 'video' && intro.access === 'public' ? config.previewVideoUrl : undefined;
        return { configured: true, paymentAvailable: false, category: config.category, description: config.description,
            outcomes: config.outcomes, audience: config.audience, instructor: config.instructor, thumbnail: await this.courseImage(config.thumbnail),
            previewVideoUrl: preview, pricing: coursePricing(config), commerce: await this.purchaseAvailability(config), accessTerms: config.accessTerms, benefits: config.benefits,
            modules: await this.publicModules(modules, preview) };
    }
    private async courseImage(image:LearningCourse['thumbnail']){if(!image?.src.startsWith('media:'))return image;const images=await this.media.publicCourseImages([image.src.slice(6)]);return images[0]?.url?{src:images[0].url,alt:image.alt}:undefined;}
    async pricing(courseSlug: string) {
        const approved = approvedPreviewPrices.find(course => course.slug === courseSlug);
        if (!approved) await this.course(courseSlug);
        const published=await this.courses.exists({slug:courseSlug,status:"published",publishedAt:{$lte:new Date()}});
        const stored = published?await this.learning.findOne({ slug: courseSlug }).lean():undefined;
        return coursePricing(stored ?? (approved ? { currency: 'BDT', regularPriceMinor: approved.regularPriceMinor, salePriceMinor: approved.salePriceMinor } : undefined));
    }
    async savePricing(courseSlug: string, raw: unknown, actor: AuthIdentity) {
        const o = object(raw, ['currency', 'regularPriceMinor', 'salePriceMinor', 'saleStartsAt', 'saleEndsAt', 'revision']);
        const pricing = priceInput(o);
        if (typeof o.revision !== 'number' || !Number.isSafeInteger(o.revision) || o.revision < 0) throw new BadRequestException();
        return this.transaction(async session => {
            await this.adminCourse(courseSlug, session);
            const old = await this.learning.findOne({ slug: courseSlug }).session(session).lean();
            if ((old?.revision ?? 0) !== o.revision) throw new ConflictException();
            const unset = Object.fromEntries(['priceBDT', 'salePriceBDT', ...Object.keys(pricing).filter(key => pricing[key as keyof typeof pricing] === undefined)].map(key => [key, '']));
            const set = Object.fromEntries(Object.entries(pricing).filter(([, value]) => value !== undefined));
            await this.learning.updateOne({ slug: courseSlug }, { $set: { ...set, revision: o.revision + 1 }, $unset: unset,
                $setOnInsert: { slug: courseSlug, enabled: false, accessTerms: '', benefits: [], outcomes: [], modules: [] } }, { session, upsert: true });
            await this.audits.create([{ actor: actor.id, action: 'course_pricing_update', target: courseSlug }], { session });
            return { saved: true, revision: o.revision + 1, pricing: coursePricing(pricing) };
        });
    }
    async state(courseSlug: string, user: AuthIdentity) {
        await this.course(courseSlug);
        const settings = await this.learning.findOne({
            slug: courseSlug, enabled: true
        }).lean();
        const enrollment = settings ? await this.enrollments.findOne({
            userId: user.id, courseSlug, active: true
        }).lean() : null;
        return {
            enrolled: !!enrollment, source: enrollment?.source, configured: !!settings
        };
    }
    private lessonAccess(lesson: Lesson, index: number): Lesson['access'] {
        // Preserve an explicitly public introduction; never turn private legacy content into a preview.
        return index === 0 && lesson.access === 'public' ? 'public' : 'enrolled';
    }
    private async hasVideo(lesson: Lesson, preview?: string) {
        if (lesson.type !== 'video') return false;
        if(lesson.embedUrl)return true;
        if (!lesson.file) return lesson.access === 'public' && !!preview;
        try { await this.privateFile(lesson.file); return true; } catch { return false; }
    }
    private async allowed(lesson: Lesson, courseSlug: string, user?: AuthIdentity) {
        if (lesson.access === 'public')
            return true;
        if (!user)
            return false;
        return !!await this.enrollments.exists({
            userId: user.id, courseSlug, active: true
        });
    }
    private async accessibleLesson(courseSlug: string, lessonId: string, user?: AuthIdentity) {
        const { config, modules } = await this.curriculum(courseSlug);
        const lessons = modules.flatMap(module => module.lessons);
        const index = lessons.findIndex(l => l.id === slug(lessonId));
        const source = lessons[index];
        const lesson = source ? { ...source, access: this.lessonAccess(source, index) } : undefined;
        if (!lesson)
            throw new NotFoundException();
        if (lesson.access !== 'public' && !config || !await this.allowed(lesson, courseSlug, user))
            throw new ForbiddenException();
        return { ...lesson, youtubePreview: index === 0 && lesson.type === 'video' && lesson.access === 'public' && !lesson.file ? config?.previewVideoUrl : undefined };
    }
    async lesson(courseSlug: string, lessonId: string, user?: AuthIdentity) {
        const lesson = await this.accessibleLesson(courseSlug, lessonId, user);
        return {
            id: lesson.id, title: lesson.title, description: lesson.description ?? lesson.title, type: lesson.type, text: lesson.text, hasVideo: await this.hasVideo(lesson, lesson.youtubePreview), embedUrl:lesson.embedUrl, youtubePreview: lesson.youtubePreview, durationSeconds: lesson.durationSeconds, video: lesson.file && await this.hasVideo(lesson) ? `/academy/courses/${courseSlug}/lessons/${lesson.id}/media` : undefined, resources: lesson.resources.map(r => ({
                id: r.id, title: r.title, path: `/academy/courses/${courseSlug}/lessons/${lesson.id}/resources/${r.id}`
            }))
        };
    }
    async videoMedia(courseSlug: string, lessonId: string, user?: AuthIdentity) {
        const lesson = await this.accessibleLesson(courseSlug, lessonId, user);
        if(lesson.embedUrl)return {embedUrl:lesson.embedUrl};
        if (lesson.youtubePreview) return { youtubePreview: lesson.youtubePreview };
        if (!lesson.file) throw new NotFoundException('Video not supplied');
        return { file: await this.privateFile(lesson.file) };
    }
    async asset(courseSlug: string, lessonId: string, resourceId: string | undefined, user?: AuthIdentity) {
        const lesson = await this.accessibleLesson(courseSlug, lessonId, user);
        const key = resourceId ? lesson.resources.find(r => r.id === slug(resourceId))?.file : lesson.file;
        if (!key)
            throw new NotFoundException();
        return this.privateFile(key);
    }
    private async privateFile(key: string) {
        const root = this.config.get<string>('ACADEMY_MEDIA_ROOT');
        if (!root || !isAbsolute(root))
            throw new ServiceUnavailableException();
        try {
            const realRoot = await realpath(root);
            const file = await realpath(resolve(realRoot, key));
            if (dirname(file) !== realRoot)
                throw new ForbiddenException();
            if (!(await stat(file)).isFile()) throw new ServiceUnavailableException();
            return file;
        }
        catch (error) {
            if (error instanceof ForbiddenException)
                throw error;
            throw new ServiceUnavailableException();
        }
    }
    private async transaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
        const session = await this.db.startSession();
        try {
            const result = await session.withTransaction(() => work(session), {
                readConcern: {
                    level: 'snapshot'
                }, writeConcern: {
                    w: 'majority'
                }
            });
            if (result === undefined)
                throw new ServiceUnavailableException();
            return result;
        }
        finally {
            await session.endSession();
        }
    }
    private async touch(courseSlug: string, session: ClientSession) {
        await this.learning.updateOne({
            slug: courseSlug, enabled: true
        }, {
            $inc: {
                revision: 1
            }
        }, {
            session
        });
    }
    private async enroll(courseSlug: string, userId: string, source: Enrollment['source'], session: ClientSession) {
        const old = await this.enrollments.findOne({
            userId, courseSlug
        }).session(session).lean();
        if (old && !old.active)
            throw new ForbiddenException();
        if (old)
            return false;
        await this.enrollments.create([{
                userId, courseSlug, source, active: true, createdAt: new Date()
            }], {
            session
        });
        return true;
    }
    async freeEnrollment(courseSlug: string, user: AuthIdentity, raw: unknown) {
        object(raw, []);
        return this.transaction(async (session) => {
            await this.course(courseSlug, session);
            const course = await this.settings(courseSlug, session);
            if (coursePricing(course).state === 'unconfigured' || coursePricing(course).currentPriceMinor !== 0)
                throw new ForbiddenException();
            await this.touch(courseSlug, session);
            const created = await this.enroll(courseSlug, user.id, 'free', session);
            if (created)
                await this.audits.create([{
                        actor: user.id, action: 'free_enrollment', target: courseSlug
                    }], {
                    session
                });
            return {
                enrolled: true
            };
        });
    }
    private async totals(course: LearningCourse, user: AuthIdentity, code: unknown, session?: ClientSession, options?: {codeId?:string;excludeOrderId?:string}) {
        const pricing = coursePricing(course);
        if (pricing.state === 'unconfigured') throw new BadRequestException('Course price is not configured.');
        if (code === undefined && !options?.codeId)
            return { currency: 'BDT' as const, subtotalMinor: pricing.subtotalMinor!, discountMinor: pricing.discountMinor!, finalMinor: pricing.finalMinor!,
                scholarship: undefined, appliedDiscount: pricing.saleActive ? 'sale' : 'none', stackingRule: pricing.stackingRule, paymentAvailable: false as const };
        let hash:string|undefined;
        if(!options?.codeId){try{hash=codeHash(code);}catch{throw new PromoError('PROMO_INVALID');}}
        const scholarship = await this.codes.findOne(options?.codeId ? {_id:options.codeId} : {codeHash:hash}).session(session ?? null).lean();
        const now = new Date();
        if(!scholarship)throw new PromoError('PROMO_INVALID');
        if(!scholarship.active)throw new PromoError('PROMO_INACTIVE');
        if(scholarship.startsAt>now)throw new PromoError('PROMO_NOT_STARTED');
        if(scholarship.expiresAt&&scholarship.expiresAt<=now)throw new PromoError('PROMO_EXPIRED');
        if((scholarship.anyCourse?!((await this.purchaseAvailability(course)).eligible):!scholarship.courses.includes(course.slug))||scholarship.recipientEmail&&scholarship.recipientEmail!==user.email.toLowerCase())throw new PromoError('PROMO_INELIGIBLE');
        if(pricing.currentPriceMinor!<(scholarship.minimumSpendMinor??0))throw new PromoError('PROMO_MINIMUM');
        const reserved=await this.reservationCount(String(scholarship._id),now,session,options?.excludeOrderId);
        if(scholarship.redeemed+reserved>=scholarship.totalLimit)throw new PromoError('PROMO_EXHAUSTED');
        if (scholarship.recipientEmail && !await this.db.collection('users').findOne({
            _id: new (await import('mongoose')).Types.ObjectId(user.id), enabled: true, emailVerifiedAt: {
                $type: 'date'
            }
        }, {
            session, projection: {
                _id: 1
            }
        }))
            throw new PromoError('PROMO_VERIFY_EMAIL');
        const used = await this.redemptions.countDocuments({
            codeId: String(scholarship._id), userId: user.id
        }).session(session ?? null);
        const heldByAccount=await this.reservationCount(String(scholarship._id),now,session,options?.excludeOrderId,user.id);
        if (used+heldByAccount >= scholarship.perAccountLimit)throw new PromoError('PROMO_ACCOUNT_LIMIT');
        const amount = scholarship.kind === 'fixed' ? scholarship.amountMinor ?? legacyMinor(scholarship.amount) : scholarship.amount ?? 0;
        return { ...codeTotals(pricing, scholarship.kind, amount), scholarship };
    }
    private async reservationCount(codeId:string,now:Date,session?:ClientSession,excludeOrderId?:string,userId?:string){
        const query={status:'pending',expiresAt:{$gt:now},...(excludeOrderId?{_id:{$ne:new (await import('mongoose')).Types.ObjectId(excludeOrderId)}}:{}),...(userId?{userId}: {})};
        const rows=await this.orders.aggregate([{$match:query},{$project:{count:{$cond:[{$isArray:'$items'},{$size:{$filter:{input:'$items',as:'item',cond:{$and:[{$eq:['$$item.codeId',codeId]},{$eq:['$$item.reservationActive',true]}]}}}},{$cond:[{$and:[{$eq:['$codeId',codeId]},{$eq:['$reservationActive',true]}]},1,0]}]}}},{$group:{_id:null,count:{$sum:'$count'}}}]).session(session??null);
        return Number(rows[0]?.count??0);
    }
    async quote(courseSlug: string, user: AuthIdentity, raw: unknown) {
        const o = object(raw, ['code']);
        await this.course(courseSlug);
        const result = await this.totals(await this.settings(courseSlug), user, o.code);
        return {
            currency: result.currency, subtotalMinor: result.subtotalMinor, discountMinor: result.discountMinor, finalMinor: result.finalMinor, appliedDiscount: result.appliedDiscount, stackingRule: result.stackingRule, paymentAvailable: false
        };
    }
    async redeem(courseSlug: string, user: AuthIdentity, raw: unknown) {
        const o=object(raw,['code']);
        return this.transaction(session=>this.redeemInSession(courseSlug,user,o.code,session));
    }
    private async redeemInSession(courseSlug:string,user:AuthIdentity,rawCode:unknown,session:ClientSession) {
        let hash:string;try{hash=codeHash(rawCode);}catch{throw new PromoError('PROMO_INVALID');}
            await this.course(courseSlug, session);
            const course = await this.settings(courseSlug, session);
            const existing = await this.codes.findOne({
                codeHash: hash
            }).session(session).lean();
            if (existing && await this.redemptions.exists({
                codeId: String(existing._id), userId: user.id, courseSlug
            }).session(session)) {
                const enrolled = await this.enrollments.exists({
                    userId: user.id, courseSlug, active: true
                }).session(session);
                if (!enrolled)
                    throw new ForbiddenException();
                return {
                    enrolled: true, retried: true
                };
            }
            const totals = await this.totals(course, user, rawCode, session);
            if (totals.finalMinor !== 0 || !totals.scholarship)
                throw new BadRequestException('Payment is not available. Only a full scholarship can be redeemed.');
            await this.touch(courseSlug, session);
            const created = await this.enroll(courseSlug, user.id, 'scholarship', session);
            if (!created)
                return {
                    enrolled: true, retried: true
                };
            const code = totals.scholarship;
            const reservation = await this.codes.updateOne({
                _id: code._id, active: true, redeemed: { $lt: code.totalLimit }
            }, {
                $inc: {
                    redeemed: 1, revision: 1
                }
            }, {
                session
            });
            if (reservation.modifiedCount !== 1)
                throw new BadRequestException('Code is unavailable or ineligible.');
            await this.redemptions.create([{
                    codeId: String(code._id), userId: user.id, courseSlug, discountMinor: totals.discountMinor
                }], {
                session
            });
            await this.audits.create([{
                    actor: user.id, action: 'scholarship_redemption', target: String(code._id)
                }], {
                session
            });
            return {
                enrolled: true, retried: false
            };
    }
    private async purchaseAvailability(config:LearningCourse|null|undefined) {
        const base={eligible:false,paymentAvailable:false,reason:'Course purchase is not enabled.'};
        if(!config?.enabled||!config.purchaseEnabled)return base;
        if(await this.courses.exists({slug:config.slug,"importProvenance.source":"frontend-demo"}))return {...base,reason:"Imported illustrative course. Purchases and enrollment remain unavailable."};
        if(coursePricing(config).state==='unconfigured')return {...base,reason:'Course price is not configured.'};
        const lessons=config.modules.flatMap(module=>module.lessons);
        if(!lessons.length)return {...base,reason:'Only syllabus placeholders are available. This course cannot be purchased.'};
        for(const [index,lesson] of lessons.entries()){
            if(!lesson.description?.trim())return {...base,reason:'Course lesson descriptions are incomplete.'};
            if(lesson.type==='video'&&!await this.hasVideo(lesson,index===0?config.previewVideoUrl:undefined))return {...base,reason:'Course lesson videos are incomplete. This course cannot be purchased.'};
            if(lesson.type==='text'&&!lesson.text?.trim())return {...base,reason:'Course lesson content is incomplete.'};
            for(const resource of lesson.resources){try{await this.privateFile(resource.file);}catch{return {...base,reason:'Course resources are incomplete.'};}}
        }
        return {eligible:true,paymentAvailable:false,reason:'Scholarship checkout is available. Orders with a balance remain pending.'};
    }
    async commerceSummary(courseSlug:string,user?:AuthIdentity){
        slug(courseSlug);
        const preview=approvedPreviewPrices.find(course=>course.slug===courseSlug);
        const pricing=await this.pricing(courseSlug);
        const quote=pricing.state==='unconfigured'?null:{currency:'BDT' as const,subtotalMinor:pricing.subtotalMinor!,discountMinor:pricing.discountMinor!,finalMinor:pricing.finalMinor!,stackingRule:pricing.stackingRule,appliedDiscount:pricing.saleActive?'sale':'none',paymentAvailable:false};
        const published=await this.courses.exists({slug:courseSlug,status:"published",publishedAt:{$lte:new Date()}});
        if(preview&&!published)return {course:{slug:courseSlug,title:preview.title,illustrative:true},pricing,quote,enrolled:false,canApplyCode:false,commerce:{eligible:false,paymentAvailable:false,reason:'Course material is illustrative. This course cannot be purchased.'}};
        const course=await this.course(courseSlug),config=await this.learning.findOne({slug:courseSlug,enabled:true}).lean();
        const enrolled=user?!!await this.enrollments.exists({userId:user.id,courseSlug,active:true}):false;
        return {course:{slug:courseSlug,title:course.title,illustrative:!!course.importProvenance},pricing,quote,enrolled,canApplyCode:!course.importProvenance&&!!config&&pricing.state!=='unconfigured'&&!enrolled,commerce:await this.purchaseAvailability(config)};
    }
    async savePurchaseAvailability(courseSlug:string,raw:unknown,actor:AuthIdentity){
        const o=object(raw,['purchaseEnabled','revision']),purchaseEnabled=flag(o.purchaseEnabled);
        if(typeof o.revision!=='number'||!Number.isSafeInteger(o.revision)||o.revision<0)throw new BadRequestException();
        return this.transaction(async session=>{await this.adminCourse(courseSlug,session);const config=await this.learning.findOne({slug:courseSlug}).session(session).lean();if(!config||config.revision!==o.revision)throw new ConflictException();
            const availability=await this.purchaseAvailability({...config,purchaseEnabled:true});if(purchaseEnabled&&!availability.eligible)throw new BadRequestException('Configure complete lesson media/content before enabling purchases.');
            await this.learning.updateOne({slug:courseSlug,revision:o.revision},{$set:{purchaseEnabled},$inc:{revision:1}},{session});
            await this.audits.create([{actor:actor.id,action:purchaseEnabled?'course_purchase_enable':'course_purchase_disable',target:courseSlug}],{session});return {saved:true,revision:o.revision+1};});
    }
    private memoCode(code?:Scholarship&{_id?:unknown}) {return code?{scholarshipPercentage:code.kind==='full'?100:code.kind==='percentage'?code.amount:undefined,codeReference:`SCH-••••${String(code._id).slice(-6)}`} : {};}
    private async memoSnapshot(user:AuthIdentity,session:ClientSession) {
        const member=await this.db.collection('users').findOne({_id:new (await import('mongoose')).Types.ObjectId(user.id),enabled:true},{session,projection:{name:1,email:1}});
        if(!member)throw new ForbiddenException();
        return {checkoutMode:'scholarship' as const,learnerName:String(member.name??''),learnerEmail:String(member.email)};
    }
    async orderMemo(id:string,user:AuthIdentity,admin=false){
        this.orderId(id);
        const order=await this.orders.findOne({_id:id,...(admin?{}:{userId:user.id})}).lean();if(!order)throw new NotFoundException();
        const dto=await this.orderDto(order);
        return {...dto,number:`TF-${id.toUpperCase()}`,learner:{name:order.learnerName??'',email:order.learnerEmail??''},memoStatus:order.status==='scholarship'?'Confirmed through scholarship':order.status==='free'?'Confirmed — free course':order.status==='pending'?'Pending — balance outstanding':order.status.replaceAll('_',' '),items:dto.items.map((item,index)=>({...item,...this.memoFields((order.items??[order])[index])}))};
    }
    private memoFields(item:{scholarshipPercentage?:number;codeReference?:string}){return {scholarshipPercentage:item.scholarshipPercentage,codeReference:item.codeReference};}
    private async orderDto(order:AcademyOrder&{_id?:unknown},session?:ClientSession){
        const completed=['paid','free','scholarship'].includes(order.status),items=[];
        for(const item of order.items??[{courseSlug:order.courseSlug,courseTitle:order.courseTitle,subtotalMinor:order.subtotalMinor,discountMinor:order.discountMinor,finalMinor:order.finalMinor}])items.push({course:{slug:item.courseSlug,title:item.courseTitle},subtotalMinor:item.subtotalMinor,discountMinor:item.discountMinor,finalMinor:item.finalMinor,enrollmentConfirmed:completed&&!!await this.enrollments.exists({userId:order.userId,courseSlug:item.courseSlug,active:true}).session(session??null)});
        return {id:String(order._id),reference:String(order._id),items,enrollmentConfirmed:items.every(item=>item.enrollmentConfirmed),confirmationEmail:{status:'not_sent' as const},course:{slug:order.courseSlug,title:order.courseTitle},currency:order.currency,subtotalMinor:order.subtotalMinor,discountMinor:order.discountMinor,finalMinor:order.finalMinor,status:order.status,expiresAt:order.expiresAt,createdAt:order.createdAt,checkoutUrl:order.status==='pending'?order.checkoutUrl:undefined,paymentAvailable:false};
    }
    private async startCheckout(order:AcademyOrder&{_id:unknown}){
        if(order.checkoutMode==='scholarship'||order.status!=='pending'||order.providerReference)return order;
        try{const checkout=await this.payments.begin({...order,id:String(order._id)}),url=new URL(checkout.checkoutUrl);if(url.protocol!=='https:'||url.username||url.password)throw new ServiceUnavailableException();await this.orders.updateOne({_id:order._id,status:'pending'},{$set:{providerReference:checkout.reference,checkoutUrl:url.href}});}
        catch{await this.transaction(async session=>{const current=await this.orders.findById(order._id).session(session).lean();if(current?.status==='pending')await this.releaseOrder(current,'failed',session);});}
        return (await this.orders.findById(order._id).lean())!;
    }
    private orderId(value:string){if(!/^[a-f0-9]{24}$/.test(value))throw new BadRequestException();return value;}
    private async releaseOrder(order:AcademyOrder&{_id:unknown},status:'cancelled'|'failed'|'expired',session:ClientSession){
        for(const item of order.items??[order])if(item.reservationActive&&item.codeId)await this.codes.updateOne({_id:item.codeId},{$inc:{revision:1}},{session});
        await this.orders.updateOne({_id:order._id},{$set:{status,reservationActive:false,...(order.items?{'items.$[].reservationActive':false}:{})},$unset:{checkoutUrl:''}},{session});
        await this.audits.create([{actor:order.userId,action:`order_${status}`,target:String(order._id)}],{session});
    }
    async createOrder(courseSlug:string,user:AuthIdentity,raw:unknown){
        const o=object(raw,['idempotencyKey','code']),key=text(o.idempotencyKey,80);if(!/^[a-zA-Z0-9_-]{16,80}$/.test(key))throw new BadRequestException();
        const hash=createHash('sha256').update(`${courseSlug}:${o.code===undefined?'':codeHash(o.code)}`).digest('hex');
        const work=async(session:ClientSession)=>{
            const existing=await this.orders.findOne({userId:user.id,idempotencyKey:key}).select('+requestHash').session(session).lean();
            if(existing){if(existing.requestHash!==hash)throw new ConflictException();return existing;}
            if(approvedPreviewPrices.some(course=>course.slug===courseSlug))throw new ConflictException('Illustrative courses cannot be purchased.');
            const course=await this.course(courseSlug,session),settings=await this.settings(courseSlug,session);
            if(await this.enrollments.exists({userId:user.id,courseSlug,active:true}).session(session))throw new ConflictException('Already enrolled.');
            const totals=await this.totals(settings,user,o.code,session),availability=await this.purchaseAvailability(settings);
            if(totals.finalMinor>0&&!availability.eligible)throw new ConflictException('Course content is incomplete or purchases are disabled.');
            await this.touch(courseSlug,session);
            let status:AcademyOrder['status']='pending';
            if(totals.finalMinor===0){
                if(totals.scholarship){await this.redeemInSession(courseSlug,user,o.code,session);status='scholarship';}
                else {if(coursePricing(settings).currentPriceMinor!==0)throw new ForbiddenException();const created=await this.enroll(courseSlug,user.id,'free',session);if(created)await this.audits.create([{actor:user.id,action:'free_enrollment',target:courseSlug}],{session});status='free';}
            }
            const expiresAt=new Date(Math.min(Date.now()+15*60*1000,totals.scholarship?.expiresAt?+totals.scholarship.expiresAt:Infinity));
            const reserve=false;
            const [order]=await this.orders.create([{userId:user.id,...await this.memoSnapshot(user,session),...this.memoCode(totals.scholarship),courseSlug,courseTitle:course.title,currency:'BDT',subtotalMinor:totals.subtotalMinor,discountMinor:totals.discountMinor,finalMinor:totals.finalMinor,currentPriceMinor:coursePricing(settings).currentPriceMinor,status,idempotencyKey:key,requestHash:hash,codeId:totals.scholarship?String(totals.scholarship._id):undefined,reservationActive:reserve,expiresAt,createdAt:new Date()}],{session});
            await this.audits.create([{actor:user.id,action:'order_created',target:String(order._id)}],{session});return order.toObject();
        };
        let order:AcademyOrder&{_id:unknown};
        try{order=await this.transaction(work);}catch(error){if((error as {code?:number})?.code!==11000)throw error;const old=await this.orders.findOne({userId:user.id,idempotencyKey:key}).select('+requestHash').lean();if(!old||old.requestHash!==hash)throw new ConflictException();order=old;}
        return this.orderDto(await this.startCheckout(order));
    }
    async listOrders(user:AuthIdentity){const rows=await this.orders.find({userId:user.id}).sort({createdAt:-1}).limit(50).lean();return Promise.all(rows.map(order=>this.getOrder(String(order._id),user)));}
    async getOrder(id:string,user:AuthIdentity){this.orderId(id);return this.transaction(async session=>{const order=await this.orders.findOne({_id:id,userId:user.id}).session(session).lean();if(!order)throw new NotFoundException();if(order.checkoutMode!=='scholarship'&&order.status==='pending'&&order.expiresAt<=new Date()){await this.releaseOrder(order,'expired',session);order.status='expired';order.reservationActive=false;}return this.orderDto(order,session);});}
    async cancelOrder(id:string,user:AuthIdentity,raw:unknown){object(raw,[]);this.orderId(id);return this.transaction(async session=>{const order=await this.orders.findOne({_id:id,userId:user.id}).session(session).lean();if(!order)throw new NotFoundException();if(['paid','scholarship','free','payment_review'].includes(order.status))throw new ConflictException();if(['pending','blocked'].includes(order.status)){await this.releaseOrder(order,'cancelled',session);order.status='cancelled';}return this.orderDto(order,session);});}
    async refreshPayment(id:string,user:AuthIdentity,raw:unknown){object(raw,[]);this.orderId(id);const order=await this.orders.findOne({_id:id,userId:user.id}).lean();if(!order)throw new NotFoundException();if(order.checkoutMode==='scholarship'||!this.payments.available)throw new ServiceUnavailableException();const event=await this.payments.verifyOrder({...order,id});await this.processVerifiedPayment(event);return this.getOrder(id,user);}
    async processVerifiedPayment(event:VerifiedPayment){
        this.payments.assertVerified(event);
        try{return await this.transaction(async session=>{
            const order=await this.orders.findById(event.orderId).session(session).lean();if(!order)throw new NotFoundException();
            if(order.checkoutMode==='scholarship')throw new ForbiddenException();
            if(order.currency!==event.currency||order.finalMinor!==event.amountMinor||order.providerReference!==event.reference)throw new ForbiddenException();
            const previous=await this.paymentEvents.findOne({eventId:event.eventId}).session(session).lean();if(previous){if(previous.orderId!==event.orderId||previous.status!==event.status)throw new ConflictException();return {duplicate:true};}
            await this.paymentEvents.create([{eventId:event.eventId,orderId:event.orderId,status:event.status}],{session});
            if(['paid','scholarship','free','payment_review'].includes(order.status))return {duplicate:true};
            if(event.status==='pending')return {pending:true};
            if(event.status==='failed'||event.status==='cancelled'){if(order.status==='pending')await this.releaseOrder(order,event.status,session);return {enrolled:false};}
            if(order.items)return this.settleCartPayment(order,session);
            let review=order.status!=='pending'||order.expiresAt<=new Date();
            const course=await this.courses.findOne({slug:order.courseSlug,status:'published',publishedAt:{$lte:new Date()}}).session(session).lean();
            const settings=await this.learning.findOne({slug:order.courseSlug,enabled:true}).session(session).lean();
            const member=await this.db.collection('users').findOne({_id:new (await import('mongoose')).Types.ObjectId(order.userId),enabled:true},{session,projection:{email:1}});
            if(!course||!settings||!member||await this.enrollments.exists({userId:order.userId,courseSlug:order.courseSlug}).session(session))review=true;
            if(order.codeId&&!review){
                try{const quoted=await this.totals({...settings!,priceBDT:undefined,salePriceBDT:undefined,regularPriceMinor:order.subtotalMinor,salePriceMinor:order.currentPriceMinor!<order.subtotalMinor?order.currentPriceMinor:undefined,saleStartsAt:undefined,saleEndsAt:undefined}, {id:order.userId,email:String(member!.email),role:'MEMBER'},undefined,session,{codeId:order.codeId,excludeOrderId:event.orderId});if(!order.reservationActive||quoted.finalMinor!==order.finalMinor||!quoted.scholarship)review=true;}catch(error){if(error instanceof PromoError||error instanceof BadRequestException)review=true;else throw error;}
            }
            if(review){if(order.codeId&&order.reservationActive)await this.codes.updateOne({_id:order.codeId},{$inc:{revision:1}},{session});await this.orders.updateOne({_id:order._id},{$set:{status:'payment_review',reservationActive:false},$unset:{checkoutUrl:''}},{session});await this.audits.create([{actor:order.userId,action:'payment_review_required',target:event.orderId}],{session});return {enrolled:false,review:true};}
            await this.touch(order.courseSlug,session);
            const created=await this.enroll(order.courseSlug,order.userId,'payment',session);
            if(order.codeId){await this.codes.updateOne({_id:order.codeId},{$inc:{redeemed:1,revision:1}},{session});const used=await this.redemptions.exists({codeId:order.codeId,userId:order.userId,courseSlug:order.courseSlug}).session(session);if(!used)await this.redemptions.create([{codeId:order.codeId,userId:order.userId,courseSlug:order.courseSlug,discountMinor:order.discountMinor}],{session});}
            await this.orders.updateOne({_id:order._id},{$set:{status:'paid',reservationActive:false},$unset:{checkoutUrl:''}},{session});
            await this.audits.create([{actor:order.userId,action:'payment_confirmed',target:event.orderId},...(order.codeId?[{actor:order.userId,action:'promo_redemption',target:order.codeId}]:[])],{session,ordered:true});
            if(created)await this.audits.create([{actor:order.userId,action:'payment_enrollment',target:order.courseSlug}],{session});return {enrolled:true};
        });}catch(error){if((error as {code?:number})?.code!==11000)throw error;const prior=await this.paymentEvents.findOne({eventId:event.eventId}).lean();if(prior?.orderId===event.orderId&&prior.status===event.status)return {duplicate:true};throw new ConflictException();}
    }

    async adminConfig(courseSlug: string) {
        await this.adminCourse(courseSlug);
        const course = await this.learning.findOne({
            slug: courseSlug
        }).lean();
        if (!course)
            return null;
        const { _id, __v, slug: courseSlugValue, ...data } = course;
        void _id;
        void __v;
        void courseSlugValue;
        const { priceBDT, salePriceBDT, ...current } = data;
        const positions = new Map(current.modules.flatMap(module => module.lessons).map((lesson, index) => [lesson, index]));
        return { ...current, modules: current.modules.map(module => ({ ...module, lessons: module.lessons.map(lesson => ({ ...lesson, access: this.lessonAccess(lesson, positions.get(lesson)!) })) })), currency: 'BDT', regularPriceMinor: data.regularPriceMinor ?? (priceBDT === undefined ? undefined : legacyMinor(priceBDT)),
            salePriceMinor: data.salePriceMinor ?? (salePriceBDT === undefined ? undefined : legacyMinor(salePriceBDT)) };
    }
    async saveConfig(courseSlug: string, raw: unknown, actor: AuthIdentity) {
        const value = learningInput(raw, courseSlug);
        for(const image of [value.thumbnail,...(value.gallery??[])])if(image?.src.startsWith('media:')){const item=await this.media.detail(image.src.slice(6),actor);if(item.data.resource!=='courses'||item.data.status!=='ready'||!item.data.mimeType.startsWith('image/'))throw new BadRequestException();}
        if(value.purchaseEnabled&&!(await this.purchaseAvailability(value)).eligible)throw new BadRequestException();
        return this.transaction(async (session) => {
            await this.adminCourse(courseSlug, session);
            const old = await this.learning.findOne({
                slug: courseSlug
            }).session(session).lean();
            if ((old?.revision ?? 0) !== value.revision)
                throw new ConflictException();
            await this.learning.replaceOne({
                slug: courseSlug
            }, {
                ...value, revision: value.revision + 1
            }, {
                session, upsert: true
            });
            await this.audits.create([{
                    actor: actor.id, action: 'course_access_configuration', target: courseSlug
                }], {
                session
            });
            return {
                saved: true
            };
        });
    }
    async listCodes() {
        return this.codes.find().select('-codeHash').sort({
            _id: -1
        }).limit(100).lean();
    }
    async generateCodes(raw:unknown,actor:AuthIdentity){
        const input=object(raw,['count','label','courses','anyCourse','kind','amount','amountMinor','startsAt','expiresAt','totalLimit','perAccountLimit','minimumSpendMinor','recipientEmail','idempotencyKey']);
        const {count:requestedCount,idempotencyKey,...settings}=input,count=requestedCount===undefined?1:integer(requestedCount,1,100);
        const key=idempotencyKey===undefined?undefined:text(idempotencyKey,80);if(key&&!/^[a-zA-Z0-9_-]{16,80}$/.test(key))throw new BadRequestException();
        // Preserve prior idempotency keys, including legacy TF- codes. The new
        // random nonce is server-only metadata; only normalized code hashes persist.
        if(key&&count!==1)throw new BadRequestException();
        const secret=this.config.get<string>('ACCOUNT_VERIFICATION_KEY');if(key&&(!secret||!/^[a-f0-9]{64}$/.test(secret)))throw new ServiceUnavailableException();
        const generationHash=createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries({...settings,count}).sort(([a],[b])=>a.localeCompare(b))))).digest('hex');
        const fields='+generationHash +codeHash +generationNonce';
        const prior=(record:Scholarship&{_id:unknown})=>{
            const recovered=record.generationNonce?generateScholarshipCode(secret,JSON.stringify(['academy-scholarship-v2',actor.id,key,record.generationNonce])):`TF-${createHmac('sha256',Buffer.from(secret!,'hex')).update(JSON.stringify(['academy-scholarship-v1',actor.id,key])).digest('hex').slice(0,48).toUpperCase()}`;
            if(record.generationHash!==generationHash||record.codeHash!==codeHash(recovered))throw new ConflictException();
            const immediate=record.generatedAt&&Date.now()-+record.generatedAt<=15*60*1000;
            return {codes:immediate?[{id:String(record._id),code:recovered}]:[],ids:[String(record._id)],count:1,retried:true,plaintextUnavailable:!immediate};
        };
        const old=key?await this.codes.findOne({generationActor:actor.id,generationKey:key}).select(fields).lean():undefined;if(old)return prior(old);
        const startsAt=settings.startsAt??new Date().toISOString();settings.anyCourse=settings.anyCourse??(!Array.isArray(settings.courses)||settings.courses.length===0);
        for(let attempt=0;attempt<24;attempt++){
            const nonce=key?randomBytes(16).toString('hex'):undefined;
            const generated=Array.from({length:count},()=>generateScholarshipCode(key?secret:undefined,key?JSON.stringify(['academy-scholarship-v2',actor.id,key,nonce]):undefined));
            const values=generated.map(code=>scholarshipInput({...settings,label:settings.label??'100% Academy scholarship',kind:settings.kind??'full',...(settings.kind===undefined||settings.kind==='full'?{amount:settings.amount??0}:{}),startsAt,totalLimit:settings.totalLimit??1,perAccountLimit:settings.perAccountLimit??1,active:true,revision:0,code}));
            if(values.some(value=>value.expiresAt&&value.expiresAt<=new Date()||value.perAccountLimit>value.totalLimit))throw new BadRequestException();
            try{return await this.transaction(async(session:ClientSession)=>{
                if(key){const existing=await this.codes.findOne({generationActor:actor.id,generationKey:key}).select(fields).session(session).lean();if(existing)return prior(existing);}
                for(const courseSlug of values[0].courses)await this.course(courseSlug,session);
                const codes=await this.codes.create(values.map(value=>({...value,...(key?{generationActor:actor.id,generationKey:key,generationHash,generationNonce:nonce,generatedAt:new Date()}:{}),redeemed:0,revision:1})),{session,ordered:true});
                await this.audits.create(codes.map(code=>({actor:actor.id,action:'scholarship_generate',target:String(code._id)})),{session,ordered:true});
                return {codes:codes.map((code,index)=>({id:String(code._id),code:generated[index]})),count};
            });}catch(error){
                if((error as {code?:number})?.code!==11000)throw error;
                if(key){const existing=await this.codes.findOne({generationActor:actor.id,generationKey:key}).select(fields).lean();if(existing)return prior(existing);}
                // A normalized-hash collision rolls back the entire batch. Retry
                // with fresh entropy; never update or replace the conflicting row.
            }
        }
        throw new ServiceUnavailableException();
    }

    private cartIds(raw:unknown){const input=object(raw,['courseSlugs']),ids=strings(input.courseSlugs,50).map(slug);return [...new Set(ids)];}
    async getCart(user:AuthIdentity){const cart=await this.carts.findOne({userId:user.id}).lean();const enrolled=await this.enrollments.distinct('courseSlug',{userId:user.id,active:true});return {courseSlugs:(cart?.courseSlugs??[]).filter(id=>!enrolled.includes(id))};}
    async mergeCart(user:AuthIdentity,raw:unknown){
        const incoming=this.cartIds(raw);const work=async(session:ClientSession)=>{const existing=await this.carts.findOne({userId:user.id}).session(session).lean();const enrolled=await this.enrollments.distinct('courseSlug',{userId:user.id,active:true}).session(session);const courseSlugs=[...new Set([...(existing?.courseSlugs??[]),...incoming])].filter(id=>!enrolled.includes(id));if(courseSlugs.length>50)throw new BadRequestException();await this.carts.updateOne({userId:user.id},{$set:{courseSlugs}},{session,upsert:true});return {courseSlugs};};
        try{return await this.transaction(work);}catch(error){if((error as {code?:number})?.code!==11000)throw error;return this.transaction(work);}
    }
    async removeCartItem(user:AuthIdentity,courseSlug:string,raw:unknown){object(raw,[]);slug(courseSlug);await this.carts.updateOne({userId:user.id},{$pull:{courseSlugs:courseSlug}});return this.getCart(user);}
    private cartItems(raw:unknown){const input=object(raw,['items']);if(!Array.isArray(input.items)||!input.items.length||input.items.length>50)throw new BadRequestException();const items=input.items.map(rawItem=>{const item=object(rawItem,['courseSlug','code']);return {courseSlug:slug(item.courseSlug),...(item.code===undefined?{}:{code:item.code})};});if(new Set(items.map(item=>item.courseSlug)).size!==items.length)throw new BadRequestException();return items.sort((a,b)=>a.courseSlug.localeCompare(b.courseSlug));}
    private rowFailure(courseSlug:string,error:HttpException){return new CartCourseError(courseSlug,error);}
    async cartQuote(raw:unknown,user?:AuthIdentity,guest=false){
        const items=guest?this.cartIds(raw).map(courseSlug=>({courseSlug,code:undefined})):this.cartItems(raw);
        const rows=[];let valid=true,subtotalMinor=0,discountMinor=0,finalMinor=0;
        for(const item of items){let base:Awaited<ReturnType<typeof this.commerceSummary>>|undefined,thumbnail:{src:string;alt:string}|undefined;try{
            const summary=await this.commerceSummary(item.courseSlug,user);base=summary;
            let quote=summary.quote;
            const config=await this.learning.findOne({slug:item.courseSlug}).lean();
            const course=await this.courses.findOne({slug:item.courseSlug,status:'published',publishedAt:{$lte:new Date()}}).lean();const image=course?.media?.find(media=>media.type==='image'&&media.url);
            thumbnail=(await this.courseImage(config?.thumbnail))??(image?{src:image.url!,alt:image.altText}:undefined);
            if(item.code!==undefined){if(!user||!summary.canApplyCode)throw new PromoError('PROMO_INELIGIBLE');quote=await this.quote(item.courseSlug,user,{code:item.code});}
            rows.push({...summary,thumbnail,quote});if(!quote)valid=false;else{subtotalMinor+=quote.subtotalMinor;discountMinor+=quote.discountMinor;finalMinor+=quote.finalMinor;}
        }catch(error){if(!(error instanceof HttpException))throw error;valid=false;const row=this.rowFailure(item.courseSlug,error);rows.push({...base??{course:{slug:item.courseSlug,title:'Course unavailable',illustrative:false},enrolled:false,canApplyCode:false},thumbnail,quote:null,error:{code:row.code,message:row.message}});}}
        return {rows,valid,currency:'BDT',totals:valid?{subtotalMinor,discountMinor,finalMinor}:null,paymentAvailable:false};
    }
    private async plannedCodeCapacity(items:AcademyOrderItem[],userId:string,session:ClientSession,excludeOrderId?:string){
        const planned=new Map<string,number>();for(const item of items)if(item.codeId)planned.set(item.codeId,(planned.get(item.codeId)??0)+1);
        for(const [codeId,count] of planned){const code=await this.codes.findById(codeId).session(session).lean();if(!code)throw new PromoError('PROMO_INVALID');if(code.redeemed+await this.reservationCount(codeId,new Date(),session,excludeOrderId)+count>code.totalLimit)throw new PromoError('PROMO_EXHAUSTED');const used=await this.redemptions.countDocuments({codeId,userId}).session(session);if(used+await this.reservationCount(codeId,new Date(),session,excludeOrderId,userId)+count>code.perAccountLimit)throw new PromoError('PROMO_ACCOUNT_LIMIT');}
    }
    async createCartOrder(user:AuthIdentity,raw:unknown){
        const input=object(raw,['items','idempotencyKey']),items=this.cartItems({items:input.items}),key=text(input.idempotencyKey,80);if(!/^[a-zA-Z0-9_-]{16,80}$/.test(key))throw new BadRequestException();
        const requestHash=createHash('sha256').update('cart:'+JSON.stringify(items.map(item=>{try{return {courseSlug:item.courseSlug,codeHash:item.code===undefined?'':codeHash(item.code)};}catch(error){if(error instanceof HttpException)throw this.rowFailure(item.courseSlug,new PromoError('PROMO_INVALID'));throw error;}}))).digest('hex');
        const work=async(session:ClientSession)=>{
            const existing=await this.orders.findOne({userId:user.id,idempotencyKey:key}).select('+requestHash').session(session).lean();if(existing){if(existing.requestHash!==requestHash)throw new ConflictException();return existing;}
            const cart=await this.carts.findOne({userId:user.id}).session(session).lean(),lines:AcademyOrderItem[]=[];let expiresAt=new Date(Date.now()+15*60*1000);
            for(const item of items){try{
                if(!cart?.courseSlugs.includes(item.courseSlug))throw new ConflictException();if(approvedPreviewPrices.some(course=>course.slug===item.courseSlug))throw new ConflictException();
                const course=await this.course(item.courseSlug,session),settings=await this.settings(item.courseSlug,session);if(await this.enrollments.exists({userId:user.id,courseSlug:item.courseSlug}).session(session))throw new ConflictException();
                const totals=await this.totals(settings,user,item.code,session);if(totals.finalMinor>0&&!(await this.purchaseAvailability(settings)).eligible)throw new ConflictException();
                if(totals.scholarship?.expiresAt&&totals.scholarship.expiresAt<expiresAt)expiresAt=totals.scholarship.expiresAt;
                lines.push({...this.memoCode(totals.scholarship),courseSlug:item.courseSlug,courseTitle:course.title!,subtotalMinor:totals.subtotalMinor,discountMinor:totals.discountMinor,finalMinor:totals.finalMinor,currentPriceMinor:coursePricing(settings).currentPriceMinor!,codeId:totals.scholarship?String(totals.scholarship._id):undefined,reservationActive:false});
            }catch(error){if(error instanceof HttpException)throw this.rowFailure(item.courseSlug,error);throw error;}}
            const subtotalMinor=lines.reduce((sum,item)=>sum+item.subtotalMinor,0),discountMinor=lines.reduce((sum,item)=>sum+item.discountMinor,0),finalMinor=lines.reduce((sum,item)=>sum+item.finalMinor,0);
            let status:AcademyOrder['status']='pending';
            if(finalMinor===0){for(const [index,item] of items.entries()){try{const line=lines[index];if(line.codeId)await this.redeemInSession(item.courseSlug,user,item.code,session);else{const created=await this.enroll(item.courseSlug,user.id,'free',session);if(created)await this.audits.create([{actor:user.id,action:'free_enrollment',target:item.courseSlug}],{session});}await this.touch(item.courseSlug,session);}catch(error){if(error instanceof HttpException)throw this.rowFailure(item.courseSlug,error);throw error;}}status=lines.some(item=>item.codeId)?'scholarship':'free';}
            const [order]=await this.orders.create([{userId:user.id,...await this.memoSnapshot(user,session),courseSlug:lines[0].courseSlug,courseTitle:lines.length===1?lines[0].courseTitle:`Academy order (${lines.length} courses)`,items:lines,currency:'BDT',subtotalMinor,discountMinor,finalMinor,status,idempotencyKey:key,requestHash,expiresAt,reservationActive:false}],{session});
            if(finalMinor===0)await this.carts.updateOne({userId:user.id},{$pull:{courseSlugs:{$in:lines.map(line=>line.courseSlug)}}},{session});
            await this.audits.create([{actor:user.id,action:'cart_order_created',target:String(order._id)}],{session});return order.toObject();
        };
        let order:AcademyOrder&{_id:unknown};try{order=await this.transaction(work);}catch(error){if((error as {code?:number})?.code!==11000)throw error;const old=await this.orders.findOne({userId:user.id,idempotencyKey:key}).select('+requestHash').lean();if(!old||old.requestHash!==requestHash)throw new ConflictException();order=old;}
        return this.orderDto(await this.startCheckout(order));
    }
    private async cartPaymentReview(order:AcademyOrder&{_id:unknown},session:ClientSession){for(const item of order.items??[])if(item.reservationActive&&item.codeId)await this.codes.updateOne({_id:item.codeId},{$inc:{revision:1}},{session});await this.orders.updateOne({_id:order._id},{$set:{status:'payment_review','items.$[].reservationActive':false},$unset:{checkoutUrl:''}},{session});await this.audits.create([{actor:order.userId,action:'payment_review_required',target:String(order._id)}],{session});return {enrolled:false,review:true};}
    private async settleCartPayment(order:AcademyOrder&{_id:unknown},session:ClientSession){
        const items=order.items!,member=await this.db.collection('users').findOne({_id:new (await import('mongoose')).Types.ObjectId(order.userId),enabled:true},{session,projection:{email:1}});
        if(!member||order.status!=='pending'||order.expiresAt<=new Date())return this.cartPaymentReview(order,session);
        try{for(const item of items){await this.course(item.courseSlug,session);const settings=await this.settings(item.courseSlug,session);if(await this.enrollments.exists({userId:order.userId,courseSlug:item.courseSlug}).session(session))throw new ConflictException();if(item.codeId){const quote=await this.totals({...settings,priceBDT:undefined,salePriceBDT:undefined,regularPriceMinor:item.subtotalMinor,salePriceMinor:item.currentPriceMinor<item.subtotalMinor?item.currentPriceMinor:undefined,saleStartsAt:undefined,saleEndsAt:undefined},{id:order.userId,email:String(member.email),role:'MEMBER'},undefined,session,{codeId:item.codeId,excludeOrderId:String(order._id)});if(!item.reservationActive||quote.finalMinor!==item.finalMinor)throw new ConflictException();}}await this.plannedCodeCapacity(items,order.userId,session,String(order._id));}catch(error){if(error instanceof HttpException)return this.cartPaymentReview(order,session);throw error;}
        for(const item of items){await this.touch(item.courseSlug,session);const created=await this.enroll(item.courseSlug,order.userId,item.finalMinor===0?(item.codeId?'scholarship':'free'):'payment',session);if(item.codeId){await this.codes.updateOne({_id:item.codeId},{$inc:{redeemed:1,revision:1}},{session});await this.redemptions.create([{codeId:item.codeId,userId:order.userId,courseSlug:item.courseSlug,discountMinor:item.discountMinor}],{session});await this.audits.create([{actor:order.userId,action:'promo_redemption',target:item.codeId}],{session});}if(created)await this.audits.create([{actor:order.userId,action:'payment_enrollment',target:item.courseSlug}],{session});}
        await this.orders.updateOne({_id:order._id},{$set:{status:'paid','items.$[].reservationActive':false},$unset:{checkoutUrl:''}},{session});await this.carts.updateOne({userId:order.userId},{$pull:{courseSlugs:{$in:items.map(item=>item.courseSlug)}}},{session});await this.audits.create([{actor:order.userId,action:'payment_confirmed',target:String(order._id)}],{session});return {enrolled:true};
    }

    async myLearning(user:AuthIdentity){
        const enrolled=await this.enrollments.find({userId:user.id,active:true}).sort({createdAt:-1}).limit(100).lean();
        const result=[];
        for(const enrollment of enrolled){
            const course=await this.courses.findOne({slug:enrollment.courseSlug,status:'published',publishedAt:{$lte:new Date()}}).lean();
            if(!course)continue;
            const configured=!!await this.learning.exists({slug:enrollment.courseSlug,enabled:true});
            result.push({course:{slug:enrollment.courseSlug,title:course.title},enrolledAt:enrollment.createdAt,configured});
        }
        return result;
    }
    async saveCode(raw: unknown, actor: AuthIdentity, id?: string) {
        const value = scholarshipInput(raw);
        return this.transaction(async (session) => {
            for (const courseSlug of value.courses)
                await this.course(courseSlug, session);
            let code;
            if (id) {
                if (!/^[a-f0-9]{24}$/.test(id))
                    throw new BadRequestException();
                const old = await this.codes.findById(id).select('+codeHash +generationActor +generationKey +generationHash +generationNonce +generatedAt').session(session).lean();
                if (!old || old.revision !== value.revision)
                    throw new ConflictException();
                if (value.codeHash !== old.codeHash || value.totalLimit < old.redeemed)
                    throw new BadRequestException();
                code = await this.codes.findOneAndReplace({
                    _id: id
                }, {
                    ...value, generationActor:old.generationActor,generationKey:old.generationKey,generationHash:old.generationHash,generationNonce:old.generationNonce,generatedAt:old.generatedAt,redeemed: old.redeemed, revision: old.revision + 1
                }, {
                    session, returnDocument: 'after'
                });
            }
            else {
                if (value.revision !== 0)
                    throw new BadRequestException();
                [code] = await this.codes.create([{
                        ...value, redeemed: 0, revision: 1
                    }], {
                    session
                });
            }
            await this.audits.create([{
                    actor: actor.id, action: id ? 'scholarship_update' : 'scholarship_create', target: String(code!._id)
                }], {
                session
            });
            return {
                id: String(code!._id)
            };
        });
    }
    async codeState(id: string, raw: unknown, actor: AuthIdentity) {
        if (!/^[a-f0-9]{24}$/.test(id))
            throw new BadRequestException();
        const o = object(raw, ['active']);
        const active = flag(o.active);
        return this.transaction(async (session) => {
            const code = await this.codes.findByIdAndUpdate(id, {
                $set: {
                    active
                }, $inc: {
                    revision: 1
                }
            }, {
                session, returnDocument: 'after'
            });
            if (!code)
                throw new NotFoundException();
            await this.audits.create([{
                    actor: actor.id, action: active ? 'scholarship_activate' : 'scholarship_revoke', target: id
                }], {
                session
            });
            return {
                saved: true
            };
        });
    }
    async adminEnrollment(courseSlug: string, raw: unknown, actor: AuthIdentity) {
        const o = object(raw, ['userId', 'active', 'reason']);
        const reason=text(o.reason,2000);
        const userId = text(o.userId, 24);
        if (!/^[a-f0-9]{24}$/.test(userId))
            throw new BadRequestException();
        const active = flag(o.active);
        return this.transaction(async (session) => {
            await this.course(courseSlug, session);
            await this.settings(courseSlug, session);
            if (!await this.db.collection('users').findOne({
                _id: new (await import('mongoose')).Types.ObjectId(userId), enabled: true
            }, {
                session, projection: {
                    _id: 1
                }
            }))
                throw new NotFoundException();
            await this.touch(courseSlug, session);
            await this.enrollments.updateOne({
                userId, courseSlug
            }, {
                $set: {
                    active
                }, $setOnInsert: {
                    source: 'admin', createdAt: new Date()
                }
            }, {
                session, upsert: true
            });
            await this.audits.create([{
                    actor: actor.id, action: active ? 'admin_enrollment_grant' : 'admin_enrollment_revoke', target: `${courseSlug}:${userId}`, reason
                }], {
                session
            });
            return {
                saved: true
            };
        });
    }
}
