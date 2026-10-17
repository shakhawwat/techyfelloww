import {parseAcademyVideo} from "../academy/academy-video";
import {contentDefinitions} from "../content/content.schemas";
import { MediaService } from "../media/media.service";
import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Error as MongooseError, Model, Types, type ClientSession } from "mongoose";
import { hasIdentityPermission } from "../auth/permissions";
import type { AuthIdentity } from "../auth/auth-http";
import type { ContentKind, ContentRecord } from "../content/content.types";
import { parseAdminQuery } from "./admin-query";
import { parseAction, parseContentInput, toAdminDto } from "./content-input";
import type { ContentAction, ContentAuditRecord } from "./content-audit.schema";

@Injectable()
export class AdminContentService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly media: MediaService,
    @InjectModel("PageContent") private readonly pages: Model<ContentRecord>,
    @InjectModel("Product") private readonly products: Model<ContentRecord>,
    @InjectModel("Project") private readonly projects: Model<ContentRecord>,
    @InjectModel("ResearchProject") private readonly research: Model<ContentRecord>,
    @InjectModel("Publication") private readonly publications: Model<ContentRecord>,
    @InjectModel("TeamMember") private readonly team: Model<ContentRecord>,
    @InjectModel("Course") private readonly courses: Model<ContentRecord>,
    @InjectModel("ContentAudit") private readonly audits: Model<ContentAuditRecord>,
  ) {}
  private async transaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await this.connection.startSession();
    try {
      return await session.withTransaction(work, { readPreference: "primary", readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" }, maxCommitTimeMS: 1500, timeoutMS: 5000 });
    } finally { await session.endSession(); }
  }
  private async validateEditorial(kind:ContentKind,document:ContentRecord,session:ClientSession){
    if(document.videoInput)document.videoInput=parseAcademyVideo(document.videoInput);
    await this.media.validateReferences(document.media,session,kind);
    if(kind==='pages'&&document.pageType==='homepage'&&document.slug!=='homepage')throw new BadRequestException({fields:['slug']});
    if(kind==='pages'&&document.pageType&&document.pageType!=='homepage'&&document.slug!==document.pageType&&!document.slug.startsWith(`${document.pageType}-`))throw new BadRequestException({fields:['slug']});
    const sections=(document.sections??[]) as {key:string;image?:string;alt?:string}[];
    if(document.pageType==='homepage'&&sections.some(section=>!['hero','audience','solutions','projects','research','support','consulting','institutional','academy','mentorship-store','mentorship','store','company','inquiry',...Array.from({length:3},(_,i)=>`audience-${i+1}`),...Array.from({length:6},(_,i)=>`solution-${i+1}`),...Array.from({length:3},(_,i)=>`hero-${i+1}`),...Array.from({length:3},(_,i)=>`consulting-${i+1}`),...Array.from({length:13},(_,i)=>`institutional-${i+1}`)].includes(section.key)))throw new BadRequestException({fields:['sections']});
    if(new Set(sections.map(section=>section.key)).size!==sections.length)throw new BadRequestException({fields:['sections']});
    for(const section of sections){if(section.image?.startsWith('media:'))await this.media.validateReferences([{reference:section.image.slice(6),type:'image',altText:section.alt??''}],session,kind);}
    if(kind==='products'){
      if(document.compareAtMinor!==undefined&&(document.priceMinor===undefined||document.compareAtMinor<=document.priceMinor))throw new BadRequestException({fields:['compareAtMinor']});
      if(document.categorySlug&&!await this.connection.collection('store_categories').findOne({slug:document.categorySlug},{session}))throw new BadRequestException({fields:['categorySlug']});
      if(document.orderable&&(!document.sku||!document.categorySlug||!Number.isSafeInteger(document.priceMinor)||document.priceMinor!<=0||document.priceMinor!>10000000000||!Number.isSafeInteger(document.stockQuantity)))throw new BadRequestException({fields:['sku','categorySlug','priceMinor','stockQuantity']});
      if(document.importProvenance&&document.orderable)throw new BadRequestException({fields:['orderable']});
    }
    if(document.status!=='published')return;
    if(document.importProvenance&&!document.reviewedForPublication)throw new BadRequestException({fields:["reviewedForPublication"]});
    if(kind==='pages'){
      const targets={solutions:['solutions','solutions-robotics','solutions-iot-embedded','solutions-ai-vision','solutions-automation','solutions-prototyping'],consulting:['consulting','consulting-capstone','consulting-research','consulting-startup'],institutional:['institutional','institutional-schools','institutional-universities','institutional-industry'],homepage:['homepage'],about:['about'],contact:['contact'],academy:['academy'],company:['company'],projects:['projects'],research:['research'],publications:['publications'],team:['team'],store:['store']};
      if(!document.pageType||!targets[document.pageType].includes(document.slug)&&!(document.pageType==='institutional'&&document.slug.startsWith('institutional-program-')))throw new BadRequestException({fields:['slug']});
    }
    if(document.metrics?.some(metric=>metric.verified&&metric.year>new Date().getUTCFullYear()))throw new BadRequestException({fields:['metrics']});
    const references=[...((document.featured??[]) as {kind:ContentKind;slug:string}[]),...((document.mentorSlugs??[]) as string[]).map(slug=>({kind:'team' as const,slug}))];
    if(kind==='research')for(const person of document.contributors??[])if(person.teamSlug)references.push({kind:'team',slug:person.teamSlug});
    if(kind==='products'&&document.relatedCourse)references.push({kind:'courses',slug:String(document.relatedCourse)});
    for(const ref of references){if(!contentDefinitions[ref.kind]||!await this.model(ref.kind).exists({slug:ref.slug,status:'published',publishedAt:{$lte:new Date()}}).session(session))throw new BadRequestException({fields:['featured']});}
  }
  private model(kind: ContentKind) { return this[kind]; }
  private id(value: string): Types.ObjectId {
    if (!/^[a-fA-F0-9]{24}$/.test(value)) throw new BadRequestException({ fields: ["id"] });
    return new Types.ObjectId(value);
  }
  private authorize(kind: ContentKind, actor: AuthIdentity, action: "read" | "edit" | "publish"): void {
    if (!hasIdentityPermission(actor, `${kind}:${action}`)) throw new ForbiddenException();
  }
  private failure(error: unknown): never {
    if (error instanceof HttpException) throw error;
    if (error instanceof MongooseError.ValidationError) {
      // Only schema-defined validation paths, never invalid values/driver messages.
      throw new BadRequestException({ fields: Object.keys(error.errors).filter(path => /^[a-zA-Z]+(?:\.(?:\d+|[a-zA-Z]+))*$/.test(path)).sort() });
    }
    if (error instanceof Error && "code" in error && error.code === 11000) throw new ConflictException();
    throw new ServiceUnavailableException();
  }
  async list(kind: ContentKind, raw: Record<string, unknown>, actor: AuthIdentity) {
    this.authorize(kind, actor, "read");
    const { page, limit, skip, sort, filter } = parseAdminQuery(kind, raw);
    try {
      const [records, total] = await Promise.all([
        this.model(kind).find(filter).sort(sort).skip(skip).limit(limit).maxTimeMS(1500).lean<Record<string, unknown>[]>().exec(),
        this.model(kind).countDocuments(filter).maxTimeMS(1500).exec(),
      ]);
      return { data: records.map(record => toAdminDto(kind, record)), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    } catch (error) { return this.failure(error); }
  }
  async detail(kind: ContentKind, value: string, actor: AuthIdentity) {
    this.authorize(kind, actor, "read");
    const id = this.id(value);
    try {
      const record = await this.model(kind).findById(id).maxTimeMS(1500).lean<Record<string, unknown>>().exec();
      if (!record) throw new NotFoundException();
      return { data: toAdminDto(kind, record) };
    } catch (error) { return this.failure(error); }
  }
  async create(kind: ContentKind, body: unknown, actor: AuthIdentity) {
    this.authorize(kind, actor, "edit");
    const { changes } = parseContentInput(kind, body, false);
    try {
      return await this.transaction(async session => {
        const document = new (this.model(kind))({ ...changes, status: "draft", revision: 1 });
        await this.validateEditorial(kind,document,session);
        await document.save({ session });
        await this.audits.create([{ actor: new Types.ObjectId(actor.id), action: "create", resource: kind, contentId: document._id, revision: 1 }], { session });
        return { data: toAdminDto(kind, document.toObject()) };
      });
    } catch (error) { return this.failure(error); }
  }
  async mutate(kind: ContentKind, value: string, action: Exclude<ContentAction, "create">, body: unknown, actor: AuthIdentity, beforeWrite?: (course:ContentRecord,session:ClientSession)=>Promise<void>) {
    this.authorize(kind, actor, action === "publish" || action === "unpublish" ? "publish" : "edit");
    const id = this.id(value);
    const input = action === "edit" ? parseContentInput(kind, body, true) : parseAction(body, action === "publish");
    const expected = input.revision!;
    try {
      return await this.transaction(async session => {
        const document = await this.model(kind).findById(id).session(session).maxTimeMS(1500).exec();
        if (!document) throw new NotFoundException();
        const revision = document.revision ?? 1;
        if (document.status === "published" && (action === "edit" || action === "archive")) this.authorize(kind, actor, "publish");
        if (revision !== expected) throw new ConflictException();
        if (document.status === "archived" || (action === "publish" && document.status !== "draft") || (action === "unpublish" && document.status !== "published")) throw new ConflictException();
        const set: Record<string, unknown> = { revision: expected + 1 };
        const unset: Record<string, 1> = {};
        if (action === "edit" && "changes" in input) {
          if(kind==='courses'&&input.changes.slug!==undefined&&input.changes.slug!==document.slug){
            const linked=await Promise.all(['academy_learning_courses','academy_enrollments','academy_orders'].map(collection=>this.connection.db!.collection(collection).findOne({$or:[{slug:document.slug},{courseSlug:document.slug},{'items.courseSlug':document.slug}]},{session,projection:{_id:1}})));
            if(linked.some(Boolean))throw new ConflictException();
          }
          for (const [key, val] of Object.entries(input.changes)) {
            if (val === null) { document.set(key, undefined); unset[key] = 1; }
            else { document.set(key, val); set[key] = val; }
          }
        } else if (action === "publish") {
          document.status = "published";
          document.publishedAt = "publishedAt" in input && input.publishedAt ? input.publishedAt : new Date();
          set.status = document.status; set.publishedAt = document.publishedAt;
        } else if (action === "unpublish") {
          document.status = "draft"; document.publishedAt = undefined;
          set.status = "draft"; unset.publishedAt = 1;
        } else if (action === "archive") {
          document.status = "archived"; set.status = "archived";
        }
        document.revision = expected + 1;
        // Validate the complete candidate, including publication-only requirements, before writing.
        await document.validate();
        if(beforeWrite)await beforeWrite(document,session);
        if(action==="edit"||action==="publish")await this.validateEditorial(kind,document,session);
        if(document.videoInput)set.videoInput=document.videoInput;
        const precondition = expected === 1 ? { $or: [{ revision: expected }, { revision: { $exists: false } }] } : { revision: expected };
        const updated = await this.model(kind).findOneAndUpdate({ _id: id, ...precondition },
          { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { session, new: true })
          .maxTimeMS(1500).lean<Record<string, unknown>>().exec();
        if (!updated) throw new ConflictException();
        await this.audits.create([{ actor: new Types.ObjectId(actor.id), action, resource: kind, contentId: id, revision: expected + 1 }], { session });
        return { data: toAdminDto(kind, updated) };
      });
    } catch (error) { return this.failure(error); }
  }
}
