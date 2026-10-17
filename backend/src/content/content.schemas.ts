import { Schema, type SchemaDefinition } from "mongoose";
import type { ContentKind, ContentRecord } from "./content.types";

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const researchStages = ["planned", "active", "paused", "completed"] as const;
export const courseLevels = ["beginner", "intermediate", "advanced"] as const;
export const deliveryModes = ["self-paced", "live-online", "in-person", "hybrid"] as const;
export function isPublicUrl(value: string): boolean {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
  catch { return false; }
}
function publicationRequired(this: ContentRecord): boolean { return this.status === "published"; }
const publicationText = (max = 10000) => ({ type: String, required: publicationRequired, trim: true, maxlength: max });
const text = (max = 10000) => ({ type: String, required: true, trim: true, maxlength: max });
const strings = { type: [{ type: String, trim: true, maxlength: 500 }], default: [] };
const url = { type: String, validate: isPublicUrl, maxlength: 2048 };
const safeHref = { type: String, maxlength: 2048, validate: (value:string) => /^(?:\/(?!\/)|#[a-zA-Z])/.test(value) && !/[\\<>\s]/.test(value) || isPublicUrl(value) };
const nested = { _id: false, strict: true } as const;
const seo = new Schema({ title: { type: String, maxlength: 160 }, description: { type: String, maxlength: 320 }, canonicalUrl: url }, nested);
const media = new Schema({ reference: text(500), type: { type: String, enum: ["image", "video", "document"], required: true }, altText: text(500) }, nested);
const contributor = new Schema({ name: text(160), teamSlug: { type: String, match: slugPattern, maxlength: 160 } }, nested);
const link = new Schema({ label: text(160), url: { ...url, required: true }, approved: { type: Boolean, default: false } }, nested);
const reference = new Schema({kind:{type:String,enum:['projects','research','publications','team','courses'],required:true},slug:{...text(160),match:slugPattern}},nested);
const section = new Schema({key:text(160),title:{type:String,maxlength:200},description:{type:String,maxlength:20000},label:{type:String,maxlength:200},cta:{type:String,maxlength:200},href:safeHref,visible:{type:Boolean,default:true},image:{type:String,maxlength:2048},mobileImage:{type:String,maxlength:2048},alt:{type:String,maxlength:500}},nested);
const block = new Schema({title:text(200),text:{type:String,maxlength:20000},items:strings},nested);
const faq = new Schema({question:text(500),answer:text(10000)},nested);
const metric = new Schema({label:text(160),value:{type:Number,min:0,required:true},year:{type:Number,min:1,max:9999,required:true,validate:Number.isInteger},source:{...url,required:true},verified:{type:Boolean,default:false}},nested);
const imageFields={media:{type:[media],default:[]}};
const approvedLinks={approvedLinks:{type:[link],default:[]}};
const syllabus = new Schema({ title: text(200), topics: strings }, nested);
const duration = new Schema({ value: { type: Number, required: true, min: Number.EPSILON, validate: Number.isFinite }, unit: { type: String, enum: ["hours", "weeks"], required: true } }, nested);

function schema(fields: SchemaDefinition<ContentRecord>, filterIndexes: string[], titleField = "title") {
  const result = new Schema<ContentRecord>({
    slug: { ...text(160), match: slugPattern }, summary: { ...publicationText(2000), default: "" },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft", required: true },
    publishedAt: { type: Date, required: function(this: ContentRecord) { return this.status === "published"; } },
    revision: { type: Number, default: 1, required: true, min: 1, validate: Number.isSafeInteger },
    importProvenance:{type:new Schema({source:String,sourceId:String,dataset:String,order:Number,notice:String,sourceHash:String,importedAt:Date,original:Schema.Types.Mixed},nested),default:undefined},
    reviewedForPublication:Boolean,displayOrder:{type:Number,min:0,validate:Number.isSafeInteger},details:{type:[block],default:undefined},
    seo: { type: seo, default: undefined }, ...fields,
  }, { timestamps: true, strict: true, autoIndex: false, autoCreate: false });
  result.index({ status: 1, updatedAt: -1, slug: 1 }, { name: "admin_status_updated" });
  result.index({ updatedAt: -1, slug: 1 }, { name: "admin_updated" });
  result.index({"importProvenance.source":1,"importProvenance.sourceId":1},{unique:true,name:"demo_source_unique",partialFilterExpression:{"importProvenance.source":"frontend-demo","importProvenance.sourceId":{$type:"string"}}});
  result.index({ slug: 1 }, { unique: true, name: "slug_unique" });
  result.index({ status: 1, publishedAt: -1, slug: 1 }, { name: "public_published_at" });
  result.index({ status: 1, [titleField]: 1, slug: 1, publishedAt: 1 }, { name: "public_title" });
  for (const field of filterIndexes) result.index({ status: 1, [field]: 1, publishedAt: -1, slug: 1 }, { name: `public_${field}` });
  return result;
}

export const contentDefinitions: Record<ContentKind, { name: string; collection: string; schema: Schema<ContentRecord> }> = {
  pages: {name:'PageContent',collection:'page_content',schema:schema({title:text(200),programAudience:{type:String,enum:['schools','universities','industry']},pageType:{type:String,enum:['homepage','solutions','institutional','consulting','about','contact','academy','company','projects','research','publications','team','store'],required:publicationRequired},sections:{type:[section],default:[]},featured:{type:[reference],default:[]},audience:strings,blocks:{type:[block],default:[]},capabilities:strings,deliverables:strings,responsibilities:strings,faqs:{type:[faq],default:[]},inquiryHref:safeHref,mentorSlugs:strings,...approvedLinks,contactEmail:{type:String,maxlength:254,match:/^[^\s@]+@[^\s@]+\.[^\s@]+$/},contactPhone:{type:String,maxlength:80},contactAddress:{type:String,maxlength:2000},pathways:{type:[new Schema({title:text(200),description:text(20000),problems:strings,approach:text(20000),capabilities:strings,deliverables:strings,requirements:strings,evaluation:text(20000)},nested)],default:undefined},...imageFields},['pageType'])},
  products: {name:'Product',collection:'products',schema:schema({title:text(200),sku:{type:String,maxlength:80,match:/^[A-Za-z0-9][A-Za-z0-9._-]*$/},categorySlug:{type:String,maxlength:160,match:slugPattern},stockQuantity:{type:Number,min:0,max:1000000,validate:Number.isSafeInteger},orderable:{type:Boolean,default:false},featuredProduct:{type:Boolean,default:false},compareAtMinor:{type:Number,min:0,max:10000000000,validate:Number.isSafeInteger},description:{type:String,maxlength:20000},specifications:{type:[new Schema({name:text(100),value:text(1000)},nested)],default:[]},packageContents:strings,videoInput:{type:String,maxlength:10000},skill:{type:String,maxlength:160},priceMinor:{type:Number,min:0,validate:Number.isSafeInteger},currency:{type:String,enum:['BDT'],default:'BDT'},components:{type:[new Schema({component:text(200),quantity:{type:Number,min:1,required:true,validate:Number.isSafeInteger},unitPrice:{type:Number,min:0,required:true,validate:Number.isFinite}},nested)],default:[]},compatibility:strings,extras:strings,power:strings,assembly:strings,outcomes:strings,relatedCourse:{type:String,maxlength:160,match:slugPattern},...imageFields},[])},
  projects: { name: "Project", collection: "projects", schema: schema({ title: text(200), category: publicationText(100), problem: publicationText(), approach: publicationText(), technologies: strings, results: strings, videoInput:{type:String,maxlength:10000},repositoryUrl:url, media: { type: [media], default: [] } }, ["category", "technologies"]) },
  research: { name: "ResearchProject", collection: "research_projects", schema: schema({ title: text(200), domain: publicationText(100), methods: strings, researchStage: { type: String, enum: researchStages, default: "planned", required: true }, contributors: { type: [contributor], default: [] },teamRequirements:strings,...approvedLinks,...imageFields }, ["domain", "researchStage"]) },
  publications: { name: "Publication", collection: "publications", schema: schema({ title: text(200), authors: { ...strings, required: publicationRequired, validate: function(this: ContentRecord, values: string[]) { return this.status !== "published" || (Array.isArray(values) && values.length > 0); } }, venue: publicationText(200), year: { type: Number, required: publicationRequired, min: 1, max: 9999, validate: Number.isInteger }, doi: { type: String, maxlength: 500, match: /^10\.\d{4,9}\/\S+$/ }, publisherUrl: url,abstract:{type:String,maxlength:20000},citation:{type:String,maxlength:10000},paperUrl:url,metrics:{type:[metric],default:[]},...imageFields }, ["year", "authors", "venue"]) },
  team: { name: "TeamMember", collection: "team_members", schema: schema({ name: text(160),classification:{type:String,enum:['team','board'],default:'team'},role:{type:String,maxlength:160},...imageFields, biography: publicationText(), expertise: strings, profileLinks: { type: [link], default: [] } }, ["expertise"], "name") },
  courses: { name: "Course", collection: "courses", schema: schema({ title: text(200), level: { type: String, enum: courseLevels, required: publicationRequired }, prerequisites: strings, syllabus: { type: [syllabus], default: [] }, deliveryMode: { type: String, enum: deliveryModes, required: publicationRequired }, duration: { type: duration, required: publicationRequired } }, ["level", "deliveryMode"]) },
};

contentDefinitions.products.schema.index({sku:1},{unique:true,partialFilterExpression:{sku:{$type:"string"}},name:"product_sku_unique"});
contentDefinitions.products.schema.index({status:1,categorySlug:1,publishedAt:-1});
