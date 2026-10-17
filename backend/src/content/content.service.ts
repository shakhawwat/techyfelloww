import type { LearningCourse } from "../academy/academy.schemas";
import { MediaService } from "../media/media.service";
import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { ContentKind, ContentRecord, PublicListDto } from "./content.types";
import { slugPattern } from "./content.schemas";
import { parsePublicQuery } from "./public-query";
import { publicProjection, toPublicDto } from "./public-dto";

@Injectable()
export class ContentService {
  constructor(
    private readonly media: MediaService,
    @InjectModel("LearningCourse") private readonly learning: Model<LearningCourse>,
    @InjectModel("PageContent") private readonly pages: Model<ContentRecord>,
    @InjectModel("Product") private readonly products: Model<ContentRecord>,
    @InjectModel("Project") private readonly projects: Model<ContentRecord>,
    @InjectModel("ResearchProject") private readonly research: Model<ContentRecord>,
    @InjectModel("Publication") private readonly publications: Model<ContentRecord>,
    @InjectModel("TeamMember") private readonly team: Model<ContentRecord>,
    @InjectModel("Course") private readonly courses: Model<ContentRecord>,
  ) {}
  private async resolveSections(dto:object,record:ContentRecord){
    const sections=(record.sections??[]) as {key:string;image?:string;alt?:string}[];
    const resolved=await Promise.all(sections.map(async section=>{if(!section.image?.startsWith('media:'))return section;const images=await this.media.publicImages([{reference:section.image.slice(6),type:'image',altText:section.alt??'Image'}],'pages');return {...section,image:images[0]?.url};}));
    Object.assign(dto,{sections:resolved});
  }
  private async courseMetadata(dto:object,record:ContentRecord){
    // Only marketing metadata and curriculum outlines; never project lesson content or storage keys.
    const config=await this.learning.findOne({slug:record.slug,enabled:true}).select('category description audience outcomes tools instructor thumbnail gallery modules.title modules.lessons.title modules.lessons.type modules.lessons.access previewVideoUrl').maxTimeMS(1500).lean().exec();
    if(!config)return;
    const assets=[...(config.thumbnail?[config.thumbnail]:[]),...(config.gallery??[])];
    const references=assets.filter(image=>image.src.startsWith('media:')).map(image=>({reference:image.src.slice(6),type:'image' as const,altText:image.alt}));
    const images=await this.media.publicImages(references,'courses');
    const introduction=config.modules?.[0]?.lessons?.[0];
    const previewVideoUrl=introduction?.type==='video'&&introduction.access==='public'?config.previewVideoUrl:undefined;
    Object.assign(dto,{previewVideoUrl,category:config.category,description:config.description,audience:config.audience,outcomes:config.outcomes,tools:config.tools,instructor:config.instructor,media:images,thumbnail:config.thumbnail?.src.startsWith('/banner/')?config.thumbnail:undefined,...(config.modules?.length?{syllabus:config.modules.map(module=>({title:module.title,topics:module.lessons.map(lesson=>lesson.title)}))}:{})});
  }
  private model(kind: ContentKind) { return this[kind]; }

  async list(kind: ContentKind, raw: Record<string, unknown>): Promise<PublicListDto> {
    const { page, limit, skip, sort, filter } = parsePublicQuery(kind, raw);
    const model = this.model(kind);
    try {
      const [records, total] = await Promise.all([
        model.find(filter).select(publicProjection(kind)).sort(sort).skip(skip).limit(limit).maxTimeMS(1500).lean<ContentRecord[]>().exec(),
        model.countDocuments(filter).maxTimeMS(1500).exec(),
      ]);
      return { data: await Promise.all(records.map(async record => { const dto = toPublicDto(kind, record); if(record.media&&kind!=="courses")Object.assign(dto,{media:await this.media.publicImages(record.media,kind)});
        if(kind==="pages")await this.resolveSections(dto,record); if(kind==="courses")await this.courseMetadata(dto,record); return dto; })), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    } catch {
      throw new ServiceUnavailableException();
    }
  }

  async detail(kind: ContentKind, slug: string, query: Record<string, unknown>) {
    if (Object.keys(query).length) throw new BadRequestException();
    if (slug.length > 160 || !slugPattern.test(slug)) throw new NotFoundException();
    let record: ContentRecord | null;
    try {
      record = await this.model(kind).findOne({ slug, status: "published", publishedAt: { $lte: new Date() } })
        .select(publicProjection(kind)).maxTimeMS(1500).lean<ContentRecord>().exec();
    } catch {
      throw new ServiceUnavailableException();
    }
    if (!record) throw new NotFoundException();
    const dto = toPublicDto(kind, record);
    if(record.media&&kind!=="courses") {try{Object.assign(dto,{media:await this.media.publicImages(record.media,kind)});}catch{throw new ServiceUnavailableException();}}
    if(kind==="courses"){try{await this.courseMetadata(dto,record);}catch{throw new ServiceUnavailableException();}}
    if(kind==="pages")await this.resolveSections(dto,record);
    return { data: dto };
  }
}
