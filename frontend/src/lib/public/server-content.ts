import 'server-only';
import {createContentLoader,contentKinds,type ContentKind,type ContentState} from './content';
export async function homepageContent():Promise<Record<ContentKind,ContentState>>{
  try{const load=createContentLoader(process.env.CONTENT_API_BASE_URL??'http://127.0.0.1:4000/api/v1');return Object.fromEntries(await Promise.all(contentKinds.map(async kind=>[kind,await load(kind)]))) as Record<ContentKind,ContentState>;}catch{const unavailable:ContentState={state:'unavailable',data:[]};return {projects:unavailable,research:unavailable,publications:unavailable,courses:unavailable,team:unavailable};}
}
