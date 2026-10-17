'use client';
import {AdminMediaPreview} from './media-preview';
import Image from 'next/image';
import type {Field} from '@/lib/admin/fields';
export function ContentPreview({fields,data}:{fields:Field[];data:Record<string,unknown>}){
 return <>{fields.filter(field=>data[field.key]!==undefined).map(field=><PreviewField key={field.key} field={field} value={data[field.key]}/>)}</>;
}
function PreviewField({field,value}:{field:Field;value:unknown}){
 if(field.key==='media'&&Array.isArray(value))return <section><h3>{field.label}</h3>{value.map((item,index)=><AdminMediaPreview key={index} reference={String(item.reference)} alt={String(item.altText)}/>)}</section>;
 if(field.type==='asset'&&typeof value==='string'&&value.startsWith('media:'))return <section><h3>{field.label}</h3><AdminMediaPreview reference={value.slice(6)}/></section>;
 if(field.type==='video'&&typeof value==='string'&&/^https:\/\/(?:www.youtube.com\/embed\/[a-zA-Z0-9_-]{11}|player.vimeo.com\/video\/[0-9]+(?:\?h=[a-fA-F0-9]+)?)$/.test(value))return <section><h3>{field.label}</h3><iframe src={value} title="Draft video preview" sandbox="allow-scripts allow-same-origin allow-presentation" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></section>;
 if(field.type==='object'||field.type==='repeater'){const rows=(Array.isArray(value)?value:[value]) as Record<string,unknown>[];return <section><h3>{field.label}</h3>{rows.map((row,index)=><div key={index}><ContentPreview fields={field.fields??[]} data={row}/></div>)}</section>;}
 const text=Array.isArray(value)?undefined:typeof value==='boolean'?value?'Yes':'No':field.scale&&typeof value==='number'?String(value/field.scale):String(value);
 return <section><h3>{field.label}</h3>{Array.isArray(value)?<ul>{value.map((item,index)=><li key={index}>{String(item)}</li>)}</ul>:<p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{text}</p>}{field.type==='asset'&&text?.startsWith('/banner/')&&<Image src={text} alt="Draft banner preview" width={480} height={270} unoptimized/>}</section>;
}
