'use client';
import Image from 'next/image';
import { useEffect,useRef,useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus,RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextField,SelectField } from '@/components/ui/form-field';
import { useAdmin } from './session';
import { resources,labels,type Resource } from '@/lib/admin/contracts';
import { errorOf } from '@/lib/admin/api';
import { approvedMediaUrl,checkedMedia,uploadImage,type Media,type MediaList } from '@/lib/admin/media';
export function MediaLibrary({resource:fixed,onSelect,imagesOnly=false}:{resource?:Resource;onSelect?:(media:Media)=>void;imagesOnly?:boolean}){
  const {can,call,signal}=useAdmin(),router=useRouter();const permitted=resources.filter(r=>can(r,'read'));
  const [choice,setChoice]=useState<Resource>(fixed??permitted[0]);const resource=fixed??choice;
  const [page,setPage]=useState(1),[attempt,setAttempt]=useState(0),[status,setStatus]=useState('ready');
  const [result,setResult]=useState<{key:string;list?:MediaList;error?:string}>({key:''});
  const fileInput=useRef<HTMLInputElement>(null);
  const [kind,setKind]=useState<'image'|'document'>('image'),[file,setFile]=useState<File|null>(null),[alt,setAlt]=useState(''),[error,setError]=useState(''),[success,setSuccess]=useState(''),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0);
  const [localPreview,setLocalPreview]=useState('');
  useEffect(()=>()=>{if(localPreview)URL.revokeObjectURL(localPreview);},[localPreview]);
  const [editing,setEditing]=useState<Media|null>(null),[metadata,setMetadata]=useState('');
  const path=`/admin/media?resource=${resource}&page=${page}&status=${onSelect?'ready':status}`,key=`${path}:${attempt}`;
  useEffect(()=>{let active=true;call<MediaList>(path).then(list=>{if(!Array.isArray(list.data)||!list.settings||!list.pagination)throw new Error();list.data.forEach(checkedMedia);if(active)setResult({key,list});}).catch(e=>{if(active)setResult({key,error:errorOf(e).message});});return()=>{active=false;};},[call,path,key]);
  const loading=result.key!==key,list=!loading?result.list:undefined;
  async function upload(){setError('');setSuccess('');if(!file){setError('Choose an image.');return;}if(alt.trim().length<3||alt.trim().length>500){setError('Describe the meaningful image in 3–500 characters.');return;}if(list&&file.size>list.settings.maxBytes){setError('Image exceeds the configured byte limit.');return;}
    setBusy(true);setProgress(0);try{await uploadImage(file,resource,alt,setProgress,kind,signal);setSuccess('Media uploaded. The server confirmed ready media.');setFile(null);if(fileInput.current)fileInput.current.value='';setAlt('');setPage(1);setStatus('ready');setAttempt(a=>a+1);}catch(e){const failure=errorOf(e);setError(failure.message);if(failure.status===401)router.replace('/admin/login');}finally{setBusy(false);}}
  async function saveMetadata(){if(!editing)return;setError('');setSuccess('');if(metadata.trim().length<3||metadata.trim().length>500){setError('Describe the image in 3–500 characters.');return;}setBusy(true);try{const result=await call<{data:Media}>(`/admin/media/${editing.id}`,'PATCH',{revision:editing.revision,altText:metadata});checkedMedia(result.data);setEditing(null);setSuccess('Media description saved.');setAttempt(a=>a+1);}catch(e){setError(errorOf(e).message);}finally{setBusy(false);}}
  async function reviewMetadata(){if(!editing)return;setBusy(true);try{const result=await call<{data:Media}>(`/admin/media/${editing.id}`);const latest=checkedMedia(result.data);if(window.confirm(`Latest revision ${latest.revision}: ${latest.altText}\nKeep your unsaved description on this revision for a new save?`))setEditing(latest);}catch(e){setError(errorOf(e).message);}finally{setBusy(false);}}
  return <div className='media-library'><div className='admin-page-heading'><div><span className='eyebrow'>Public-content media</span><h1>{onSelect?'Choose media':'Media library'}</h1><p>Only server-confirmed ready images can be selected. JPEG, PNG, WebP, PDF and UTF-8 TXT. Public documents are downloadable; private lessons use separate storage.</p></div></div>
    {!fixed&&<SelectField id='media-resource' label='Content collection' value={choice} disabled={busy} onChange={e=>{setChoice(e.target.value as Resource);setPage(1);setEditing(null);setFile(null);setError('');setSuccess('');}}>{permitted.map(r=><option key={r} value={r}>{labels[r]}</option>)}</SelectField>}
    {can(resource,'edit')&&<Card className='media-upload'><h2><ImagePlus aria-hidden='true'/>Upload an image</h2>{list&&!list.settings.uploadAvailable&&<p role='alert'>R2 storage is not configured. Upload is unavailable.</p>}
      {list&&<p className='field-hint'>Maximum {Math.round(list.settings.maxBytes/1024/1024*10)/10} MiB; {list.settings.maxDimension}px per side; {list.settings.maxPixels.toLocaleString()} pixels. The server validates decoded content.</p>}
      {!imagesOnly&&<SelectField id="media-kind" label="Upload type" value={kind} disabled={busy} onChange={e=>{setKind(e.target.value as 'image'|'document');setFile(null);if(fileInput.current)fileInput.current.value='';}}><option value="image">Image</option><option value="document">Public document (PDF / TXT)</option></SelectField>}
      <TextField ref={fileInput} id='media-file' label='Media file' type='file' accept={kind==='image'?'image/jpeg,image/png,image/webp':'.pdf,.txt'} disabled={busy} onChange={e=>{const next=e.target.files?.[0]??null;setFile(next);setLocalPreview(next?URL.createObjectURL(next):'');setSuccess('');}}/>
      {file&&localPreview&&<div className="media-thumbnail">{kind==='image'?<Image src={localPreview} alt="Selected image preview" width={320} height={200} unoptimized/>:<a href={localPreview} download={file.name}>Preview / download selected document</a>}</div>}
      <TextField id='media-alt' label='Image description / alt text' value={alt} maxLength={500} disabled={busy} onChange={e=>setAlt(e.target.value)} hint='Describe the meaningful content, rather than the filename.'/>
      <Button onClick={upload} disabled={!list||!list.settings.uploadAvailable} loading={busy} loadingLabel={progress<100?`Sending ${progress}%…`:'Validating and storing…'}>Upload image</Button>
      {busy&&<p role='status'>Request sent: {progress}%. Ready status requires server confirmation.</p>}
    </Card>}
    {error&&<div className='admin-alert' role='alert'><p>{error}</p>{editing&&<Button variant='secondary' loading={busy} onClick={reviewMetadata}>Review latest media metadata</Button>}</div>}{success&&<p role='status' className='admin-success'>{success}</p>}
    {editing&&<Card><h2>Edit image description</h2><p>{editing.filename} · Revision {editing.revision}</p><TextField id='media-metadata' label='Saved image alt text' value={metadata} maxLength={500} disabled={busy} onChange={e=>setMetadata(e.target.value)}/><div className='admin-actions'><Button loading={busy} onClick={saveMetadata}>Save media description</Button><Button variant='secondary' disabled={busy} onClick={()=>setEditing(null)}>Cancel metadata edit</Button></div><p className='field-hint'>Existing project alt text is unchanged; each project stores its own contextual description.</p></Card>}
    {!onSelect&&<SelectField id='media-status' label='Media status' value={status} disabled={busy} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value='ready'>Ready</option><option value='uploading'>Pending</option><option value='failed'>Failed</option></SelectField>}
    {loading?<p role='status'>Loading media…</p>:result.error?<Card><p role='alert'>{result.error}</p><Button variant='secondary' onClick={()=>setAttempt(a=>a+1)}><RefreshCw aria-hidden='true'/>Retry media loading</Button></Card>:list&&<>
      {list.data.length===0?<Card><h2>No matching images</h2><p>No saved images match this collection and status.</p></Card>:<div className='media-grid'>{list.data.filter(item=>!imagesOnly||item.mimeType.startsWith('image/')).map(item=>{const url=approvedMediaUrl(item.url);return <Card key={item.id}><div className='media-thumbnail'>{item.status==='ready'&&url&&item.mimeType.startsWith('image/')?<Image src={url} alt={item.altText} width={item.width} height={item.height} onError={event=>{event.currentTarget.style.visibility='hidden';event.currentTarget.parentElement?.setAttribute('data-delivery-error','true');}}/>:item.mimeType==='application/pdf'||item.mimeType==='text/plain'?url?<a href={url} download target="_blank" rel="noopener noreferrer">Preview / download document</a>:<p>Approved media host required for document download.</p>:<p>{item.status==='ready'?'Preview unavailable: approved media host required.':`Upload ${item.status}; selection unavailable.`}</p>}</div><h2>{item.filename}</h2><p>{item.width} × {item.height} · {Math.ceil(item.size/1024)} KiB · {item.status}</p><p>{item.altText}</p><div className='admin-actions'>
        {item.status==='ready'&&onSelect&&can(resource,'edit')&&<Button onClick={()=>onSelect(item)}>Select {item.filename}</Button>}
        {item.status==='ready'&&can(resource,'edit')&&<Button variant='secondary' onClick={()=>{setEditing(item);setMetadata(item.altText);setError('');setSuccess('');}}>Edit description</Button>}
      </div></Card>;})}</div>}
      <div className='admin-pagination'><span>{list.pagination.total} images · Page {page} of {Math.max(1,list.pagination.totalPages)}</span><div><Button variant='secondary' disabled={page===1||busy} onClick={()=>setPage(p=>p-1)}>Previous images</Button><Button variant='secondary' disabled={page>=list.pagination.totalPages||busy} onClick={()=>setPage(p=>p+1)}>Next images</Button></div></div>
    </>}
  </div>;
}
