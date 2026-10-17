import { BadRequestException } from "@nestjs/common";
import { courseLevels, deliveryModes, isPublicUrl, researchStages, slugPattern } from "../content/content.schemas";
import type { ContentKind } from "../content/content.types";

type Rule = { type: "text"; max: number; empty?: boolean; pattern?: RegExp; url?: boolean } |
  { type: "number"; min: number; max: number; integer?: boolean } | { type: "boolean" } |
  { type: "enum"; values: readonly string[] } | { type: "array"; item: Rule } |
  { type: "object"; fields: Record<string, Rule>; required?: readonly string[] };
const text = (max = 10000): Rule => ({ type: "text", max });
const enumeration = (values: readonly string[]): Rule => ({ type: "enum", values });
const array = (item: Rule): Rule => ({ type: "array", item });
const object = (fields: Record<string, Rule>, required?: readonly string[]): Rule => ({ type: "object", fields, required });
const strings = array(text(500));
const url: Rule = { type: "text", max: 2048, url: true };
const href:Rule={type:'text',max:2048,pattern:/^(?:\/(?!\/)[^\\<>\s]*|#[a-zA-Z][\w-]*|https:\/\/[^\s<>]+)$/};
const links=array(object({label:text(160),url,approved:{type:'boolean'}},['label','url']));
const media=array(object({reference:{type:'text',max:24,pattern:/^[a-f0-9]{24}$/i},type:enumeration(['image','document']),altText:text(500)},['reference','type','altText']));
const slug: Rule = { type: "text", max: 160, pattern: slugPattern };
const common = { reviewedForPublication:{type:'boolean'} as Rule,displayOrder:{type:'number',min:0,max:1000000,integer:true} as Rule,details:array(object({title:text(200),text:text(20000),items:strings},['title'])),slug, summary: { type: "text", max: 2000, empty: true } as Rule, seo: object({ title: text(160), description: text(320), canonicalUrl: url }) };
export const editableFields: Record<ContentKind, Record<string, Rule>> = {
  pages:{...common,title:text(200),programAudience:enumeration(['schools','universities','industry']),pageType:enumeration(['homepage','solutions','institutional','consulting','about','contact','academy','company','projects','research','publications','team','store']),sections:array(object({key:text(160),title:text(200),description:text(20000),label:text(200),cta:text(200),href,image:{type:'text',max:2048,pattern:/^(?:media:[a-f0-9]{24}|\/(?!\/)[^\\<>\s]+)$/},alt:text(500),visible:{type:'boolean'}},['key'])),featured:array(object({kind:enumeration(['projects','research','publications','courses','team']),slug:{type:'text',max:160,pattern:slugPattern}},['kind','slug'])),audience:strings,blocks:array(object({title:text(200),text:text(20000),items:strings},['title'])),capabilities:strings,deliverables:strings,responsibilities:strings,faqs:array(object({question:text(500),answer:text()},['question','answer'])),inquiryHref:href,mentorSlugs:strings,approvedLinks:links,contactEmail:{type:"text",max:254,pattern:/^[^\s@]+@[^\s@]+\.[^\s@]+$/},contactPhone:text(80),contactAddress:text(2000),pathways:array(object({title:text(200),description:text(20000),problems:strings,approach:text(20000),capabilities:strings,deliverables:strings,requirements:strings,evaluation:text(20000)},['title','description','approach','evaluation'])),media},
  products:{...common,title:text(200),sku:{type:'text',max:80,pattern:/^[A-Za-z0-9][A-Za-z0-9._-]*$/},categorySlug:slug,stockQuantity:{type:'number',min:0,max:1000000,integer:true},orderable:{type:'boolean'},featuredProduct:{type:'boolean'},compareAtMinor:{type:'number',min:0,max:10000000000,integer:true},description:text(20000),specifications:array(object({name:text(100),value:text(1000)},['name','value'])),packageContents:strings,videoInput:text(10000),skill:text(160),priceMinor:{type:'number',min:0,max:Number.MAX_SAFE_INTEGER,integer:true},currency:enumeration(['BDT']),components:array(object({component:text(200),quantity:{type:'number',min:1,max:1000000,integer:true},unitPrice:{type:'number',min:0,max:10000000}},['component','quantity','unitPrice'])),compatibility:strings,extras:strings,power:strings,assembly:strings,outcomes:strings,relatedCourse:slug,media},
  projects: { ...common, title: text(200), category: text(100), problem: text(), approach: text(), technologies: strings, results: strings,videoInput:text(10000),repositoryUrl:url, media: array(object({ reference: text(500), type: enumeration(["image", "video", "document"]), altText: text(500) }, ["reference", "type", "altText"])) },
  research: { ...common, title: text(200), domain: text(100), methods: strings, researchStage: enumeration(researchStages), contributors: array(object({ name: text(160), teamSlug: slug }, ["name"])),teamRequirements:strings,approvedLinks:links,media },
  publications: { ...common, title: text(200), authors: strings, venue: text(200), year: { type: "number", min: 1, max: 9999, integer: true }, doi: { type: "text", max: 500, pattern: /^10\.\d{4,9}\/\S+$/ }, publisherUrl: url,abstract:text(20000),citation:text(),paperUrl:url,metrics:array(object({label:text(160),value:{type:"number",min:0,max:1000000000},year:{type:"number",min:1,max:9999,integer:true},source:url,verified:{type:"boolean"}},["label","value","year","source"])),media },
  team: { ...common, name: text(160),classification:enumeration(['team','board']),role:text(160),media, biography: text(), expertise: strings, profileLinks: array(object({ label: text(160), url, approved: { type: "boolean" } }, ["label", "url"])) },
  courses: { ...common, title: text(200), level: enumeration(courseLevels), prerequisites: strings, syllabus: array(object({ title: text(200), topics: strings }, ["title"])), deliveryMode: enumeration(deliveryModes), duration: object({ value: { type: "number", min: Number.EPSILON, max: 1000000 }, unit: enumeration(["hours", "weeks"]) }, ["value", "unit"]) },
};
export function invalid(fields: string[] = []): never { throw new BadRequestException({ fields }); }
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
function validate(rule: Rule, value: unknown, path: string): unknown {
  switch (rule.type) {
    case "text": {
      if (typeof value !== "string") return invalid([path]);
      const result = value.trim();
      if ((!result && !rule.empty) || result.length > rule.max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(result) ||
        (rule.pattern && !rule.pattern.test(result)) || (rule.url && !isPublicUrl(result))) return invalid([path]);
      return result;
    }
    case "number": if (typeof value !== "number" || !Number.isFinite(value) || value < rule.min || value > rule.max || (rule.integer && !Number.isSafeInteger(value))) return invalid([path]); return value;
    case "boolean": if (typeof value !== "boolean") return invalid([path]); return value;
    case "enum": if (typeof value !== "string" || !rule.values.includes(value)) return invalid([path]); return value;
    case "array": if (!Array.isArray(value) || value.length > 100) return invalid([path]); return value.map((item, index) => validate(rule.item, item, `${path}.${index}`));
    case "object": {
      if (!isObject(value) || Object.keys(value).some(key => !Object.hasOwn(rule.fields, key))) return invalid([path]);
      for (const key of rule.required ?? []) if (value[key] === undefined) return invalid([`${path}.${key}`]);
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, validate(rule.fields[key], child, `${path}.${key}`)]));
    }
  }
}
export function parseRevision(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value >= Number.MAX_SAFE_INTEGER) return invalid(["revision"]);
  return value;
}
export function parseContentInput(kind: ContentKind, body: unknown, edit: boolean) {
  if (!isObject(body)) return invalid();
  const fields = editableFields[kind];
  if (Object.keys(body).some(key => !Object.hasOwn(fields, key) && !(edit && key === "revision"))) return invalid();
  const revision = edit ? parseRevision(body.revision) : undefined;
  const entries = Object.entries(body).filter(([key]) => key !== "revision");
  if (edit && !entries.length) return invalid();
  const identity = kind === "team" ? "name" : "title";
  if (!edit && (body.slug === undefined || body[identity] === undefined)) return invalid(["slug", identity]);
  const changes: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    // Null removes an optional field. Identity fields are always mandatory; published validation protects the rest.
    changes[key] = value === null && edit && !["slug", identity].includes(key) ? null : validate(fields[key], value, key);
  }
  return { revision, changes };
}
export function parseAction(body: unknown, publish: boolean) {
  if (!isObject(body) || Object.keys(body).some(key => key !== "revision" && !(publish && key === "publishedAt"))) return invalid();
  const revision = parseRevision(body.revision);
  let publishedAt: Date | undefined;
  if (body.publishedAt !== undefined) {
    const value = body.publishedAt;
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return invalid(["publishedAt"]);
    publishedAt = new Date(value);
    const canonical = value.includes(".") ? value : value.replace(/Z$/, ".000Z");
    if (!Number.isFinite(publishedAt.getTime()) || publishedAt.toISOString() !== canonical) return invalid(["publishedAt"]);
  }
  return { revision, publishedAt };
}
// Explicit DTO projection: nested internal metadata cannot escape even if inserted outside this API.
function project(rule: Rule, value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (rule.type === "object") {
    if (typeof value !== "object" || Array.isArray(value)) return undefined;
    const object = value as Record<string, unknown>;
    return Object.fromEntries(Object.entries(rule.fields).map(([key, child]) => [key, project(child, object[key])]).filter(([, child]) => child !== undefined));
  }
  if (rule.type === "array") return Array.isArray(value) ? value.map(item => project(rule.item, item)).filter(item => item !== undefined) : undefined;
  if (rule.type === "number") return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  if (rule.type === "boolean") return typeof value === "boolean" ? value : undefined;
  return typeof value === "string" ? value : undefined;
}
export function toAdminDto(kind: ContentKind, input: object) {
  const record = input as Record<string, unknown>;
  const date = (value: unknown) => value instanceof Date && Number.isFinite(value.getTime()) ? value.toISOString() : undefined;
  return { id: String(record._id), status: record.status, revision: record.revision ?? 1,
    ...(record.importProvenance?{importProvenance:record.importProvenance}:{}),
    createdAt: date(record.createdAt), updatedAt: date(record.updatedAt), publishedAt: date(record.publishedAt),
    ...Object.fromEntries(Object.entries(editableFields[kind]).map(([key, rule]) => [key, project(rule, record[key])]).filter(([, value]) => value !== undefined)) };
}
