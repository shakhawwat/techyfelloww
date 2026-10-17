"use client";
import {useState} from 'react';
import {useAdmin} from './session';
import {Button} from '@/components/ui/button';
import {TextAreaField} from '@/components/ui/form-field';
export function AdminVideoInput({value,onChange,disabled}:{value:string;onChange:(value:string)=>void;disabled:boolean}){
 const {call}=useAdmin(),[result,setResult]=useState<{input:string;url?:string;error?:string}|null>(null),[busy,setBusy]=useState(false);const current=result?.input===value?result:null;
 async function validate(){setBusy(true);const input=value;try{const r=await call<{data:{embedUrl:string}}>('/admin/media/video-preview','POST',{input});setResult({input,url:r.data.embedUrl});}catch(e){setResult({input,error:e instanceof Error?e.message:'Video validation failed.'});}finally{setBusy(false);}}
 return <div><TextAreaField id="content-video-input" label="Video URL or iframe embed" value={value} maxLength={10000} disabled={disabled} onChange={e=>onChange(e.target.value)} hint="Supported HTTPS YouTube / Vimeo URLs or one iframe. Pasted HTML is never rendered."/><Button variant="secondary" disabled={disabled||busy||!value.trim()} onClick={()=>void validate()}>Validate and preview video</Button>{current?.error&&<p role="alert">{current.error}</p>}{current?.url&&<iframe src={current.url} title="Validated video preview" sandbox="allow-scripts allow-same-origin allow-presentation" allow="encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>}</div>;
}
