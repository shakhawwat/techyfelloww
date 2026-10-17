'use client';
import {useHomeSection} from './home-editorial';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,CircleAlert,Users} from 'lucide-react';
import {Container} from '@/components/ui/container';
import type {ContentState} from '@/lib/public/content';
import {homeCopy} from '@/content/home';
import styles from './home-company.module.css';
import {CompanyProfile,TeamPortrait,DemoRating} from './company-profile';
import {CompanyCarousel} from './company-carousel';
import {companyProfiles,availableTeamFilters,matchesTeamFilter,type TeamFilter,type TeamProfile} from './company-data';
function Profile({entry,onOpen}:{entry:TeamProfile;onOpen:(entry:TeamProfile,trigger:HTMLButtonElement)=>void}){
 return <article className={styles.profile} data-company-reveal><TeamPortrait entry={entry}/><div className={styles.profileText}>{entry.demo&&<p className={styles.demoLabel}>Demo profile</p>}<h3>{entry.demo?entry.title:<Link href={`/team/${entry.slug}`} prefetch={false}>{entry.title}</Link>}</h3>{entry.demo&&<p className={styles.portraitDisclosure}>Fictional name · illustrative portrait</p>}{entry.role&&<p className={styles.role}>{entry.role}</p>}<DemoRating entry={entry}/><button type="button" className={styles.viewProfile} aria-haspopup="dialog" aria-label={`More about ${entry.title}`} onClick={event=>onOpen(entry,event.currentTarget)}>More<ArrowUpRight aria-hidden="true"/></button></div></article>;
}
export function HomeCompany({content}:{content:ContentState}){
 const override=useHomeSection('company');
 const [selected,setSelected]=useState<TeamProfile|null>(null),[filter,setFilter]=useState<TeamFilter>('All');
 const root=useRef<HTMLElement>(null),profiles=companyProfiles(content),failed=content.state==='unavailable';
 const filters=availableTeamFilters(profiles),current=filters.includes(filter)?filter:'All',shown=profiles.filter(profile=>matchesTeamFilter(profile,current));
 useEffect(()=>{if(!root.current||!('IntersectionObserver'in window))return;const motion=window.matchMedia('(prefers-reduced-motion: reduce)'),animations:Animation[]=[];const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;observer.unobserve(entry.target);if(!motion.matches)animations.push(entry.target.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:350,easing:'ease-out'}));}),{threshold:.15});root.current.querySelectorAll('[data-company-reveal]').forEach(element=>observer.observe(element));const cancel=()=>{if(motion.matches)animations.forEach(animation=>animation.cancel());};motion.addEventListener('change',cancel);return()=>{observer.disconnect();animations.forEach(animation=>animation.cancel());motion.removeEventListener('change',cancel);};},[]);
 return <section ref={root} id="company" tabIndex={-1} data-theme="dark" aria-labelledby="company-title" className={styles.section}><Container><div className={styles.layout}><header className={styles.introduction} data-company-reveal><h2 id="company-title">{override?.title??<>Researchers. Engineers.{' '}<span>One team.</span></>}</h2><p className={styles.description}>{override?.description??'Engineering and research at the core, with Academy and consulting alongside.'}</p><div className={styles.actions}><Link href={override?.href??"/team"} prefetch={false} className={styles.action}><Users aria-hidden="true"/>{override?.cta??'Explore team profiles'}<ArrowUpRight aria-hidden="true"/></Link></div></header><div className={styles.previews}><div className={styles.previewHeading}><Users aria-hidden="true"/><p className={styles.label}>TEAM PROFILES</p></div>{profiles.length?<><div className={styles.filters} role="group" aria-label="Filter team profiles">{filters.map(label=><button type="button" key={label} aria-pressed={current===label} onClick={()=>setFilter(label)}>{label}</button>)}</div><CompanyCarousel key={current} profiles={shown} popupOpen={selected!==null} renderProfile={entry=><Profile entry={entry} onOpen={(entry,trigger)=>{trigger.focus({preventScroll:true});setSelected(entry);}}/>}/></>:<div className={styles.availability} role="status" data-state={failed?'unavailable':'empty'} data-company-reveal>{failed&&<CircleAlert aria-hidden="true"/>}<p>{failed?homeCopy.company.unavailable:homeCopy.company.empty}</p></div>}</div></div></Container>{selected&&<CompanyProfile key={selected.slug} entry={selected} onClose={()=>setSelected(null)}/>}</section>;
}
