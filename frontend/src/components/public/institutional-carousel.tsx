'use client';
import {useCallback,useEffect,useRef,useState,useSyncExternalStore,type CSSProperties,type PointerEvent} from 'react';
import {Bot,BookOpen,BrainCircuit,Cog,FlaskConical,GraduationCap,Microscope,Presentation,Settings,ShoppingBag,Trophy,Users} from 'lucide-react';
import {useHomeSections} from './home-editorial';
import styles from './institutional-carousel.module.css';
export const defaultInstitutionalCategories=[
 {title:'Lab setup',Icon:Microscope},{title:'Workshops',Icon:Users},{title:'Technical training',Icon:Presentation},
 {title:'Robotics programs',Icon:Bot},{title:'STEM learning programs',Icon:BrainCircuit},{title:'Faculty development',Icon:GraduationCap},
 {title:'Research collaboration',Icon:FlaskConical},{title:'Curriculum support',Icon:BookOpen},{title:'Competition preparation',Icon:Trophy},
 {title:'Project mentorship',Icon:GraduationCap},{title:'Industry automation consulting',Icon:Cog},{title:'Equipment selection',Icon:ShoppingBag},{title:'Lab maintenance planning',Icon:Settings},
] as const;
export const institutionalCategories=defaultInstitutionalCategories;
function subscribe(callback:()=>void){const motion=window.matchMedia('(prefers-reduced-motion: reduce)');window.addEventListener('resize',callback);document.addEventListener('visibilitychange',callback);motion.addEventListener('change',callback);return()=>{window.removeEventListener('resize',callback);document.removeEventListener('visibilitychange',callback);motion.removeEventListener('change',callback);};}
function snapshot(){return `${window.innerWidth>=1024?5:window.innerWidth>=768?3:1}:${window.matchMedia('(prefers-reduced-motion: reduce)').matches}:${document.hidden}`;}
function serverSnapshot(){return '5:false:true';}
export function InstitutionalCarousel(){
 const sections=useHomeSections(),institutionalCategories=defaultInstitutionalCategories.map((item,index)=>({...item,title:sections.find(section=>section.key===`institutional-${index+1}`)?.title??item.title}));
 const environment=useSyncExternalStore(subscribe,snapshot,serverSnapshot),[count,motion,hidden]=environment.split(':'),visible=Number(count),reduced=motion==='true';
 const [index,setIndex]=useState(0),[step,setStep]=useState(0),[paused,setPaused]=useState(false),[hover,setHover]=useState(false),[focus,setFocus]=useState(false),[drag,setDrag]=useState(0);
 const suppressClick=useRef(false);
 const moving=useRef(false),gesture=useRef<{id:number;x:number;y:number;horizontal:boolean;delta:number}|null>(null);
 const move=useCallback((direction:number)=>{if(moving.current||direction===0)return;if(reduced){setIndex(value=>(value+direction+institutionalCategories.length)%institutionalCategories.length);return;}moving.current=true;setStep(direction);},[reduced,institutionalCategories.length]);
 useEffect(()=>{if(!step)return;const timer=window.setTimeout(()=>{setIndex(value=>(value+step+institutionalCategories.length)%institutionalCategories.length);setStep(0);moving.current=false;},500);return()=>window.clearTimeout(timer);},[step,institutionalCategories.length]);
 useEffect(()=>{if(paused||hover||focus||hidden==='true'||reduced)return;const timer=window.setInterval(()=>{if(!gesture.current)move(1);},5000);return()=>window.clearInterval(timer);},[paused,hover,focus,hidden,reduced,move]);
 function manual(direction:number){setPaused(true);move(direction);}
 function start(event:PointerEvent<HTMLDivElement>){if(event.button!==0||moving.current||(event.target as HTMLElement).closest('a,input,button:not([data-carousel-card])'))return;setPaused(true);suppressClick.current=false;gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY,horizontal:false,delta:0};}
 function follow(event:PointerEvent<HTMLDivElement>){const g=gesture.current;if(!g||g.id!==event.pointerId)return;const dx=event.clientX-g.x,dy=event.clientY-g.y;if(!g.horizontal){if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>8){gesture.current=null;return;}if(Math.abs(dx)<10)return;g.horizontal=true;event.currentTarget.setPointerCapture(event.pointerId);}g.delta=dx;setDrag(Math.max(-150,Math.min(150,dx)));}
 function end(event:PointerEvent<HTMLDivElement>,cancel=false){const g=gesture.current;if(!g||g.id!==event.pointerId)return;gesture.current=null;suppressClick.current=g.horizontal&&Math.abs(g.delta)>10;setDrag(0);if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);if(!cancel&&g.horizontal&&Math.abs(g.delta)>50)move(g.delta<0?1:-1);}
 return <div className={styles.carousel} role="region" aria-roledescription="carousel" aria-label="Proposed institutional service categories" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onFocusCapture={()=>setFocus(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setFocus(false);}} onKeyDown={event=>{suppressClick.current=false;if(event.key==='Escape')setPaused(true);if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();manual(event.key==='ArrowRight'?1:-1);}}}>
  <div className={styles.toolbar}><p className={styles.note}>Proposed service categories. Scope and availability require discussion.</p>

  </div>
  <div className={styles.viewport} onClickCapture={event=>{if(suppressClick.current){event.preventDefault();event.stopPropagation();suppressClick.current=false;}}} onPointerDown={start} onPointerMove={follow} onPointerUp={event=>end(event)} onPointerCancel={event=>end(event,true)} onLostPointerCapture={event=>{if(event.target===event.currentTarget)end(event,true);}}>
   <div className={styles.track} data-moving={step!==0} data-dragging={drag!==0} style={{'--step':step,'--drag':`${drag}px`} as CSSProperties}>
    {[-4,-3,-2,-1,0,1,2,3,4].map(distance=>{const position=(index+distance+institutionalCategories.length)%institutionalCategories.length,{title,Icon}=institutionalCategories[position],emphasis=Math.abs(distance-step),accessible=Math.abs(distance)<=Math.floor(visible/2);return <div key={title} className={styles.slot} role="group" aria-roledescription="slide" aria-label={`${position+1} of ${institutionalCategories.length}`} aria-hidden={!accessible} inert={!accessible} data-position={distance}>
     <button type="button" data-carousel-card aria-label={`Center ${title} and stop automatic movement`} onClick={()=>manual(distance)} tabIndex={accessible?0:-1} className={styles.card} data-center={emphasis===0} style={{'--scale':emphasis===0?1:emphasis===1?.91:.82} as CSSProperties}><span className={styles.panelShape} aria-hidden="true"><svg className={styles.panelAccents} viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false"><path d="M6 14V6H16M84 94H94V86M28 5H40L44 9H50M5 72V62L9 58V52M68 95H78" vectorEffect="non-scaling-stroke"/></svg></span><Icon aria-hidden="true"/><span className={styles.title}>{title}</span><span className={styles.caption}>Proposed service</span></button>
    </div>;})}
   </div>
  </div>
  <span className={styles.srOnly} aria-live={paused?'polite':'off'} aria-atomic="true">{institutionalCategories[index].title}, {index+1} of {institutionalCategories.length}</span>
 </div>;
}
