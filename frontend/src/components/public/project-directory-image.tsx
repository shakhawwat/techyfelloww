'use client';
import Image from 'next/image';
import {useState} from 'react';
import {Cpu} from 'lucide-react';
import styles from './project-directory.module.css';
export function ProjectDirectoryImage({image}:{image?:{url:string;altText:string;width:number;height:number;position?:string}}){
 const [failed,setFailed]=useState(false);
 return <div className={styles.thumbnail}>{image&&!failed?<Image src={image.url} alt={image.altText} fill sizes="(max-width: 600px) calc(100vw - 40px), (max-width: 1000px) 50vw, 33vw" loading="lazy" style={{objectPosition:image.position??'50% 50%'}} onError={()=>setFailed(true)}/>:<div className={styles.fallback}><Cpu size={44} strokeWidth={1} aria-hidden="true"/><span>Project image unavailable</span></div>}</div>;
}
