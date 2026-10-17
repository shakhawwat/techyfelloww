import 'server-only';
import { cache } from 'react';
import { createPagesLoader, siteOrigin, type PageKind, type ListQuery, type DetailResult, type ListResult } from './pages';
function getLoader() { return createPagesLoader(process.env.CONTENT_API_BASE_URL ?? 'http://127.0.0.1:4000/api/v1'); }
export const publicOrigin = () => siteOrigin(process.env.PUBLIC_SITE_URL);
export async function contentList(kind: PageKind, query: ListQuery): Promise<ListResult> { try { return await getLoader().list(kind, query); } catch { return { state: 'unavailable' }; } }
// Request-local deduplication also keeps metadata and the page on the same snapshot. Never reads a session.
export const contentDetail = cache(async (kind: PageKind, slug: string): Promise<DetailResult> => { try { return await getLoader().detail(kind, slug); } catch { return { state: 'unavailable' }; } });
