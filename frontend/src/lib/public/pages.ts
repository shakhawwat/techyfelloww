import { CONTENT_TTL_MS, contentApiBase, decodePublicList, type PublishedItem } from './content';

export const pageKinds = ['projects', 'research', 'publications', 'courses', 'team'] as const;
export type PageKind = typeof pageKinds[number];
export type Search = Record<string, string | string[] | undefined>;
export const filters = {
  projects: ['category', 'technology'],
  research: ['domain', 'researchStage'],
  publications: ['author', 'venue', 'year'],
  courses: ['level', 'deliveryMode'],
  team: ['expertise','classification'],
} as const;
export const courseLevels = ['beginner', 'intermediate', 'advanced'] as const;
export const deliveryModes = ['self-paced', 'live-online', 'in-person', 'hybrid'] as const;
export function pagePath(kind: PageKind): string { return kind === 'courses' ? '/academy/courses' : `/${kind}`; }
export const researchStages = ['planned', 'active', 'paused', 'completed'] as const;
export type ListQuery = { page: number; limit: number; sort: string; values: Record<string, string>; params: string };
export type PublicRecord = PublishedItem & {
  details?:{title:string;text?:string;items?:string[]}[];
  teamRequirements?:string[];approvedLinks?:{label:string;url:string}[];abstract?:string;citation?:string;paperUrl?:string;metrics?:{label:string;value:number;year:number;source:string;verified:boolean}[];videoInput?:string;repositoryUrl?:string;documents?:{url:string;altText:string}[];
  problem?: string; approach?: string; technologies: string[]; results: string[]; methods: string[];
  contributors: { name: string }[]; doi?: string; publisherUrl?: string;
  prerequisites: string[]; syllabus: { title: string; topics: string[] }[]; duration?: { value: number; unit: 'hours' | 'weeks' };
  profileLinks: { label: string; url: string }[];
  seo?: { title?: string; description?: string; canonicalUrl?: string };
};
export type Pagination = { page: number; limit: number; total: number; totalPages: number };
export type ListResult = { state: 'available'; data: PublicRecord[]; pagination: Pagination } | { state: 'unavailable' };
export type DetailResult = { state: 'available'; data: PublicRecord } | { state: 'missing' } | { state: 'unavailable' };

function integer(value: unknown, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) throw Error('Use positive whole numbers without leading zeros.');
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n > max) throw Error('The numeric selection is outside the supported range.');
  return n;
}
export function parseListQuery(kind: PageKind, raw: Search): ListQuery {
  const allowed = new Set<string>(['page', 'limit', 'sort', ...filters[kind]]);
  if (Object.keys(raw).some(key => !allowed.has(key))) throw Error('An unsupported filter was supplied.');
  const page = integer(raw.page, 1, Number.MAX_SAFE_INTEGER), limit = integer(raw.limit, 20, 100);
  if (!Number.isSafeInteger((page - 1) * limit)) throw Error('The requested page is outside the supported range.');
  const sort = raw.sort ?? '-publishedAt';
  const titleField = kind === 'team' ? 'name' : 'title';
  const sorts = ['publishedAt', '-publishedAt', titleField, `-${titleField}`, ...(kind === 'publications' ? ['year', '-year'] : [])];
  if (typeof sort !== 'string' || !sorts.includes(sort)) throw Error('Choose a supported sort order.');
  const values: Record<string, string> = {};
  for (const key of filters[kind]) {
    const value = raw[key];
    if (value === undefined || value === '') continue;
    if (typeof value !== 'string' || value.length > 200 || value !== value.trim() || /[\u0000-\u001F]/.test(value)) throw Error('Filters must be single text values of up to 200 characters.');
    if (key === 'researchStage' && !researchStages.includes(value as typeof researchStages[number])) throw Error('Choose a supported research stage.');
    if (key === 'level' && !courseLevels.includes(value as typeof courseLevels[number])) throw Error('Choose a supported course level.');
    if (key === 'deliveryMode' && !deliveryModes.includes(value as typeof deliveryModes[number])) throw Error('Choose a supported delivery mode.');
    if(key==='classification'&&!['team','board'].includes(value))throw Error('Choose team or board.');
    if (key === 'year') integer(value, 1, 9999);
    values[key] = value;
  }
  const params = new URLSearchParams({ page: String(page), limit: String(limit), sort, ...values }).toString();
  return { page, limit, sort, values, params };
}
export function listHref(kind: PageKind, query: ListQuery, page = query.page): string {
  const params = new URLSearchParams(query.params); params.set('page', String(page));
  return `${pagePath(kind)}?${params}`;
}
export function safeHttps(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\u007F]/.test(value)) return;
  try { const url = new URL(value); if (url.protocol === 'https:' && !url.username && !url.password) return url.href; } catch {}
}
export function siteOrigin(value: string | undefined): string | undefined {
  const safe = safeHttps(value); if (!safe) return;
  const url = new URL(safe); return url.pathname === '/' && !url.search && !url.hash && !url.port ? url.origin : undefined;
}
export function canonicalUrl(path: string, origin: string | undefined, record?: PublicRecord): string | undefined {
  return safeHttps(record?.seo?.canonicalUrl) ?? (origin ? new URL(path, origin).href : undefined);
}
export function doiUrl(doi: string | undefined): string | undefined {
  if (!doi || !/^10\.\d{4,9}\/[^\s<>]+$/.test(doi) || doi.length > 2048) return;
  return `https://doi.org/${doi.split('/').map(encodeURIComponent).join('/')}`;
}
export function approvedImage(url: string): boolean {
  if(/^\/banner\/[a-zA-Z0-9][a-zA-Z0-9_.-]*\.(?:jpg|jpeg|png|webp)$/.test(url))return true;
  try { const u = new URL(url); return !!process.env.NEXT_PUBLIC_MEDIA_HOST && u.protocol === 'https:' && u.hostname === process.env.NEXT_PUBLIC_MEDIA_HOST && !u.port && !u.username && !u.password && !u.search && !u.hash && /^\/techyfellow\/media\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(u.pathname); } catch { return false; }
}
function text(value: unknown, max: number): string | undefined { return typeof value === 'string' && value.trim() && value.length <= max ? value : undefined; }
function texts(value: unknown): string[] { if (value === undefined) return []; if (!Array.isArray(value) || value.length > 100 || value.some(v => !text(v, 500))) throw Error('Invalid array'); return value; }
export function decodeRecord(value: unknown, kind: PageKind, now: number): PublicRecord {
  const item = decodePublicList({ data: [value] }, kind, now)[0], raw = value as Record<string, unknown>;
  const seo = raw.seo && typeof raw.seo === 'object' ? raw.seo as Record<string, unknown> : undefined;
  const record: PublicRecord = { ...item, technologies: texts(raw.technologies), results: texts(raw.results), methods: texts(raw.methods), contributors: [], prerequisites: [], syllabus: [], profileLinks: [], seo: seo ? { title: text(seo.title, 160), description: text(seo.description, 320), canonicalUrl: safeHttps(seo.canonicalUrl) } : undefined };
  record.details=Array.isArray(raw.details)?raw.details.map((row:Record<string,unknown>)=>({title:text(row.title,200)??"",text:text(row.text,20000),items:texts(row.items)})).filter(row=>!!row.title):[];
  record.teamRequirements=texts(raw.teamRequirements);record.abstract=text(raw.abstract,20000);record.citation=text(raw.citation,10000);record.paperUrl=safeHttps(raw.paperUrl);record.repositoryUrl=safeHttps(raw.repositoryUrl);
  const video=safeHttps(raw.videoInput);if(video&&/^https:\/\/(?:www.youtube.com\/embed\/[a-zA-Z0-9_-]{11}|player.vimeo.com\/video\/[0-9]+(?:\?h=[a-fA-F0-9]+)?)$/.test(video))record.videoInput=video;
  if(Array.isArray(raw.approvedLinks))record.approvedLinks=raw.approvedLinks.flatMap(link=>{const label=text(link.label,160),url=safeHttps(link.url);return label&&url?[{label,url}]:[];});
  if(Array.isArray(raw.metrics))record.metrics=raw.metrics.filter(m=>m.verified===true&&text(m.label,160)&&Number.isFinite(m.value)&&m.value>=0&&Number.isInteger(m.year)&&m.year>0&&m.year<=9999&&safeHttps(m.source));
  if(Array.isArray(raw.media))record.documents=raw.media.filter(m=>m.type==='document'&&safeHttps(m.url)&&text(m.altText,500)).map(m=>({url:m.url,altText:m.altText}));
  if (kind === 'projects') { record.problem = text(raw.problem, 10000); record.approach = text(raw.approach, 10000); if (!record.category || !record.problem || !record.approach) throw Error('Invalid project'); }
  if (kind === 'research') {
    if (!record.domain || !researchStages.includes(record.researchStage as typeof researchStages[number])) throw Error('Invalid research');
    if (raw.contributors !== undefined) {
      if (!Array.isArray(raw.contributors) || raw.contributors.length > 100) throw Error('Invalid contributors');
      record.contributors = raw.contributors.map(person => { const name = text(person?.name, 200); if (!name) throw Error('Invalid contributor'); return { name }; });
    }
  }
  if (kind === 'publications') {
    if (!record.authors?.length || !record.venue || !record.year || record.year < 1 || record.year > 9999) throw Error('Invalid publication');
    const doi = text(raw.doi, 2048); record.doi = doiUrl(doi) ? doi : undefined; record.publisherUrl = safeHttps(raw.publisherUrl);
  }
  if (kind === 'courses') {
    if (!courseLevels.includes(record.level as typeof courseLevels[number]) || !deliveryModes.includes(record.deliveryMode as typeof deliveryModes[number])) throw Error('Invalid course');
    const duration = raw.duration as Record<string, unknown> | undefined;
    if (!duration || typeof duration.value !== 'number' || !Number.isFinite(duration.value) || duration.value <= 0 || !['hours', 'weeks'].includes(duration.unit as string)) throw Error('Invalid duration');
    record.duration = { value: duration.value, unit: duration.unit as 'hours' | 'weeks' };
    record.prerequisites = texts(raw.prerequisites);
    if (raw.syllabus !== undefined) {
      if (!Array.isArray(raw.syllabus) || raw.syllabus.length > 100) throw Error('Invalid syllabus');
      record.syllabus = raw.syllabus.map(section => { const title = text(section?.title, 200); if (!title) throw Error('Invalid syllabus title'); return { title, topics: texts(section.topics) }; });
    }
    // Keep scoped published course images resolved by the content API.
  }
  if (kind === 'team') {
    if (!record.biography) throw Error('Invalid biography');
    record.expertise = texts(raw.expertise);
    if (raw.profileLinks !== undefined) {
      if (!Array.isArray(raw.profileLinks) || raw.profileLinks.length > 100) throw Error('Invalid profile links');
      record.profileLinks = raw.profileLinks.flatMap(link => { const label = text(link?.label, 160), url = safeHttps(link?.url); return label && url && link.approved !== false ? [{ label, url }] : []; });
    }
    // Scoped, ready media references are resolved by the public API and decoded above.
  }
  return record;
}
// Public-only, 60-second snapshots. LRU capacity bounds user-selected queries/slugs; errors and misses are not cached.
export function createPagesLoader(base: string, fetcher: typeof fetch = fetch, clock: () => number = Date.now) {
  const root = contentApiBase(base), snapshots = new Map<string, { expires: number; result: ListResult | DetailResult }>();
  const pending = new Map<string, Promise<ListResult | DetailResult>>();
  async function request(path: string, kind: PageKind, query?: ListQuery): Promise<ListResult | DetailResult> {
    const saved = snapshots.get(path);
    if (saved && saved.expires > clock()) { snapshots.delete(path); snapshots.set(path, saved); return saved.result; }
    snapshots.delete(path); const inflight = pending.get(path); if (inflight) return inflight;
    if (pending.size >= 128) return { state: 'unavailable' };
    const work = (async (): Promise<ListResult | DetailResult> => {
      try {
        const response = await fetcher(`${root}/${path}`, { cache: 'no-store', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(2000) });
        if (!query && response.status === 404) return { state: 'missing' };
        if (!response.ok) return { state: 'unavailable' };
        const json = await response.json(); let result: ListResult | DetailResult;
        if (query) {
          const p = json?.pagination;
          if (!Array.isArray(json?.data) || json.data.length > query.limit || !p || p.page !== query.page || p.limit !== query.limit || !Number.isSafeInteger(p.total) || p.total < 0 || p.totalPages !== Math.ceil(p.total / p.limit) || json.data.length !== Math.min(p.limit, Math.max(0, p.total - (p.page - 1) * p.limit))) throw Error('Invalid pagination');
          result = { state: 'available', data: json.data.map((r: unknown) => decodeRecord(r, kind, clock())), pagination: { page: p.page, limit: p.limit, total: p.total, totalPages: p.totalPages } };
        } else { const data = decodeRecord(json?.data, kind, clock()); if (data.slug !== path.split('/')[1]) throw Error('Incorrect slug'); result = { state: 'available', data }; }
        snapshots.set(path, { expires: clock() + CONTENT_TTL_MS, result });
        if (snapshots.size > 128) snapshots.delete(snapshots.keys().next().value!);
        return result;
      } catch { return { state: 'unavailable' }; }
    })();
    pending.set(path, work); try { return await work; } finally { pending.delete(path); }
  }
  return {
    list: (kind: PageKind, query: ListQuery) => request(`${kind}?${query.params}`, kind, query) as Promise<ListResult>,
    detail: (kind: PageKind, slug: string): Promise<DetailResult> => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 160 ? request(`${kind}/${slug}`, kind) as Promise<DetailResult> : Promise.resolve({ state: 'missing' }),
  };
}
