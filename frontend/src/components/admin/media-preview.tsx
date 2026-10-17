'use client';
import Image from 'next/image';
import {useEffect,useState} from 'react';
import {useAdmin} from './session';
import {approvedMediaUrl,checkedMedia,type Media} from '@/lib/admin/media';
import {Button} from '@/components/ui/button';
export function AdminMediaPreview({reference,alt}:{reference:string;alt?:string}){
 const {call}=useAdmin(),[attempt,setAttempt]=useState(0),[result,setResult]=useState<{id:string;media?:Media;error?:string}|null>(null);
 useEffect(()=>{let active=true;call<{data:Media}>(`/admin/media/${encodeURIComponent(reference)}`).then(response=>{const media=checkedMedia(response.data);if(active)setResult({id:reference,media});}).catch(cause=>{if(active)setResult({id:reference,error:cause instanceof Error?cause.message:'Media preview could not be loaded.'});});return()=>{active=false;};},[reference,call,attempt]);
 if(result?.id!==reference)return <p role="status">Loading media preview…</p>;
 if(result.error)return <div role="alert"><p>{result.error}</p><Button variant="secondary" onClick={()=>setAttempt(value=>value+1)}>Retry media preview</Button></div>;
 const media=result.media,url=approvedMediaUrl(media?.url);
 if(!media||media.status!=='ready'||!url)return <p role="status">Media preview is unavailable. Check the saved asset and configured media host.</p>;
 return media.mimeType.startsWith('image/')?<Image src={url} alt={alt??media.altText} width={media.width} height={media.height} unoptimized style={{maxWidth:'100%',height:'auto'}}/>:<a href={url} target="_blank" rel="noopener noreferrer">{alt??media.filename}</a>;
}
