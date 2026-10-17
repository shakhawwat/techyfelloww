import {toAdminDto} from "../admin-content/content-input";
import { ServiceUnavailableException } from "@nestjs/common";
import type { ContentKind, ContentRecord, PublicContentDto, Seo } from "./content.types";
import { isPublicUrl } from "./content.schemas";

function editablePageFields(){return {title:1,programAudience:1,pageType:1,sections:1,featured:1,audience:1,blocks:1,capabilities:1,deliverables:1,responsibilities:1,faqs:1,inquiryHref:1,mentorSlugs:1,approvedLinks:1,contactEmail:1,contactPhone:1,contactAddress:1,pathways:1,media:1};}
const fields: Record<ContentKind, string[]> = {
  pages: Object.keys(editablePageFields()),
  products: ["sku","categorySlug","stockQuantity","orderable","featuredProduct","compareAtMinor","description","specifications","packageContents","videoInput","title","skill","priceMinor","currency","components","compatibility","extras","power","assembly","outcomes","relatedCourse","media"],
  projects: ["title", "category", "problem", "approach", "technologies", "results", "media", "videoInput","repositoryUrl"],
  research: ["title", "domain", "methods", "researchStage", "contributors","teamRequirements","approvedLinks","media"],
  publications: ["title", "authors", "venue", "year", "doi", "publisherUrl","abstract","citation","paperUrl","metrics","media"],
  team: ["name", "biography", "expertise", "profileLinks","classification","role","media"],
  courses: ["title", "level", "prerequisites", "syllabus", "deliveryMode", "duration"],
};
export function publicProjection(kind: ContentKind): Record<string, 0 | 1> {
  return Object.fromEntries([...["importProvenance.notice","displayOrder","details","slug", "summary", "publishedAt", "seo", ...fields[kind]].map(field => [field, 1]), ["_id", 0]]);
}
function required<T>(value: T | undefined): T {
  if (value === undefined || value === null) throw new ServiceUnavailableException();
  return value;
}
function publicSeo(seo?: Seo): Seo | undefined {
  if (!seo) return undefined;
  return { title: seo.title, description: seo.description, canonicalUrl: seo.canonicalUrl && isPublicUrl(seo.canonicalUrl) ? seo.canonicalUrl : undefined };
}
export function toPublicDto(kind: ContentKind, record: ContentRecord): PublicContentDto {
  const projected=toAdminDto(kind,record) as Record<string,unknown>;
  const additions=Object.fromEntries(fields[kind].filter(key=>['sku','categorySlug','stockQuantity','orderable','featuredProduct','compareAtMinor','description','specifications','packageContents','programAudience','pageType','sections','featured','audience','blocks','capabilities','deliverables','responsibilities','faqs','inquiryHref','mentorSlugs','skill','priceMinor','currency','components','compatibility','extras','power','assembly','outcomes','relatedCourse','teamRequirements','abstract','citation','paperUrl','metrics','classification','role','repositoryUrl','videoInput','contactEmail','contactPhone','contactAddress','pathways'].includes(key)).map(key=>[key,projected[key]]).filter(([,v])=>v!==undefined));
  if(Array.isArray(additions.metrics)) additions.metrics=additions.metrics.filter((m:{verified?:boolean})=>m.verified===true);
  if(record.approvedLinks)additions.approvedLinks=record.approvedLinks instanceof Array?record.approvedLinks.filter((l:{approved?:boolean;url:string})=>l.approved&&isPublicUrl(l.url)).map((l:{label:string;url:string})=>({label:l.label,url:l.url})):[];
  const common = {...additions,...(record.importProvenance?{illustrative:true,illustrativeNotice:record.importProvenance.notice}:{}),details:record.details,displayOrder:record.displayOrder, slug: record.slug, summary: record.summary, publishedAt: required(record.publishedAt).toISOString(), seo: publicSeo(record.seo) };
  switch (kind) {
    case "pages": case "products": return {...common,title:required(record.title),media:(record.media??[]).map(item=>({...item}))};
    case "projects": return { ...common, title: required(record.title), category: required(record.category), problem: required(record.problem), approach: required(record.approach), technologies: record.technologies ?? [], results: record.results ?? [], media: (record.media ?? []).map(item => ({ reference: item.reference, type: item.type, altText: item.altText })) };
    case "research": return { ...common, title: required(record.title), domain: required(record.domain), methods: record.methods ?? [], researchStage: required(record.researchStage), contributors: (record.contributors ?? []).map(person => ({ name: person.name, teamSlug: person.teamSlug })) };
    case "publications": return { ...common, title: required(record.title), authors: record.authors ?? [], venue: required(record.venue), year: required(record.year), doi: record.doi, publisherUrl: record.publisherUrl && isPublicUrl(record.publisherUrl) ? record.publisherUrl : undefined };
    case "team": return { ...common, name: required(record.name), biography: required(record.biography), expertise: record.expertise ?? [], profileLinks: (record.profileLinks ?? []).filter(link => link.approved === true && isPublicUrl(link.url)).map(link => ({ label: link.label, url: link.url })) };
    case "courses": { const duration = required(record.duration); return { ...common, title: required(record.title), level: required(record.level), prerequisites: record.prerequisites ?? [], syllabus: (record.syllabus ?? []).map(item => ({ title: item.title, topics: item.topics })), deliveryMode: required(record.deliveryMode), duration: { value: duration.value, unit: duration.unit } }; }
  }
}
