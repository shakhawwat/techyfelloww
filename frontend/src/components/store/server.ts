import 'server-only';
import {contentApiBase} from '@/lib/public/content';
export async function storeGet<T>(path:string):Promise<{data:T|null;status:number}>{try{const base=contentApiBase(process.env.CONTENT_API_BASE_URL??'http://127.0.0.1:4000/api/v1'),response=await fetch(base+'/store/'+path,{cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(5000)});return {data:response.ok?await response.json():null,status:response.status};}catch{return {data:null,status:503};}}
