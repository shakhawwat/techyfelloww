'use client';
import {useEffect,useState} from 'react';
import {useAdmin,ResourceGate} from './session';
import {ContentEditor} from './content-editor';
import {Button} from '@/components/ui/button';
import {checkedRecord,type ContentList} from '@/lib/admin/contracts';
import {editorialDefaults} from '@/lib/admin/editorial-defaults';
export function HomepageManager(){return <EditorialPageManager slug="homepage"/>;}
export function EditorialPageManager({slug}:{slug:string}){const {call}=useAdmin(),[result,setResult]=useState<{id?:string;empty?:boolean;error?:string}|null>(null),[attempt,setAttempt]=useState(0);useEffect(()=>{let active=true;call<ContentList>(`/admin/pages?slug=${encodeURIComponent(slug)}&limit=1`).then(r=>{if(!Array.isArray(r.data))throw new Error('The saved page response could not be verified.');r.data.forEach(checkedRecord);if(active)setResult(r.data[0]?{id:r.data[0].id}:{empty:true});}).catch(e=>{if(active)setResult({error:e instanceof Error?e.message:'Page content could not be loaded.'});});return()=>{active=false;};},[call,attempt,slug]);return <ResourceGate resource="pages" edit>{!result?<p role="status">Loading page editor…</p>:result.error?<><p role="alert">{result.error}</p><Button onClick={()=>setAttempt(a=>a+1)}>Retry page</Button></>:<ContentEditor resource="pages" id={result.id} defaults={editorialDefaults(slug)}/>}</ResourceGate>;}
