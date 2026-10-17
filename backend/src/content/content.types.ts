export type ContentKind = "projects" | "research" | "publications" | "team" | "courses" | "pages" | "products";
export type EditorialStatus = "draft" | "published" | "archived";
export type Seo = { title?: string; description?: string; canonicalUrl?: string };
export type MediaReference = { reference: string; type: "image" | "video" | "document"; altText: string; url?: string; width?: number; height?: number; mimeType?: string };
export type Contributor = { name: string; teamSlug?: string };
export type ProfileLink = { label: string; url: string; approved: boolean };
export type SyllabusItem = { title: string; topics: string[] };
export type Duration = { value: number; unit: "hours" | "weeks" };

// Shared storage contract; each collection schema enforces its own required fields.
export interface ContentRecord {
  slug: string;
  importProvenance?:{source:string;sourceId:string;dataset:string;order:number;notice:string;sourceHash:string;importedAt:Date;original:unknown};
  reviewedForPublication?:boolean; displayOrder?:number; details?:{title:string;text?:string;items?:string[]}[];
  title?: string;
  name?: string;
  summary: string;
  status: EditorialStatus;
  revision?: number;
  publishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  seo?: Seo;
  programAudience?:'schools'|'universities'|'industry';
  pageType?:'homepage'|'solutions'|'institutional'|'consulting'|'about'|'contact'|'academy'|'company'|'projects'|'research'|'publications'|'team'|'store';
  contactEmail?:string;contactPhone?:string;contactAddress?:string;
  sections?:{key:string;title?:string;description?:string;label?:string;cta?:string;href?:string;visible?:boolean;image?:string;mobileImage?:string;alt?:string}[];
  featured?:{kind:ContentKind;slug:string}[];
  audience?:string[];blocks?:{title:string;text?:string;items?:string[]}[];capabilities?:string[];deliverables?:string[];responsibilities?:string[];faqs?:{question:string;answer:string}[];inquiryHref?:string;mentorSlugs?:string[];
  pathways?:{title:string;description:string;problems:string[];approach:string;capabilities:string[];deliverables:string[];requirements:string[];evaluation:string}[];
  sku?:string;categorySlug?:string;stockQuantity?:number;orderable?:boolean;featuredProduct?:boolean;compareAtMinor?:number;description?:string;specifications?:{name:string;value:string}[];packageContents?:string[];
  skill?:string;priceMinor?:number;currency?:'BDT';components?:{component:string;quantity:number;unitPrice:number}[];compatibility?:string[];extras?:string[];power?:string[];assembly?:string[];outcomes?:string[];relatedCourse?:string;
  teamRequirements?:string[];approvedLinks?:ProfileLink[];abstract?:string;citation?:string;paperUrl?:string;metrics?:{label:string;value:number;year:number;source:string;verified:boolean}[];classification?:'team'|'board';role?:string;videoInput?:string;repositoryUrl?:string;
  category?: string;
  problem?: string;
  approach?: string;
  technologies?: string[];
  results?: string[];
  media?: MediaReference[];
  domain?: string;
  methods?: string[];
  researchStage?: "planned" | "active" | "paused" | "completed";
  contributors?: Contributor[];
  authors?: string[];
  venue?: string;
  year?: number;
  doi?: string;
  publisherUrl?: string;
  biography?: string;
  expertise?: string[];
  profileLinks?: ProfileLink[];
  level?: "beginner" | "intermediate" | "advanced";
  prerequisites?: string[];
  syllabus?: SyllabusItem[];
  deliveryMode?: "self-paced" | "live-online" | "in-person" | "hybrid";
  duration?: Duration;
}

export interface CommonPublicDto { slug: string; summary: string; publishedAt: string; seo?: Seo }
export interface ProjectPublicDto extends CommonPublicDto {
  title: string; category: string; problem: string; approach: string;
  technologies: string[]; results: string[]; media: MediaReference[];
}
export interface ResearchPublicDto extends CommonPublicDto {
  title: string; domain: string; methods: string[];
  researchStage: NonNullable<ContentRecord["researchStage"]>; contributors: Contributor[];
}
export interface PublicationPublicDto extends CommonPublicDto {
  title: string; authors: string[]; venue: string; year: number; doi?: string; publisherUrl?: string;
}
export interface TeamPublicDto extends CommonPublicDto {
  name: string; biography: string; expertise: string[]; profileLinks: { label: string; url: string }[];
}
export interface CoursePublicDto extends CommonPublicDto {
  title: string; level: NonNullable<ContentRecord["level"]>; prerequisites: string[];
  syllabus: SyllabusItem[]; deliveryMode: NonNullable<ContentRecord["deliveryMode"]>; duration: Duration;
}
export interface EditorialPublicDto extends CommonPublicDto { title: string; [key: string]: unknown }
export type PublicContentDto = EditorialPublicDto | ProjectPublicDto | ResearchPublicDto | PublicationPublicDto | TeamPublicDto | CoursePublicDto;
export type PublicListDto = { data: PublicContentDto[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
