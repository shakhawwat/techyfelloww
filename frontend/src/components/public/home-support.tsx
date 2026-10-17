'use client';
import {useHomeSections,useHomeSection} from './home-editorial';
import Link from 'next/link';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowRight,ArrowUpRight,CircleAlert,FlaskConical,GraduationCap,Rocket} from 'lucide-react';
import {Container} from '@/components/ui/container';
import {homeCopy} from '@/content/home';
import {serviceCopy,serviceDefinition} from '@/content/services';
import type {ContentState} from '@/lib/public/content';
import styles from './home-support.module.css';
import {InstitutionalCarousel} from './institutional-carousel';
import {academyPreviews,type CoursePreview} from './academy-data';
import {CourseDetails} from './course-details';
import {AcademyCarousel} from './academy-carousel';
function Action({href,children}:{href:string;children:ReactNode}){return <Link href={href} prefetch={false} className={styles.action}>{children}<ArrowRight aria-hidden="true"/></Link>;}
function Circuit(){return <svg className={styles.circuit} viewBox="0 0 240 140" fill="none" aria-hidden="true" focusable="false"><path d="M0 24H120V48H180V88H240M0 48H96V72H156V112H240M32 0V16H144V32H208V64H240"/><circle cx="120" cy="24" r="3"/><circle cx="180" cy="88" r="3"/></svg>;}
function Consulting(){
 const override=useHomeSection('consulting'),sections=useHomeSections();
 const rows=[{title:homeCopy.consulting.topics[0],slug:'capstone',Icon:GraduationCap},{title:homeCopy.consulting.topics[1],slug:'research',Icon:FlaskConical},{title:homeCopy.consulting.topics[2],slug:'startup',Icon:Rocket}];
 return <section id="consulting" tabIndex={-1} data-theme="dark" aria-labelledby="consulting-title" className={`${styles.section} ${styles.consulting}`}><Circuit/><Container><div className={styles.consultingGrid}>
  <header className={styles.heading} data-reveal><p className={styles.label}>{override?.label??'TECHNICAL CONVERSATIONS'}</p><h2 id="consulting-title">{override?.title??<>Your challenge.{' '}<span>Our engineering perspective.</span></>}</h2><p className={styles.description}>{override?.description??homeCopy.consulting.description}</p><Action href={override?.href??"/consulting"}>{override?.cta??homeCopy.consulting.cta}</Action></header>
  <div><ul className={styles.serviceRows}>{rows.map(({title:defaultTitle,slug,Icon},index)=>{const title=sections.find(section=>section.key===`consulting-${index+1}`)?.title??defaultTitle;const service=serviceDefinition('consulting',slug);const content=<><Icon aria-hidden="true"/><span>{title}</span>{service&&<ArrowUpRight aria-hidden="true"/>}</>;return <li key={slug} data-reveal>{service?<Link prefetch={false} href={`/consulting/${service.slug}`}>{content}</Link>:<div>{content}</div>}</li>;})}</ul><p className={styles.integrity} data-reveal>{serviceCopy.integrity}</p></div>
 </div></Container></section>;
}
function Institutions(){
 const override=useHomeSection('institutional');
 return <section id="institutional" tabIndex={-1} data-theme="dark" aria-labelledby="institutional-title" className={`${styles.section} ${styles.institutions}`}><Circuit/><Container>
  <header className={styles.heading} data-reveal><p className={styles.label}>{override?.label??'FOR INSTITUTIONS'}</p><h2 id="institutional-title">{override?.title??<>Build your lab.{' '}<span>Grow your program.</span></>}</h2><p className={styles.description}>{override?.description??homeCopy.institutional.description}</p></header>
  <InstitutionalCarousel/>
  <Action href={override?.href??"/institutional"}>{override?.cta??homeCopy.institutional.cta}</Action>
 </Container></section>;
}
function Academy({content}:{content:ContentState}){
 const override=useHomeSection('academy');
 const entries=academyPreviews(content),available=entries.length>0,failed=content.state==='unavailable';
 const [selected,setSelected]=useState<CoursePreview|null>(null);
 function open(entry:CoursePreview,trigger:HTMLButtonElement){trigger.focus({preventScroll:true});setSelected(entry);}
 return <section id="academy" tabIndex={-1} data-theme="dark" aria-labelledby="academy-title" className={`${styles.section} ${styles.academy}`}><Circuit/><Container><div className={styles.academyGrid}>
  <header className={`${styles.heading} ${styles.academyIntro}`} data-reveal><p className={styles.label}>{override?.label??'ACADEMY'}</p><h2 id="academy-title">{override?.title??<>Learn. Build.{' '}<span>Apply.</span></>}</h2><p className={styles.description}>{override?.description??'Explore practical learning pathways in robotics, embedded systems and AI.'}</p></header>
  <div className={styles.academyPreview} data-reveal><div className={styles.previewHeading}><GraduationCap aria-hidden="true"/><p className={styles.label}>COURSE PREVIEWS</p></div>
   {available?<AcademyCarousel entries={entries} onOpen={open}/>:<div className={styles.learningAvailability} data-state={failed?'unavailable':'empty'} role="status">{failed&&<CircleAlert aria-hidden="true"/>}<p>{failed?homeCopy.academy.unavailable:homeCopy.academy.empty}</p></div>}
   {entries.some(entry=>entry.demo)&&<p className={styles.previewNote}>Proposed programs; schedules and enrollment are not yet confirmed.</p>}
  </div>
  <div className={styles.academyBrowse}><Action href="/academy/courses">Explore published courses</Action></div>
 </div></Container>{selected&&<CourseDetails key={selected.slug} entry={selected} onClose={()=>setSelected(null)}/>}</section>;
}
export function HomeSupportSections({courses}:{courses:ContentState}){
 const sections=useHomeSections();
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');if(!root.current||!('IntersectionObserver'in window))return;
  const animations:Animation[]=[];const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;observer.unobserve(entry.target);if(!motion.matches&&'animate'in entry.target)animations.push(entry.target.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,easing:'ease-out'}));}),{threshold:.15});
  root.current.querySelectorAll('[data-reveal]').forEach(element=>observer.observe(element));const cancel=()=>{if(motion.matches)animations.forEach(animation=>animation.cancel());};motion.addEventListener('change',cancel);
  return()=>{observer.disconnect();animations.forEach(animation=>animation.cancel());motion.removeEventListener('change',cancel);};
 },[]);
 return <div ref={root}>{sections.find(s=>s.key==='consulting')?.visible!==false&&<Consulting/>}{sections.find(s=>s.key==='institutional')?.visible!==false&&<Institutions/>}{sections.find(s=>s.key==='academy')?.visible!==false&&<Academy content={courses}/>} </div>;
}
