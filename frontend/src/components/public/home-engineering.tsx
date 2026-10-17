'use client';
import Image from 'next/image';
import {useHomeSections,useHomeSection} from './home-editorial';
import Link from 'next/link';
import {useEffect,useRef,useState,type PointerEvent,type ReactNode} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,Bot,Radio,Cpu,FlaskConical,CircleAlert,Workflow,Wrench} from 'lucide-react';
import {ProjectDetails} from './project-details';
import {Button} from '@/components/ui/button';
import {Container} from '@/components/ui/container';
import {homeCopy} from '@/content/home';
import {approvedImage} from '@/lib/public/pages';
import type {ContentState} from '@/lib/public/content';
import styles from './home-engineering.module.css';
function EngineeringSection({id,children}:{id:string;children:ReactNode}){
 const root=useRef<HTMLElement>(null);
 useEffect(()=>{
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(!root.current||!('IntersectionObserver' in window))return;
  const animations:Animation[]=[];
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
   if(!entry.isIntersecting)return;observer.unobserve(entry.target);
   if(!motion.matches&&'animate' in entry.target)animations.push(entry.target.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,easing:'ease-out'}));
  }),{threshold:.15});
  root.current.querySelectorAll('[data-reveal]').forEach(element=>observer.observe(element));
  const cancel=()=>{if(motion.matches)animations.forEach(animation=>animation.cancel());};
  motion.addEventListener('change',cancel);
  return ()=>{observer.disconnect();animations.forEach(animation=>animation.cancel());motion.removeEventListener('change',cancel);};
 },[]);
 return <section ref={root} id={id} tabIndex={-1} aria-labelledby={`${id}-title`} className={`${styles.section} ${id==='projects'?styles.projects:''}`}><div className={styles.circuit} aria-hidden="true"><svg viewBox="0 0 280 160" fill="none" focusable="false"><path d="M0 24H144V48H212V92H280 M0 48H120V72H188V116H280 M32 0V16H168V32H236V64H280"/><circle cx="144" cy="24" r="3"/><circle cx="212" cy="92" r="3"/></svg></div><Container>{children}</Container></section>;
}
function SectionLink({href,children}:{href:string;children:ReactNode}){return <Link prefetch={false} href={href} className={styles.cta}>{children}<ArrowRight aria-hidden="true"/></Link>;}
export function EngineeringServices(){
 const override=useHomeSection('solutions'),sections=useHomeSections();
 const icons=[Bot,Radio,Cpu,FlaskConical,Workflow,Wrench],routes=['/solutions/robotics','/solutions/iot-embedded','/solutions/ai-vision','/research','/solutions/automation','/solutions/prototyping'];
 return <EngineeringSection id="solutions"><header className={styles.heading} data-reveal><p className={styles.label}>{override?.label??'SOLUTIONS / ENGINEERING SERVICES'}</p><h2 id="solutions-title">{override?.title??<>Engineering ideas.{' '}<span>Into working systems.</span></>}</h2><p className={styles.description}>{override?.description??homeCopy.engineering.description}</p></header><div className={styles.services}>{homeCopy.engineering.services.map((title,index)=>{
 const entry=sections.find(section=>section.key===`solution-${index+1}`);if(entry?.visible===false)return null;const route=entry?.href??routes[index];
 const Icon=icons[index],body=<><span className={styles.glassReflection} aria-hidden="true"/><div className={styles.panelTop}><Icon aria-hidden="true"/><span className={styles.label}>ENGINEERING / {String(index+1).padStart(2,'0')}</span></div><h3>{entry?.title??title}</h3>{route&&<ArrowRight className={styles.panelArrow} aria-hidden="true"/>}</>;
 return <div key={title} data-reveal>{route?<Link className={styles.panel} href={route} prefetch={false}>{body}</Link>:<article className={styles.panel}>{body}</article>}</div>;
 })}</div><SectionLink href={override?.href??"/solutions"}>{override?.cta??'Explore solutions'}</SectionLink></EngineeringSection>;
}
const projectConcepts = [
 {title:'Smart Agriculture Monitoring',category:'IoT / Sensors',description:'A concept for connecting soil and environmental sensors to a monitoring dashboard, helping explore conditions across a growing area.',kind:'agriculture',image:{url:'/banner/esp32Bannetr.jpg',altText:'Illustrative connected microcontroller hardware held in front of code',width:5589,height:3145}},
 {title:'Autonomous Mobile Robot',category:'Robotics / Navigation',description:'A concept for combining range sensing, mapping and motion planning in a mobile robot navigating a bounded environment.',kind:'robot',image:undefined},
 {title:'AI Visual Inspection',category:'Computer Vision / Automation',description:'A concept for using camera input and a vision model to flag visual differences for human review in an inspection workflow.',kind:'vision',image:{url:'/banner/ai_banner.jpg',altText:'Illustrative AI lettering on a circuit board',width:6240,height:3510}},
] as const;
function ConceptIllustration({kind}:{kind:typeof projectConcepts[number]['kind']}){
 return <svg className={styles.conceptDrawing} viewBox="0 0 600 280" fill="none" aria-hidden="true" focusable="false">
  <g className={styles.drawingGrid}>{[60,120,180,240,300,360,420,480,540].map(x=><path key={x} d={`M${x} 20V260`}/>)}{[40,80,120,160,200,240].map(y=><path key={y} d={`M20 ${y}H580`}/>)}</g>
  {kind==='agriculture'?<><path d="M50 215H550 M85 185V110H170V185 M215 185V85H300V185 M345 185V125H430V185"/><path d="M125 110V75M125 90C100 90 95 65 95 65C120 65 125 90 125 90ZM125 85C150 85 155 60 155 60C130 60 125 85 125 85Z"/><rect x="455" y="55" width="90" height="100" rx="8"/><path d="M470 130L485 108L502 115L527 80 M260 85V45H455 M390 125V175H500V155"/><circle cx="260" cy="45" r="5"/><circle cx="390" cy="175" r="5"/></>:kind==='robot'?<><path strokeDasharray="7 8" d="M65 220H180V85H310V190H530"/><rect x="220" y="105" width="110" height="90" rx="18"/><circle cx="245" cy="195" r="14"/><circle cx="305" cy="195" r="14"/><circle cx="275" cy="137" r="12"/><path d="M275 105V75 M245 80Q275 50 305 80 M225 60Q275 12 325 60"/><rect x="405" y="55" width="100" height="60"/><path d="M55 45H145V115H55Z M505 180L530 190L505 200"/></>:<><rect x="50" y="90" width="100" height="70" rx="8"/><path d="M150 105L190 85V165L150 145 M205 75H240V40H275 M325 40H360V75H395 M205 195H240V230H275 M325 230H360V195H395"/><rect x="255" y="85" width="90" height="100"/><path d="M260 100H340 M260 125H340 M260 150H340 M405 135H455 M440 120L455 135L440 150"/><rect x="465" y="95" width="85" height="80" rx="8"/><path d="M485 135L500 150L530 115"/></>}
 </svg>;
}
export type ShowcaseItem = {id:string;title:string;category:string;summary:string;href?:string;demo?:typeof projectConcepts[number];image?:{url:string;altText:string;width:number;height:number}};
function ProjectVisual({item,thumbnail=false}:{item:ShowcaseItem;thumbnail?:boolean}){
 return <div className={thumbnail?styles.projectThumbnail:styles.sliderImage}>
 {item.image?<Image src={item.image.url} alt={item.image.altText} fill sizes={thumbnail?'(max-width: 767px) 30vw, 120px':'(max-width: 767px) 100vw, 65vw'} style={{objectFit:'cover',objectPosition:'center'}}/>:item.demo?<ConceptIllustration kind={item.demo.kind}/>:<p className={styles.label}>Approved image unavailable</p>}
 </div>;
}
function ProjectAction({item,expanded=false,onToggle,onOpen}:{item:ShowcaseItem;expanded?:boolean;onToggle:()=>void;onOpen:(trigger:HTMLButtonElement)=>void}){
 const concept=!!item.demo;
 return <div className={styles.inlineConcept}><button type="button" className={styles.conceptToggle} aria-expanded={expanded} aria-controls={`project-concept-${item.id}`} onClick={onToggle}>{expanded?(concept?'Close concept':'Close project'):(concept?'Explore concept':'Explore project')}<ArrowRight aria-hidden="true"/></button><div id={`project-concept-${item.id}`} className={styles.conceptExpansion} data-open={expanded} aria-hidden={!expanded} inert={!expanded}><div><p className={styles.description}>{item.summary}</p><button type="button" className={styles.projectDetailsAction} aria-haspopup="dialog" onClick={event=>onOpen(event.currentTarget)}>{concept?'More details':'More project details'}<ArrowUpRight aria-hidden="true"/></button>{item.href&&<Link className={styles.projectAction} href={item.href} prefetch={false}>View project case study<ArrowRight aria-hidden="true"/></Link>}</div></div></div>;
}

function ProjectShowcase({items,demos}:{items:ShowcaseItem[];demos:boolean}){
 const [active,setActive]=useState(0);
 const [details,setDetails]=useState<ShowcaseItem|null>(null);
 const [dragOffset,setDragOffset]=useState(0),[dragging,setDragging]=useState(false);
 const gesture=useRef<{id:number;x:number;y:number;width:number;horizontal:boolean;delta:number}|null>(null);
 const suppressClick=useRef(false);
 const [expanded,setExpanded]=useState<string|null>(null);
 const slides=demos?items:items.slice(0,1),previews=demos?items:items.slice(1,4);
 const current=Math.min(active,slides.length-1);
 // Continuous autoplay is disabled because the visible stop control is removed.
 function select(index:number){setActive((index+slides.length)%slides.length);}
 function openDetails(item:ShowcaseItem,trigger:HTMLElement){trigger.focus({preventScroll:true});setDetails(item);}
 function startDrag(event:PointerEvent<HTMLDivElement>){
  suppressClick.current=false;
  if(slides.length<2||!event.isPrimary||event.button!==0||(event.target as HTMLElement).closest('a,button,input,select,textarea,summary,[role="button"]'))return;
  gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY,width:event.currentTarget.clientWidth,horizontal:false,delta:0};
  setDragging(true);
  if(event.pointerType==='mouse')event.currentTarget.setPointerCapture(event.pointerId);
 }
 function moveDrag(event:PointerEvent<HTMLDivElement>){
  const g=gesture.current;if(!g||g.id!==event.pointerId)return;
  const dx=event.clientX-g.x,dy=event.clientY-g.y;
  if(!g.horizontal){
   if(Math.abs(dy)>8&&Math.abs(dy)>Math.abs(dx)){finishDrag(event,true);return;}
   if(Math.abs(dx)<8)return;
   g.horizontal=true;event.currentTarget.setPointerCapture(event.pointerId);
  }
  g.delta=dx;suppressClick.current=true;
  const edge=(current===0&&dx>0)||(current===slides.length-1&&dx<0);
  setDragOffset(edge?dx*.25:dx);
 }
 function finishDrag(event:PointerEvent<HTMLDivElement>,cancel=false){
  const g=gesture.current;if(!g||g.id!==event.pointerId)return;
  gesture.current=null;setDragging(false);setDragOffset(0);
  if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  if(!cancel&&g.horizontal&&Math.abs(g.delta)>=Math.min(100,g.width*.18))select(current+(g.delta<0?1:-1));
 }
 return <div className={styles.showcase}>
 <div className={styles.projectCarousel} data-reveal role="region" aria-roledescription="carousel" aria-label="Featured project previews"
>
 <div className={styles.projectSlides} data-draggable={slides.length>1} data-dragging={dragging}
 onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={event=>finishDrag(event)} onPointerCancel={event=>finishDrag(event,true)} onLostPointerCapture={event=>{if(event.target===event.currentTarget)finishDrag(event,true);}}
 onDragStart={event=>event.preventDefault()} onClickCapture={event=>{if(suppressClick.current){event.preventDefault();event.stopPropagation();suppressClick.current=false;}}}
 onClick={event=>{if((event.target as HTMLElement).closest('a,button,input,select,textarea,summary'))return;const trigger=event.currentTarget.querySelector<HTMLButtonElement>('article[data-active="true"] button[data-details]');if(trigger)openDetails(slides[current],trigger);}}
 aria-live="polite"><div className={styles.projectTrack} style={{transform:`translateX(calc(${-current*100}% + ${dragOffset}px))`}}>{slides.map((item,index)=><article key={item.id} className={styles.projectSlide} data-active={current===index} aria-hidden={current!==index} inert={current!==index} role="group" aria-roledescription="slide" aria-label={`${index+1} of ${slides.length}: ${item.title}`}>
 <ProjectVisual item={item}/><div className={styles.sliderBody}>{item.demo&&<span className={styles.demoTag}>Illustrative demo</span>}<p className={styles.label}>{item.category}</p><h3>{item.title}</h3><p className={styles.description}>{item.summary}</p><button type="button" data-details className={styles.projectDetailsAction} aria-haspopup="dialog" onClick={event=>openDetails(item,event.currentTarget)}>View details<ArrowRight aria-hidden="true"/></button></div>
 </article>)}</div></div>
 <div className={styles.imageControls}><Button variant="ghost" aria-label="Previous featured project" disabled={slides.length<2} onClick={()=>select(current-1)}><ArrowLeft aria-hidden="true"/></Button><Button variant="ghost" aria-label="Next featured project" disabled={slides.length<2} onClick={()=>select(current+1)}><ArrowRight aria-hidden="true"/></Button></div>

 </div>
 {!!previews.length&&<div className={styles.projectPreviews}>{previews.map(item=><article key={item.id} className={styles.projectMini} data-reveal data-expanded={expanded===item.id}><ProjectVisual item={item} thumbnail/><div className={styles.miniBody}>{item.demo&&<span className={styles.demoTag}>Illustrative demo</span>}<p className={styles.label}>{item.category}</p><h3>{item.title}</h3><ProjectAction item={item} expanded={expanded===item.id} onToggle={()=>setExpanded(value=>value===item.id?null:item.id)} onOpen={trigger=>openDetails(item,trigger)}/></div></article>)}</div>}
 {details&&<ProjectDetails key={`${details.demo?'demo':'project'}:${details.id}`} item={details} fallback={<ProjectVisual item={details}/>} onClose={()=>setDetails(null)}/>}
 </div>;
}
export function FeaturedProjects({content}:{content:ContentState}){
 const override=useHomeSection('projects');
 const demos=content.state==='empty';
 const items:ShowcaseItem[]=demos?projectConcepts.map(concept=>({id:concept.kind,title:concept.title,category:concept.category,summary:concept.description,image:concept.image,demo:concept})):content.data.map(item=>({id:item.slug,title:item.title,category:item.category??'Published work',summary:item.summary,href:`/projects/${item.slug}`,image:item.media?.find(media=>approvedImage(media.url))}));
 return <EngineeringSection id="projects"><header className={styles.heading} data-reveal><h2 id="projects-title">{override?.title??'Featured projects'}<span className={styles.rule} aria-hidden="true"/></h2><p className={`${styles.description} ${styles.projectsIntro}`}>{override?.description??'Explore ideas across robotics, IoT and AI through engineering projects and concept previews. Discover their technologies, design approaches and potential applications.'}</p></header>
 {content.state==='unavailable'?<div className={styles.availability} data-reveal role="status"><CircleAlert aria-hidden="true"/><p>{homeCopy.projects.unavailable}</p></div>:<><ProjectShowcase key={items.map(item=>item.id).join(':')} items={items} demos={demos}/></>}
 <SectionLink href="/projects">All projects</SectionLink></EngineeringSection>;
}
