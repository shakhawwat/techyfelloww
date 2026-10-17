export const contentKinds = ['projects','research','publications','courses','team'] as const;
export type ContentKind = typeof contentKinds[number];
export type PublishedItem = {illustrative?:boolean;illustrativeNotice?:string;publicVideo?:{embedUrl:string;title:string};publicThumbnail?:{src:string;alt:string};description?:string;audience?:string;outcomes?:string[];tools?:string[];syllabus?:{title:string;topics:string[]}[];prerequisites?:string[];role?:string;classification?:'team'|'board'; slug:string; title:string; summary:string; publishedAt:string; category?:string; domain?:string; researchStage?:string; authors?:string[]; venue?:string; year?:number; doi?:string; publisherUrl?:string; level?:string; deliveryMode?:string; duration?:{value:number;unit:'hours'|'weeks'}; biography?:string; expertise?:string[]; media?:{url:string;altText:string;width:number;height:number}[] };
export type ContentState = { state:'available'|'empty'|'unavailable'; data:PublishedItem[] };
export const CONTENT_TTL_MS = 60_000;
export function contentApiBase(value:string):string {
  const url=new URL(value);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||!['/api/v1','/api/v1/'].includes(url.pathname))throw new Error('Invalid public content API configuration');
  return value.replace(/\/$/,'');
}
function string(value:unknown,max=10000):string|undefined{return typeof value==='string'&&value.trim().length>0&&value.length<=max?value:undefined;}
function strings(value:unknown):string[]|undefined{return Array.isArray(value)&&value.length<=100&&value.every(v=>typeof v==='string'&&v.length<=500)?value:undefined;}
export function decodePublicList(value:unknown,kind:ContentKind,now:number):PublishedItem[]{
  if(!value||typeof value!=='object'||!('data'in value)||!Array.isArray(value.data)||value.data.length>(kind==='research'||kind==='publications'?5:4))throw new Error('Invalid public response');
  return value.data.map((record:Record<string,unknown>)=>{
    if(!record||typeof record!=='object')throw new Error('Invalid record');
    const slug=string(record.slug,160),title=string(kind==='team'?record.name:record.title,200),summary=string(record.summary,2000),publishedAt=string(record.publishedAt,40);
    if(!slug||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||!title||!summary||!publishedAt||!Number.isFinite(Date.parse(publishedAt))||Date.parse(publishedAt)>now||('status'in record&&record.status!=='published'))throw new Error('Unverified public record');
    const duration=kind==='courses'&&record.duration&&typeof record.duration==='object'?record.duration as Record<string,unknown>:undefined;
    const courseDuration=duration&&typeof duration.value==='number'&&Number.isFinite(duration.value)&&duration.value>0&&(duration.unit==='hours'||duration.unit==='weeks')?{value:duration.value,unit:duration.unit as 'hours'|'weeks'}:undefined;
    return {illustrative:record.illustrative===true,illustrativeNotice:string(record.illustrativeNotice,500),...(kind==='courses'?{duration:courseDuration,publicVideo:typeof record.previewVideoUrl==='string'&&/^https:\/\/(?:www.youtube.com\/embed\/[a-zA-Z0-9_-]{11}|player.vimeo.com\/video\/[0-9]+(?:\?h=[a-fA-F0-9]+)?)$/.test(record.previewVideoUrl)?{embedUrl:record.previewVideoUrl,title:'Public course introduction'}:undefined,description:string(record.description,20000),audience:string(record.audience),outcomes:strings(record.outcomes),tools:strings(record.tools),prerequisites:strings(record.prerequisites),syllabus:Array.isArray(record.syllabus)?record.syllabus.filter((row:Record<string,unknown>)=>string(row?.title,200)&&strings(row.topics)).map((row:Record<string,unknown>)=>({title:row.title as string,topics:row.topics as string[]})):[],publicThumbnail:record.thumbnail&&typeof record.thumbnail==='object'&&/^\/banner\/[a-zA-Z0-9_.-]+$/.test((record.thumbnail as {src:string}).src)&&string((record.thumbnail as {alt:string}).alt,500)?record.thumbnail as {src:string;alt:string}:undefined}:{}),slug,title,summary,publishedAt,role:string(record.role,160),classification:record.classification==='board'?'board':record.classification==='team'?'team':undefined,category:string(record.category,100),domain:string(record.domain,100),researchStage:string(record.researchStage,30),authors:strings(record.authors),venue:string(record.venue,200),...(kind==='publications'?{doi:string(record.doi,2048),publisherUrl:string(record.publisherUrl,2048)}:{}),year:Number.isInteger(record.year)?record.year as number:undefined,level:string(record.level,30),deliveryMode:string(record.deliveryMode,30),biography:string(record.biography),expertise:strings(record.expertise),media:Array.isArray(record.media)?record.media.filter((m:Record<string,unknown>)=>m?.type==='image'&&typeof m.url==='string'&&typeof m.altText==='string'&&m.altText.trim().length>=3&&Number.isSafeInteger(m.width)&&Number.isSafeInteger(m.height)&&(m.width as number)>0&&(m.height as number)>0).map((m:Record<string,unknown>)=>({url:m.url as string,altText:m.altText as string,width:m.width as number,height:m.height as number})):undefined};
  });
}
// At most five cache slots per server instance. Expired snapshots are discarded before fetching; errors never return stale content.
export function createContentLoader(base:string,fetcher:typeof fetch=fetch,clock:()=>number=Date.now){
  const url=contentApiBase(base),cache=new Map<ContentKind,{expiresAt:number;result:ContentState}>(),pending=new Map<ContentKind,Promise<ContentState>>();
  return async(kind:ContentKind):Promise<ContentState>=>{
    const cached=cache.get(kind);if(cached&&cached.expiresAt>clock())return cached.result;cache.delete(kind);
    const inflight=pending.get(kind);if(inflight)return inflight;
    const request=(async():Promise<ContentState>=>{
      try{const response=await fetcher(`${url}/${kind}?limit=${kind==='research'||kind==='publications'?5:kind==='team'?4:3}&sort=-publishedAt`,{cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(2000)});if(!response.ok)throw new Error();const data=decodePublicList(await response.json(),kind,clock());const result:ContentState={state:data.length?'available':'empty',data};cache.set(kind,{expiresAt:clock()+CONTENT_TTL_MS,result});return result;}catch{return {state:'unavailable',data:[]};}
    })();pending.set(kind,request);try{return await request;}finally{pending.delete(kind);}
  };
}
