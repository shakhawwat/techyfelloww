'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Code2,Play} from 'lucide-react';
import {ConfirmAction} from '@/components/admin/confirm';
import {inquiryHref} from '@/lib/inquiry/schema';
import {safeHttps} from '@/lib/public/pages';
import {conceptNotice,type ProjectConcept} from './project-directory-concepts';
import {ProjectDirectoryImage} from './project-directory-image';
import styles from './project-directory.module.css';
function ConceptPopup({project,onClose}:{project:ProjectConcept;onClose:()=>void}){
 const [closing,setClosing]=useState(false),pending=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 function close(){if(pending.current)return;pending.current=true;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){onClose();return;}setClosing(true);timer.current=setTimeout(onClose,220);}
 function list(title:string,values:string[]){return <section><h3>{title}</h3><ul>{values.map(value=><li key={value}>{value}</li>)}</ul></section>;}
 function resourceUrl(value:string|undefined,hosts:string[]){const safe=safeHttps(value);return safe&&hosts.includes(new URL(safe).hostname)?safe:undefined;}
 const github=resourceUrl(project.githubUrl,['github.com','www.github.com']),youtube=resourceUrl(project.youtubeUrl,['youtube.com','www.youtube.com','youtu.be']);
 return <ConfirmAction title={project.title} busy={false} onCancel={close} onEscape={close} presentation="details" className={`${styles.dialog}${closing?` ${styles.dialogClosing}`:''}`} headerClassName={styles.dialogHeader} contentClassName={styles.dialogContent} detailsLabel="Project concept details" closeLabel="Close project concept">
  <p className={styles.conceptNotice}>{conceptNotice}</p><p className={styles.category}>{project.category} · Proposed concept</p><ProjectDirectoryImage image={project.image}/><p className={styles.mediaCaption}>{project.image?.altText??'No illustrative image supplied.'}</p>
  <section><h3>Overview</h3><p>{project.summary}</p></section><section><h3>Problem statement</h3><p>{project.problem}</p></section><section><h3>Proposed approach</h3><p>{project.approach}</p></section><section><h3>Proposed system architecture</h3><p>{project.architecture}</p></section>
  {list('Proposed technologies',project.technologies)}{list('Illustrative development scope',project.scope)}{list('Evaluation plan',project.evaluation)}{list('Expected outputs — not achieved results',project.outputs)}<section><h3>Achieved results</h3><p>None are claimed. This is a locally defined illustrative proposal, not completed or evaluated Techyfellow work.</p></section>
  <section aria-label="Project resources"><h3>Project resources</h3><div className={styles.resourceActions}>{github?<a href={github} target="_blank" rel="noopener noreferrer" className={styles.resourceButton}><Code2 size={18} aria-hidden="true"/>GitHub<ArrowUpRight size={16} aria-hidden="true"/></a>:<button type="button" disabled className={styles.resourceButton} aria-describedby="concept-resource-note"><Code2 size={18} aria-hidden="true"/>GitHub · Not supplied</button>}{youtube?<a href={youtube} target="_blank" rel="noopener noreferrer" className={styles.resourceButton}><Play size={18} aria-hidden="true"/>YouTube<ArrowUpRight size={16} aria-hidden="true"/></a>:<button type="button" disabled className={styles.resourceButton} aria-describedby="concept-resource-note"><Play size={18} aria-hidden="true"/>YouTube · Not supplied</button>}</div>{(!github||!youtube)&&<p id="concept-resource-note" className={styles.mediaCaption}>Buttons become available when links are supplied for this concept.</p>}</section>
  <Link href={inquiryHref('engineering')} className={styles.view}>Build With Us<ArrowUpRight size={17} aria-hidden="true"/></Link>
 </ConfirmAction>;
}
export function ProjectConceptPreviews({projects}:{projects:ProjectConcept[]}){
 const [selected,setSelected]=useState<ProjectConcept|null>(null);
 return <><div className={styles.grid}>{projects.map(project=><article key={project.id} data-concept-id={project.id} className={styles.card}><button type="button" className={styles.imageButton} aria-label={`Open concept: ${project.title}`} aria-haspopup="dialog" onClick={()=>setSelected(project)}><ProjectDirectoryImage image={project.image}/></button><div className={styles.cardBody}><p className={styles.demoLabel}>Illustrative concept · illustrative image</p><p className={styles.category}>{project.category}</p><h2>{project.title}</h2><ul className={styles.tags} aria-label="Proposed technologies">{project.technologies.map(value=><li key={value}>{value}</li>)}</ul><p className={styles.problem}>{project.problem}</p><button type="button" className={`${styles.view} ${styles.viewButton}`} aria-haspopup="dialog" aria-label={`View project: ${project.title}`} onClick={()=>setSelected(project)}>View project<ArrowUpRight size={17} aria-hidden="true"/></button></div></article>)}</div>{selected&&<ConceptPopup project={selected} onClose={()=>setSelected(null)}/>}</>;
}
