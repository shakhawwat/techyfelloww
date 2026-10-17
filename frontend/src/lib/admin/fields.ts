import type { ContentRecord, Resource } from "./contracts";
export type Value = string | boolean | Value[] | { [key: string]: Value };
export type Values = { [key: string]: Value };
export type Field = { key: string; label: string; type?: "text" | "textarea" | "number" | "select" | "lines" | "checkbox" | "object" | "repeater" | "asset" | "video";
  scale?:number;max?: number; min?: number; integer?: boolean; choices?: string[]; fields?: Field[]; required?: boolean; publish?: boolean; pattern?: RegExp; url?: boolean; default?: string; hint?: string };
const text = (key: string, label: string, max = 10000, extra: Partial<Field> = {}): Field => ({ key, label, max, type: max > 500 ? "textarea" : "text", ...extra });
const lines = (key: string, label: string, publish = false): Field => ({ key, label, type: "lines", publish, max: 500, hint: "One item per line. Up to 100 items; 500 characters per item." });
const select = (key: string, label: string, choices: string[], extra: Partial<Field> = {}): Field => ({ key, label, type: "select", choices, ...extra });
const url = (key: string, label: string, extra: Partial<Field> = {}): Field => text(key, label, 2048, { type: "text", url: true, hint: "HTTPS URL without embedded credentials.", ...extra });
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slug = text("slug", "Slug", 160, { required: true, pattern: slugPattern, hint: "Unique lowercase words separated by hyphens." });
const summary = text("summary", "Summary", 2000, { publish: true, hint: "Required before publishing." });
const seo: Field = { key: "seo", label: "Search metadata", type: "object", fields: [text("title", "SEO title", 160), text("description", "SEO description", 320), url("canonicalUrl", "Canonical URL")] };
const common = (name = false): Field[] => [text(name ? "name" : "title", name ? "Name" : "Title", name ? 160 : 200, { required: true }), slug, summary,{key:"reviewedForPublication",label:"Reviewed for public display (illustrative labels remain)",type:"checkbox"},{key:"displayOrder",label:"Display order",type:"number",integer:true,min:0,max:1000000},{key:"details",label:"Additional content details",type:"repeater",fields:[text("title","Section title",200,{required:true}),text("text","Text",20000),lines("items","Items")]}];
const mediaField:Field={key:'media',label:'Images and public documents',type:'repeater',fields:[text('reference','Media identifier',24,{required:true,pattern:/^[a-f0-9]{24}$/i}),select('type','Media type',['image','document'],{required:true}),text('altText','Description / alt text',500,{required:true})]};
const linksField:Field={key:'approvedLinks',label:'Approved links',type:'repeater',fields:[text('label','Link label',160,{required:true}),url('url','Link URL',{required:true}),{key:'approved',label:'Approved for public display',type:'checkbox'}]};
export const fields: Record<Resource, Field[]> = {
  pages:[...common(),select('pageType','Page group',['homepage','solutions','institutional','consulting','about','contact','academy','company','projects','research','publications','team','store'],{required:true}),select('programAudience','Institutional program audience (optional)',['schools','universities','industry']),{key:'sections',label:'Homepage sections / banners',type:'repeater',hint:'Homepage slug: homepage. Banner keys: hero-1 to hero-3. Audience cards: audience-1 to audience-3. Engineering cards: solution-1 to solution-6. Section keys: audience, solutions, projects, research, support, mentorship-store, company, inquiry. Reorder sections using Move up/down. Existing layout and static copy remain when fields are blank.',fields:[text('key','Section key',160,{required:true}),text('title','Heading',200),text('description','Description',20000),text('label','Eyebrow / label',200),text('cta','CTA label',200),text('href','CTA link',2048,{pattern:/^(?:\/(?!\/)[^\\<>\s]*|#[a-zA-Z][\w-]*|https:\/\/[^\s<>]+)$/}),text('image','Banner image',2048,{type:'asset'}),text('mobileImage','Mobile banner image (optional)',2048,{type:'asset'}),text('alt','Image alt text',500),{key:'visible',label:'Visible',type:'checkbox'}]}, {key:'featured',label:'Featured existing records',type:'repeater',fields:[select('kind','Collection',['projects','research','publications','courses','team'],{required:true}),text('slug','Published record slug',160,{required:true,pattern:slugPattern})]},lines('audience','Suitable audience'),{key:'blocks',label:'Expandable scope details',type:'repeater',fields:[text('title','Detail title',200,{required:true}),text('text','Detail description',20000),lines('items','Capabilities / detail items')]},lines('capabilities','Capabilities'),lines('deliverables','Deliverables'),lines('responsibilities','Client responsibilities'),{key:'faqs',label:'FAQs',type:'repeater',fields:[text('question','Question',500,{required:true}),text('answer','Answer',10000,{required:true})]},text('inquiryHref','Inquiry link',2048,{pattern:/^\/(?!\/)[^\\<>\s]*$/}),lines('mentorSlugs','Approved mentor profile slugs'),{...linksField,label:'Approved company / social links'},text('contactEmail','Public company email',254,{pattern:/^[^\s@]+@[^\s@]+\.[^\s@]+$/}),text('contactPhone','Public company phone',80),text('contactAddress','Public company address',2000),{key:'pathways',label:'Solution project pathways',type:'repeater',fields:[text('title','Pathway title',200,{required:true}),text('description','Description',20000,{required:true}),lines('problems','Problems / intended use'),text('approach','Technical approach',20000,{required:true}),lines('capabilities','Relevant capabilities'),lines('deliverables','Deliverables'),lines('requirements','Required information / resources'),text('evaluation','Evaluation and limitations',20000,{required:true})]},mediaField,seo],
  products:[...common(),text('sku','SKU',80,{pattern:/^[A-Za-z0-9][A-Za-z0-9._-]*$/}),text('categorySlug','Store category',160,{pattern:slugPattern,hint:'Manage categories in Store operations.'}),{key:'stockQuantity',label:'Inventory quantity',type:'number',integer:true,min:0,max:1000000,hint:'Real available stock only. Zero prevents ordering.'},{key:'orderable',label:'Enable order requests (requires SKU, active category, price and real inventory)',type:'checkbox'},{key:'featuredProduct',label:'Featured on Store homepage',type:'checkbox'},{key:'compareAtMinor',label:'Genuine previous price (BDT, optional)',type:'number',scale:100,min:0,max:100000000,hint:'Must exceed the current price. Use only a genuine previous price.'},text('description','Product description',20000),{key:'specifications',label:'Technical specifications',type:'repeater',fields:[text('name','Specification name',100,{required:true}),text('value','Specification value',1000,{required:true})]},lines('packageContents','Package contents'),text('videoInput','Supplied product video',10000,{type:'video'}),text('skill','Skill level',160),{key:'priceMinor',label:'Approved price (BDT)',type:'number',scale:100,min:0,max:Number.MAX_SAFE_INTEGER/100,hint:'Use up to two decimal places. Blank means price unconfirmed. Ordering also requires stock, SKU, active category and explicit enablement.'},select('currency','Currency',['BDT'],{default:'BDT'}),{key:'components',label:'Kit components / specifications',type:'repeater',fields:[text('component','Component',200,{required:true}),{key:'quantity',label:'Quantity',type:'number',min:1,max:1000000,integer:true,required:true},{key:'unitPrice',label:'Approved component estimate (BDT)',type:'number',min:0,max:10000000,required:true}]},lines('compatibility','Compatibility'),lines('extras','Extras'),lines('power','Power specifications'),lines('assembly','Assembly instructions'),lines('outcomes','Learning outcomes'),text('relatedCourse','Related published course slug',160,{pattern:slugPattern}),mediaField,seo],
  projects: [...common(), text("category", "Category", 100, { publish: true }), text("problem", "Problem", 10000, { publish: true }), text("approach", "Approach", 10000, { publish: true }), lines("technologies", "Technologies"), lines("results", "Documented results"),text("videoInput","Video URL or iframe embed",10000,{type:"video"}),url("repositoryUrl","Repository URL"), { key: "media", label: "Media references", type: "repeater", hint: "Choose scoped images and public documents from the media library.", fields: [text("reference", "Reference", 24, { required: true, pattern: /^[a-f0-9]{24}$/i }), select("type", "Media type", ["image", "document"], { required: true }), text("altText", "Alternative text", 500, { required: true, pattern: /^(?=.{3,500}$)(?=.*[\p{L}\p{N}]).*$/u })] }, seo],
  research: [...common(), text("domain", "Domain", 100, { publish: true }), lines("methods", "Methods"), select("researchStage", "Research stage", ["planned", "active", "paused", "completed"], { default: "planned", publish: true, hint: "Research progress is independent of publication status." }), { key: "contributors", label: "Contributors", type: "repeater", fields: [text("name", "Contributor name", 160, { required: true }), text("teamSlug", "Team slug", 160, { pattern: slugPattern })] },lines("teamRequirements","Team requirements"),linksField,mediaField, seo],
  publications: [...common(), lines("authors", "Authors", true), text("venue", "Venue", 200, { publish: true }), { key: "year", label: "Year", type: "number", min: 1, max: 9999, integer: true, publish: true }, text("doi", "DOI", 500, { pattern: /^10\.\d{4,9}\/\S+$/, hint: "For example, the DOI format starts with 10. followed by its assigned prefix." }), url("publisherUrl", "Publisher URL"),text('abstract','Abstract',20000),text('citation','Citation',10000),url('paperUrl','Paper URL'),{key:'metrics',label:'Verified publication metrics',type:'repeater',fields:[text('label','Metric name',160,{required:true}),{key:'value',label:'Verified value',type:'number',min:0,max:1000000000,required:true},{key:'year',label:'Metric year',type:'number',min:1,max:9999,integer:true,required:true},url('source','Verification source',{required:true}),{key:'verified',label:'Verified for public display',type:'checkbox'}]},mediaField, seo],
  team: [...common(true),select("classification","Profile classification",["team","board"],{default:"team"}),text("role","Role / position",160),mediaField, text("biography", "Biography", 10000, { publish: true }), lines("expertise", "Expertise"), { key: "profileLinks", label: "Profile links", type: "repeater", fields: [text("label", "Link label", 160, { required: true }), url("url", "Profile URL", { required: true }), { key: "approved", label: "Approved for public display", type: "checkbox" }] }, seo],
  courses: [...common(), select("level", "Level", ["beginner", "intermediate", "advanced"], { publish: true }), lines("prerequisites", "Prerequisites"), { key: "syllabus", label: "Syllabus", type: "repeater", fields: [text("title", "Lesson title", 200, { required: true }), lines("topics", "Topics")] }, select("deliveryMode", "Delivery mode", ["self-paced", "live-online", "in-person", "hybrid"], { publish: true }), { key: "duration", label: "Duration", type: "object", publish: true, fields: [{ key: "value", label: "Duration value", type: "number", min: Number.EPSILON, max: 1000000, required: true }, select("unit", "Duration unit", ["hours", "weeks"], { required: true })] }, seo],
};
function fromField(field: Field, value?: unknown): Value {
  if (field.type === "checkbox") return field.key === "visible" ? value !== false : value === true;
  if (field.type === "object") return Object.fromEntries((field.fields ?? []).map(child => [child.key, fromField(child, value && typeof value === "object" ? (value as Record<string, unknown>)[child.key] : undefined)]));
  if (field.type === "repeater") return Array.isArray(value) ? value.map(item => Object.fromEntries((field.fields ?? []).map(child => [child.key, fromField(child, item[child.key])]))) : [];
  if (field.type === "lines") return Array.isArray(value) ? value.join("\n") : "";
  if(field.scale&&typeof value==='number')return String(value/field.scale);
  return typeof value === "string" || typeof value === "number" ? String(value) : field.default ?? "";
}
export function toValues(resource: Resource, record?: ContentRecord): Values { return Object.fromEntries(fields[resource].map(field => [field.key, fromField(field, record?.[field.key])])); }
export function emptyRow(field: Field): Values { return Object.fromEntries((field.fields ?? []).map(child => [child.key, fromField(child)])); }
function empty(value: Value): boolean {
  if (typeof value === "boolean") return true;
  if (typeof value === "string") return !value.trim();
  if (Array.isArray(value)) return value.length === 0;
  return Object.values(value).every(empty);
}
export function serialize(resource: Resource, values: Values, publishing = false) {
  const errors: Record<string, string> = {};
  function convert(field: Field, value: Value, path: string): unknown {
    if (field.type === "checkbox") return field.key === "visible" ? value !== false : value === true;
    const required = field.required || (publishing && field.publish);
    if (empty(value) && !["lines", "repeater"].includes(field.type ?? "")) {
      if (required) errors[path] = "This field is required.";
      return undefined;
    }
    if (field.type === "object") {
      const object = value as Values;
      return Object.fromEntries((field.fields ?? []).map(child => [child.key, convert(child, object[child.key], `${path}.${child.key}`)]).filter(([, child]) => child !== undefined));
    }
    if (field.type === "repeater") {
      const rows = value as Values[];
      if (rows.length > 100) errors[path] = "Use at most 100 entries.";
      return rows.map((row, i) => Object.fromEntries((field.fields ?? []).map(child => [child.key, convert(child, row[child.key], `${path}.${i}.${child.key}`)]).filter(([, child]) => child !== undefined)));
    }
    const string = String(value).trim();
    if (field.type === "lines") {
      const rows = string ? string.split(/\r?\n/).map(item => item.trim()).filter(Boolean) : [];
      if (required && !rows.length) errors[path] = "Add at least one item.";
      if (rows.length > 100 || rows.some(item => item.length > 500 || /[\u0000-\u001F]/.test(item))) errors[path] = "Use at most 100 items, with 500 characters per item and no control characters.";
      return rows;
    }
    if (field.type === "number") {
      const n = Number(string);
      if (!/^\d+(?:\.\d+)?$/.test(string) || !Number.isFinite(n) || n < (field.min ?? 0) || n > (field.max ?? Infinity) || (field.integer && !Number.isSafeInteger(n))) errors[path] = `Enter a ${field.integer ? "whole" : "positive"} number within the allowed range.`;
      if(field.scale){const scaled=Math.round(n*field.scale);if(!/^\d+(?:\.\d{1,2})?$/.test(string)||!Number.isSafeInteger(scaled))errors[path]='Use an approved BDT amount with at most two decimal places.';return scaled;}
      return n;
    }
    if (field.type === "select" && !field.choices?.includes(string)) errors[path] = "Choose a valid option.";
    if (field.max && string.length > field.max) errors[path] = `Use at most ${field.max} characters.`;
    if (field.pattern && !field.pattern.test(string)) errors[path] = "Use the documented format.";
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(string)) errors[path] = "Remove unsupported control characters.";
    if (field.url) { try { const url = new URL(string); if (url.protocol !== "https:" || url.username || url.password) throw new Error(); } catch { errors[path] = "Enter an HTTPS URL without credentials."; } }
    return string;
  }
  const data = Object.fromEntries(fields[resource].map(field => [field.key, convert(field, values[field.key], field.key)]).filter(([, value]) => value !== undefined));
  return { data, errors };
}
export function patchPayload(resource: Resource, values: Values, record: ContentRecord) {
  const serialized = serialize(resource, values, record.status === "published");
  const before = serialize(resource, toValues(resource, record)).data;
  const changes: Record<string, unknown> = {};
  for (const field of fields[resource]) if (JSON.stringify(serialized.data[field.key]) !== JSON.stringify(before[field.key])) changes[field.key] = serialized.data[field.key] ?? null;
  return { ...serialized, changes };
}
