'use client';
import Link from 'next/link';
import {useEffect,useState,type ReactNode} from 'react';
import {ConfirmAction} from '@/components/admin/confirm';
import {approvedImage,createPagesLoader,type DetailResult} from '@/lib/public/pages';
import type {ShowcaseItem} from './home-engineering';
import {createLucideIcon,ShoppingBag} from 'lucide-react';
import {ProjectGallery,demoGallery,demoResources} from './project-gallery';
import {conceptDetails} from './project-concept-details';
import styles from './home-engineering.module.css';

// Lucide's former brand glyph, retained locally with its existing icon factory.
const Youtube=createLucideIcon('Youtube',[
 ['path',{d:'M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.56 49.56 0 0 1-16.2 0A2 2 0 0 1 2.5 17',key:'outline'}],
 ['path',{d:'m10 15 5-3-5-3z',key:'play'}],
]);

// The installed Lucide version omits brand exports; use its original Github glyph.
const Github=createLucideIcon('Github',[
 ['path',{d:'M9 19c-4.3 1.4-4.3-2.5-6-3m12 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 19 4.77 5.07 5.07 0 0 0 18.91 1S17.73.65 15 2.48a13.38 13.38 0 0 0-7 0C5.27.65 4.09 1 4.09 1A5.07 5.07 0 0 0 4 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 8 18.13V22',key:'github'}],
]);

export function ProjectDetails({item,onClose,fallback}:{item:ShowcaseItem;onClose:()=>void;fallback?:ReactNode}){
 const [expanded,setExpanded]=useState(false);
 const [result,setResult]=useState<DetailResult|null>(null);
 useEffect(()=>{
  if(item.demo)return;
  let mounted=true;
  async function load(){
   try{
    const base=new URL(process.env.NEXT_PUBLIC_API_BASE_URL??'/api/v1',window.location.origin).href;
    const detail=await createPagesLoader(base).detail('projects',item.id);
    if(mounted)setResult(detail);
   }catch{if(mounted)setResult({state:'unavailable'});}
  }
  void load();return ()=>{mounted=false;};
 },[item]);
 const record=result?.state==='available'?result.data:undefined;
 const image=record?.media?.find(media=>approvedImage(media.url))??item.image;
 const approvedGallery=record?.media?.filter(media=>approvedImage(media.url));
 const gallery=item.demo?demoGallery[item.demo.kind]:(approvedGallery?.length?approvedGallery:(image?[image]:[]));
 const concept=item.demo?conceptDetails[item.demo.kind]:undefined;
 function paragraph(title:string,value:string|undefined){return value?<section><h3>{title}</h3><p className={styles.description}>{value}</p></section>:null;}
 function list(title:string,values:readonly string[]|undefined){return values?.length?<section><h3>{title}</h3><ul>{values.map((value,index)=><li key={`${value}-${index}`}>{value}</li>)}</ul></section>:null;}
 return <ConfirmAction title={record?.title??item.title} busy={false} onCancel={onClose} presentation="details" className={styles.projectDialog} headerClassName={styles.projectDialogHeader} contentClassName={styles.projectDialogContent} onEscape={expanded?()=>setExpanded(false):undefined}>
  {item.demo&&<><span className={styles.demoTag}>Illustrative demo</span><p className={styles.description}>Status: Proposed concept. The features, architecture and components below are suggestions, not completed or tested work.</p></>}
  <p className={styles.label}>{record?.category??item.category}</p>
  <ProjectGallery photos={gallery} video={!!item.demo||!!record?.videoInput} videoUrl={record?.videoInput} fallback={fallback} expanded={expanded} onExpandedChange={setExpanded}/>
  {!expanded&&<>
  {paragraph('Overview',record?.summary??item.summary)}
  {!item.demo&&!result&&<p className={styles.description} role="status">Loading project details…</p>}
  {result&&result.state!=='available'&&<p className={styles.description} role="status">{result.state==='missing'?'Project details are no longer available.':'Additional project details are temporarily unavailable.'}</p>}
  <div className={styles.projectDetailColumns}>
   {paragraph('Intended users — proposed',concept?.users)}
   {paragraph(concept?'Problem addressed — proposed':'Problem addressed',record?.problem??concept?.problem)}
   {paragraph(concept?'Proposed solution':'Project approach',record?.approach??concept?.solution)}
   {list('Key features — proposed',concept?.features)}
   {list('Hardware / components — suggested',concept?.hardware)}
   {list(concept?'Software / technologies — suggested':'Software / technologies',record?.technologies??concept?.software)}
   {list('System workflow / example architecture',concept?.workflow)}
   {list('Published results',record?.results)}
   {list('Design limitations and proposed next steps',concept?.next)}
   {list('Contributors',record?.contributors.map(person=>person.name))}
  </div>
  {item.href&&<section><h3>Project documentation</h3><Link className={styles.projectAction} href={item.href} prefetch={false}>View project case study</Link></section>}
  {item.demo&&<section><h3>Shared demo resources</h3><p className={styles.description}>These shared resources illustrate demo concepts; they are not documentation of completed projects.</p><div className={styles.mediaActions} aria-label="Shared demo resource actions"><a href={demoResources.youtube} target="_blank" rel="noopener noreferrer" className={styles.galleryAction}><Youtube aria-hidden="true"/>YouTube<span className={styles.srOnly}> (opens in a new tab)</span></a><a href={demoResources.github} target="_blank" rel="noopener noreferrer" className={styles.galleryAction}><Github aria-hidden="true"/>GitHub<span className={styles.srOnly}> (opens in a new tab)</span></a><a href={demoResources.store} target="_blank" rel="noopener noreferrer" className={styles.galleryAction}><ShoppingBag aria-hidden="true"/>Store<span className={styles.srOnly}> (opens in a new tab)</span></a></div></section>}
 </>}
 </ConfirmAction>;
}
