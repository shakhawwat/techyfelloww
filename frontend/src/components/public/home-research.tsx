'use client';
import {useHomeSection} from './home-editorial';
import Link from 'next/link';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowRight,BookOpen,CircleAlert,FlaskConical} from 'lucide-react';
import {Container} from '@/components/ui/container';
import {homeCopy} from '@/content/home';
import type {ContentState} from '@/lib/public/content';
import {publicationCitation,researchEntries,type ResearchEntry,type ResearchKind} from './home-research-data';
import {ResearchDetails} from './research-details';
import styles from './home-research.module.css';
function ResearchAction({href,children}:{href:string;children:ReactNode}){
 return <Link prefetch={false} href={href} className={styles.action}>{children}<ArrowRight aria-hidden="true"/></Link>;
}
function Availability({content,kind}:{content:ContentState;kind:ResearchKind}){
 const failed=content.state==='unavailable',Icon=failed?CircleAlert:kind==='research'?FlaskConical:BookOpen;
 const text=kind==='research'?(failed?homeCopy.research.unavailable:homeCopy.research.empty):(failed?homeCopy.research.publicationsUnavailable:homeCopy.research.publicationsEmpty);
 return <div className={styles.availability} role="status" data-state={failed?'unavailable':'empty'} data-reveal><Icon aria-hidden="true"/><p>{text}</p></div>;
}
function EntryList({content,kind,onOpen}:{content:ContentState;kind:ResearchKind;onOpen:(entry:ResearchEntry,trigger:HTMLButtonElement,citation?:boolean)=>void}){
 const entries=researchEntries(content,kind);
 if(!entries.length)return <Availability content={content} kind={kind}/>;
 return <ol className={styles.list}>{entries.map(entry=><li key={entry.id} className={styles.row} data-entry={entry.id} data-demo={entry.demo} data-kind={kind} data-reveal>
  <div className={styles.rowContent}>
   <h4>{kind==='research'||entry.demo?<button className={styles.titleButton} type="button" aria-haspopup="dialog" onClick={event=>onOpen(entry,event.currentTarget)}>{entry.title}</button>:<Link href={`/${kind}/${entry.id}`} prefetch={false}>{entry.title}</Link>}</h4>
   {kind==='publications'&&(entry.demo||entry.venue||entry.year)&&<p className={styles.metadata}>{entry.demo?'Example Journal · 2026 · Demo impact factor: 4.2 (2025)':[entry.venue,entry.year].filter(Boolean).join(' · ')}</p>}
   {kind==='research'&&(entry.demo||entry.stage==='active'||entry.teamAvailability)&&<p className={styles.metadata}>
    {(entry.demo?entry.demoStatus==='Ongoing':entry.stage==='active')&&<span className={styles.ongoing}>Ongoing</span>}
    {(entry.demo?entry.demoTeam:entry.teamAvailability)&&<>{(entry.demo?entry.demoStatus==='Ongoing':entry.stage==='active')&&' · '}<span className={(entry.demo?entry.demoTeam:entry.teamAvailability)==='Team members needed'?styles.teamNeeded:styles.teamComplete}>{entry.demo?entry.demoTeam:entry.teamAvailability}</span></>}
   </p>}
   <div className={styles.rowActions}>
    {publicationCitation(entry)&&<button type="button" className={styles.more} aria-haspopup="dialog" aria-label={`Cite ${entry.title}`} onClick={event=>onOpen(entry,event.currentTarget,true)}>Cite</button>}
    <button type="button" className={styles.more} aria-haspopup="dialog" aria-label={`More about ${entry.title}`} onClick={event=>onOpen(entry,event.currentTarget)}>More</button>
   </div>
  </div>
 </li>)}</ol>;
}
export function ResearchPublications({research,publications}:{research:ContentState;publications:ContentState}){
 const override=useHomeSection('research');
 const root=useRef<HTMLElement>(null);
 const [selected,setSelected]=useState<{entry:ResearchEntry;citation:boolean}|null>(null);
 function open(entry:ResearchEntry,trigger:HTMLButtonElement,citation=false){trigger.focus({preventScroll:true});setSelected({entry,citation});}
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
 return <section ref={root} id="research" tabIndex={-1} data-theme="dark" aria-labelledby="research-title" className={styles.section}>
  <div className={styles.circuit} aria-hidden="true"><svg viewBox="0 0 280 160" fill="none" focusable="false"><path d="M0 24H144V48H212V92H280 M0 48H120V72H188V116H280 M32 0V16H168V32H236V64H280"/><circle cx="144" cy="24" r="3"/><circle cx="212" cy="92" r="3"/></svg></div>
  <Container>
   <header className={styles.heading} data-reveal><p className={styles.label}>{override?.label??'RESEARCH & DEVELOPMENT'}</p><h2 id="research-title">{override?.title??<>Research.{' '}<span>Backed by evidence.</span></>}</h2><p className={styles.description}>{override?.description??'Explore applied research and publications across intelligent systems. Discover the methods, technologies and questions behind the work.'}</p></header>
   <div className={styles.columns}>
    <div className={styles.column} aria-labelledby="research-work-title"><h3 id="research-work-title" className={styles.columnTitle}><FlaskConical aria-hidden="true"/>Research</h3>
     <EntryList content={research} kind="research" onOpen={open}/>
     <ResearchAction href={override?.href??"/research"}>{override?.cta??'All research'}</ResearchAction>
    </div>
    <div className={styles.column} aria-labelledby="research-publications-title"><h3 id="research-publications-title" className={styles.columnTitle}><BookOpen aria-hidden="true"/>Publications</h3>
     <EntryList content={publications} kind="publications" onOpen={open}/>
     <ResearchAction href="/publications">All publications</ResearchAction>
    </div>
   </div>
  </Container>
  {selected&&<ResearchDetails key={`${selected.entry.kind}:${selected.entry.id}:${selected.citation}`} entry={selected.entry} citationOnly={selected.citation} onClose={()=>setSelected(null)}/>}
 </section>;
}
