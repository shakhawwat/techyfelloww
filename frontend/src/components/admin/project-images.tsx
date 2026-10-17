'use client';
import {AdminMediaPreview} from './media-preview';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/form-field';
import { MediaLibrary } from './media-library';
import type {Resource} from '@/lib/admin/contracts';
import type { Value,Values } from '@/lib/admin/fields';
export function ProjectImages({value,onChange,disabled,errors,resource='projects'}:{value:Value;onChange:(value:Value)=>void;disabled:boolean;errors:Record<string,string>;resource?:Resource}){
  const [selecting,setSelecting]=useState(false);const rows=value as Values[];
  return <fieldset className='admin-fieldset'><legend>Images and public documents</legend><p className='field-hint'>Choose ready media from the media library. Describe each image in the context of this project. The first image is the thumbnail or portrait. Removing a reference keeps the stored asset.</p>
    {rows.map((row,index)=><div className='admin-repeat-row' key={index}><p>Media ID: {String(row.reference)}</p><AdminMediaPreview reference={String(row.reference)} alt={String(row.altText)}/><TextField id={`project-image-${index}-alt`} label={`Image ${index+1} alt text`} value={String(row.altText)} maxLength={500} disabled={disabled} error={errors[`media.${index}.altText`]??errors[`media.${index}.reference`]} onChange={event=>onChange(rows.map((r,i)=>i===index?{...r,altText:event.target.value}:r))}/>{!disabled&&<><Button variant="secondary" disabled={index===0} onClick={()=>{const next=[...rows];[next[index-1],next[index]]=[next[index],next[index-1]];onChange(next);}}>Move media up</Button><Button variant="secondary" disabled={index===rows.length-1} onClick={()=>{const next=[...rows];[next[index+1],next[index]]=[next[index],next[index+1]];onChange(next);}}>Move media down</Button><Button variant="secondary" onClick={()=>onChange(rows.filter((_,i)=>i!==index))}>Remove media {index+1} reference</Button></>}</div>)}
    {rows.length===0&&<p>No media selected.</p>}
    {!disabled&&<Button variant='secondary' disabled={rows.length>=100} onClick={()=>setSelecting(!selecting)}>{selecting?'Close image selection':'Choose media'}</Button>}
    {selecting&&!disabled&&<MediaLibrary resource={resource} onSelect={media=>{onChange([...rows,{reference:media.id,type:media.mimeType.startsWith('image/')?'image':'document',altText:media.altText}]);setSelecting(false);}}/>}
  </fieldset>;
}
