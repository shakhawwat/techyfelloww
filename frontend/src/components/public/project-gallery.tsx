'use client';
import Image from 'next/image';
import {useEffect,useRef,useState,type ReactNode,type KeyboardEvent} from 'react';
import {ArrowLeft,Maximize2,Play} from 'lucide-react';
import styles from './home-engineering.module.css';

type Photo={url:string;altText:string;width:number;height:number};
const componentPhotos:Photo[]=[
 {url:'/banner/iot_banner.jpg',altText:'Illustrative collection of electronic components; not an assembled project',width:6000,height:4000},
 {url:'/banner/banner_1.jpg',altText:'Illustrative circuit board detail; not a project photograph',width:4000,height:3003},
];
export const demoGallery:Record<string,Photo[]>={
 agriculture:[{url:'/banner/esp32Bannetr.jpg',altText:'Illustrative ESP32 hardware; not a deployed agriculture system',width:5589,height:3145},...componentPhotos,{url:'/banner/banner_2.jpg',altText:'Illustrative circuit architecture artwork; not project hardware',width:2600,height:2600}],
 robot:componentPhotos,
 vision:[{url:'/banner/ai_banner.jpg',altText:'Illustrative AI circuit artwork; not an inspection installation',width:6240,height:3510},{url:'/banner/aibanner3.jpg',altText:'Illustrative AI processor artwork',width:5120,height:2880},{url:'/banner/b2.jpg',altText:'Illustrative machine intelligence artwork',width:5120,height:2880},{url:'/banner/banner_2.jpg',altText:'Illustrative circuit architecture artwork',width:2600,height:2600}],
};
export const demoResources={embed:'https://www.youtube.com/embed/dxkKcqtmhus?autoplay=1&playsinline=1',youtube:'https://www.youtube.com/watch?v=dxkKcqtmhus',github:'https://github.com/shakhawwat/agile_final_delevery',store:'https://dadarbari.store'};

export function ProjectGallery({photos,video,videoUrl,fallback,expanded,onExpandedChange}:{photos:Photo[];video:boolean;videoUrl?:string;fallback?:ReactNode;expanded:boolean;onExpandedChange:(value:boolean)=>void}){
 const [selected,setSelected]=useState(0);
 const photoButton=useRef<HTMLButtonElement>(null),backButton=useRef<HTMLButtonElement>(null),thumbnails=useRef<HTMLDivElement>(null);
 const wasExpanded=useRef(false);
 useEffect(()=>{
  if(expanded){backButton.current?.focus();backButton.current?.closest('[role="region"]')?.scrollTo({top:0});}
  else if(wasExpanded.current)photoButton.current?.focus({preventScroll:true});
  wasExpanded.current=expanded;
 },[expanded]);
 const photo=photos[selected],showVideo=video&&selected===photos.length;
 function navigate(event:KeyboardEvent<HTMLDivElement>){
  const buttons=Array.from(thumbnails.current?.querySelectorAll<HTMLButtonElement>('button')??[]);
  const index=buttons.indexOf(event.target as HTMLButtonElement);if(index<0)return;
  let next:number;
  if(event.key==='ArrowRight')next=(index+1)%buttons.length;
  else if(event.key==='ArrowLeft')next=(index-1+buttons.length)%buttons.length;
  else if(event.key==='Home')next=0;
  else if(event.key==='End')next=buttons.length-1;
  else return;
  event.preventDefault();if(next<photos.length)setSelected(next);buttons[next].focus();
 }
 return <section aria-label="Project media gallery" className={styles.popupGallery}>
  <h3>{expanded?'Larger image view':'Media gallery'}</h3>
  {expanded&&<button ref={backButton} type="button" className={styles.galleryAction} onClick={()=>onExpandedChange(false)}><ArrowLeft aria-hidden="true"/>Back to gallery</button>}
  <div className={styles.mainMedia} data-enlarged={expanded}>
   {showVideo?<iframe key={videoUrl??demoResources.embed} src={videoUrl??demoResources.embed} title={videoUrl?"Published project video":"Shared demo video resource — not documentation of a completed project"} sandbox="allow-scripts allow-same-origin allow-presentation" allow="autoplay; accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:photo?<button ref={photoButton} type="button" aria-label={expanded?'Return to gallery':'Enlarge selected photo'} onClick={()=>onExpandedChange(!expanded)}><Image src={photo.url} alt={photo.altText} fill sizes={expanded?'100vw':'(max-width:767px) 100vw, 780px'}/>{!expanded&&<span className={styles.enlargeHint}><Maximize2 aria-hidden="true"/>Enlarge image</span>}</button>:fallback}
  </div>
  <p className={styles.mediaCaption}>{showVideo?'Shared demo video resource. It is not documentation of this concept or any completed Techy Fellow project.':photo?.altText}</p>
  {!expanded&&<>
   <div ref={thumbnails} className={styles.mediaThumbnails} role="group" aria-label="Choose photo or video" onKeyDown={navigate}>
    {photos.map((media,index)=><button key={media.url} type="button" aria-label={`Show photo ${index+1}: ${media.altText}`} aria-pressed={selected===index} onClick={()=>setSelected(index)}><Image src={media.url} alt="" fill sizes="(max-width:767px) 18vw, 145px"/></button>)}
    {video&&<button type="button" aria-label="Show shared demo video" aria-pressed={showVideo} onClick={()=>setSelected(photos.length)}><Play aria-hidden="true"/><span>Demo video</span></button>}
   </div>
  </>}
 </section>;
}
