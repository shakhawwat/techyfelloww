'use client';
import {useEffect,useRef,useState,type ReactNode,type PointerEvent} from 'react';
import Image from 'next/image';
import {ArrowUpRight,UserRound} from 'lucide-react';
import {ConfirmAction} from '@/components/admin/confirm';
import {directoryPortrait,illustrativeNotice,type DirectoryDemo} from './team-directory-data';
import styles from './team-directory.module.css';
function TeamProfilePopup({profile,onClose,children}:{profile:DirectoryDemo;onClose:()=>void;children:ReactNode}){
 const [closing,setClosing]=useState(false),closingRef=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),backdropPointer=useRef<number|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 function close(){if(closingRef.current)return;closingRef.current=true;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){onClose();return;}setClosing(true);timer.current=setTimeout(onClose,240);}
 function outside(event:PointerEvent<HTMLDivElement>){const target=event.target;if(!(target instanceof HTMLDialogElement))return false;const rect=target.getBoundingClientRect();return event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom;}
 return <div onPointerDownCapture={event=>{backdropPointer.current=outside(event)?event.pointerId:null;}} onPointerUpCapture={event=>{if(backdropPointer.current===event.pointerId&&outside(event))close();backdropPointer.current=null;}} onAnimationEnd={event=>{if(closingRef.current&&event.animationName.includes('teamPopupOut')&&event.target instanceof HTMLDialogElement&&!event.nativeEvent.pseudoElement){if(timer.current)clearTimeout(timer.current);onClose();}}}>
  <ConfirmAction title={profile.title} busy={false} onCancel={close} onEscape={close} presentation="details" className={`${styles.dialog}${closing?` ${styles.dialogClosing}`:''}`} headerClassName={styles.dialogHeader} contentClassName={styles.dialogContent} detailsLabel="Illustrative profile details" closeLabel="Close profile">{children}</ConfirmAction>
 </div>;
}
function DemoPortrait({profile,details=false}:{profile:DirectoryDemo;details?:boolean}){
 const portrait=directoryPortrait(profile.slug),[failed,setFailed]=useState(false);
 const sizeClass=details?styles.detailPortrait:profile.classification==='board'?styles.boardPortrait:styles.teamPortrait;
 return <div className={`${styles.demoPortrait} ${sizeClass}`}>
  {portrait&&!failed?<Image src={portrait.src} alt={`Illustrative portrait used for ${profile.title}; the fictional profile does not identify the pictured person.`} fill sizes={details?'260px':profile.classification==='team'?'176px':'(max-width: 600px) calc(100vw - 40px), (max-width: 1100px) calc((100vw - 88px) / 2), 292px'} loading="lazy" style={{objectFit:'cover',objectPosition:portrait.position}} onError={()=>setFailed(true)}/>:<><UserRound size={64} strokeWidth={1} aria-hidden="true"/><span>Illustrative avatar</span></>}
 </div>;
}
export function DemoProfiles({profiles}:{profiles:DirectoryDemo[]}){
 const [selected,setSelected]=useState<DirectoryDemo|null>(null);
 return <><div className={styles.grid}>{profiles.map(profile=><article key={profile.slug} className={styles.profile} data-classification={profile.classification}>
  <DemoPortrait profile={profile}/>
  <div className={styles.profileText}><p className={styles.demoLabel}>Illustrative profile</p><h3 className={styles.memberName}>{profile.title}</h3><p className={styles.role}>{profile.role}</p>{!!profile.expertise.length&&<p className={styles.expertise}>{profile.expertise.join(' · ')}</p>}<p className={styles.biography}>{profile.summary}</p><button type="button" className={`${styles.view} ${styles.profileButton}`} aria-haspopup="dialog" aria-label={`View profile: ${profile.title}`} onClick={()=>setSelected(profile)}>View profile<ArrowUpRight size={17} aria-hidden="true"/></button></div>
 </article>)}</div>{selected&&<TeamProfilePopup profile={selected} onClose={()=>setSelected(null)}><p className={styles.demoNotice}>{illustrativeNotice}</p><DemoPortrait key={selected.slug} profile={selected} details/><p className={styles.role}>{selected.role}</p><h3>Illustrative biography</h3><p>{selected.summary}</p>{!!selected.expertise.length&&<><h3>Illustrative expertise</h3><ul>{selected.expertise.map(value=><li key={value}>{value}</li>)}</ul></>}<p>No qualifications, appointments or achievements are claimed by this example.</p></TeamProfilePopup>}</>;
}
