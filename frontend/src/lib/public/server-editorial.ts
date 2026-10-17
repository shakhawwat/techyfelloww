import 'server-only';
import {cache} from 'react';
import {contentApiBase} from './content';
import type {EditorialPage,EditorialProduct} from './editorial';
async function request(path:string){try{const base=contentApiBase(process.env.CONTENT_API_BASE_URL??'http://127.0.0.1:4000/api/v1');const response=await fetch(`${base}/${path}`,{cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(2000)});if(!response.ok)return null;return await response.json();}catch{return null;}}
export const editorialPage=cache(async(slug:string):Promise<EditorialPage|null>=>{if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return null;const result=await request(`pages/${slug}`);return result?.data?.slug===slug?result.data:null;});
export async function editorialPages(pageType:string):Promise<EditorialPage[]>{const result=await request(`pages?pageType=${encodeURIComponent(pageType)}&limit=100`);return Array.isArray(result?.data)?result.data:[];}
export async function editorialProductCollection():Promise<{state:'available'|'unavailable';data:EditorialProduct[]}>{const result=await request('products?limit=100');return Array.isArray(result?.data)?{state:'available',data:result.data}:{state:'unavailable',data:[]};}
export async function editorialProducts():Promise<EditorialProduct[]>{return (await editorialProductCollection()).data;}
