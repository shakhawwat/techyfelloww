'use client';
import Image from 'next/image';
import type {EditorialPage} from '@/lib/public/editorial';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen } from 'lucide-react';
import { Section } from '@/components/ui/section';
import { learningProfileCopy as copy } from '@/content/public-pages';
import { type ListResult } from '@/lib/public/pages';
import { academyDemoNotice } from './academy-demo-data';
import styles from './academy-catalog.module.css';
import catalogStyles from './academy-catalog-section.module.css';
import { academyCatalogEntries, academyCategories as categories, type AcademyCourse as Course } from './academy-catalog-data';
import { AcademyHeroSlider } from '@/components/academy/academy-hero-slider';
import {AcademyAddToCart} from '@/components/academy/academy-add-to-cart';
import { AcademyPrice } from '@/components/academy/academy-price';
import { WishlistButton } from '@/components/academy/wishlist';
import discovery from './academy-discovery.module.css';
import { AcademyLowerSections } from './academy-lower-sections';
import { AcademyTechnologySlider } from '@/components/academy/academy-technology-slider';

export function CourseMedia({course}:{course:Course}) {const [failed,setFailed]=useState(false);return <figure className={styles.media}>{course.image&&!failed?<Image src={course.image.src} alt={course.image.alt} fill sizes="(max-width:767px) 100vw, (max-width:1100px) 50vw, 33vw" onError={()=>setFailed(true)}/>:<BookOpen aria-hidden="true"/>}<figcaption>{course.demo ? course.image&&!failed?'Illustrative media':'Course icon':'Published course preview'}</figcaption></figure>;}
function CatalogThumbnail({course}:{course:Course}) {
  const [failed,setFailed]=useState(false);
  return <div className={catalogStyles.thumbnail}><figure>{course.image&&!failed?<Image src={course.image.src} alt={course.image.alt} fill sizes="(min-width:1440px) 285px, (min-width:1024px) 33vw, (min-width:560px) 50vw, 100vw" onError={()=>setFailed(true)}/>:<BookOpen aria-hidden="true"/>}</figure><WishlistButton course={course} iconOnly className={catalogStyles.wishlist}/></div>;
}
function CourseCard({course}:{course:Course}) {
  return <li className={catalogStyles.card} data-course-id={course.id} data-demo={course.demo}>
    <CatalogThumbnail course={course}/><div className={catalogStyles.cardBody}>
      <h3 title={course.title}>{course.title}</h3><p className={catalogStyles.description}>{course.description}</p>
      <div className={catalogStyles.tags}><span>{course.category??'Published course'}</span>{course.level&&<span className={catalogStyles.level} data-level={course.level}>{course.level}</span>}</div>
      <div className={catalogStyles.meta}>{!!course.modules.length&&<span>{course.modules.length} {course.demo?'proposed modules':'modules'}</span>}{course.duration&&!course.demo&&<span>{course.duration}</span>}{course.demo&&<span>Schedule to be confirmed</span>}</div>
      <AcademyPrice courseId={course.id} published={!course.demo} illustrative={course.illustrative}/><div className={catalogStyles.cardActions}><Link prefetch={false} className={`${catalogStyles.cardAction} ${catalogStyles.viewCourse}`} href={`/academy/courses/${course.id}`} aria-label={`View course: ${course.title}`}>View course<ArrowUpRight aria-hidden="true"/></Link><AcademyAddToCart cardAction courseId={course.id} className={`${catalogStyles.cardAction} ${catalogStyles.addCart}`}/></div>
    </div>
  </li>;
}
function CourseRow({title,id,courses}:{title:string;id:string;courses:Course[]}) {
  const track=useRef<HTMLUListElement>(null),[edges,setEdges]=useState({start:true,end:true});
  useEffect(()=>{const element=track.current;if(!element)return;const update=()=>setEdges({start:element.scrollLeft<=1,end:element.scrollLeft+element.clientWidth>=element.scrollWidth-2});update();const observer=new ResizeObserver(update);observer.observe(element);element.addEventListener('scroll',update,{passive:true});return()=>{observer.disconnect();element.removeEventListener('scroll',update);};},[courses]);
  function move(direction:number){const element=track.current;if(!element)return;const card=element.firstElementChild as HTMLElement|null;const step=(card?.offsetWidth??element.clientWidth)+18;element.scrollBy({left:direction*step,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  return <section className={discovery.collection} aria-labelledby={id}>
    <div className={discovery.rowHeading}><h2 id={id}>{title}</h2><div className={discovery.rowActions}><Link href="/academy/courses">View all<span className={discovery.srOnly}> published course information</span></Link><button type="button" aria-label={`Previous courses: ${title}`} aria-controls={`${id}-track`} disabled={edges.start} onClick={()=>move(-1)}><ArrowLeft aria-hidden="true"/></button><button type="button" aria-label={`Next courses: ${title}`} aria-controls={`${id}-track`} disabled={edges.end} onClick={()=>move(1)}><ArrowRight aria-hidden="true"/></button></div></div>
    {courses.length?<ul id={`${id}-track`} ref={track} className={discovery.track} tabIndex={0} aria-label={`${title}; scroll or use left and right arrow keys`} onKeyDown={event=>{if(event.target===event.currentTarget&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){event.preventDefault();move(event.key==='ArrowRight'?1:-1);}}}>{courses.map(course=><CourseCard key={course.id} course={course}/>)}</ul>:<p className={discovery.empty}>No courses in this collection match the current selection.</p>}
  </section>;
}
const pathways=[
  {title:'Robotics & Embedded Engineering',categories:['Robotics','IoT & Embedded'],description:'Connect circuit foundations, structured firmware and robot software into a practical learning plan.'},
  {title:'Applied AI & Computer Vision',categories:['AI & Vision'],description:'Explore image preparation, model baselines and transparent evaluation of intelligent systems.'},
  {title:'Research Engineering',categories:['Research'],description:'Develop reproducible computational workflows and plan a research question with clear evaluation criteria.'},
];
export function AcademyCatalog({result,page,initialSearch='',initialCategory='All'}:{result:ListResult;page?:EditorialPage|null;initialSearch?:string;initialCategory?:string}) {
  const section=(key:string)=>page?.sections.find(item=>item.key===key);
  const courses=academyCatalogEntries(result),[search,setSearch]=useState(initialSearch),[category,setCategory]=useState(courses.some(course=>course.category===initialCategory)?initialCategory:'All'),[level,setLevel]=useState('All'),[sort,setSort]=useState('preview');
  const availableCategories=categories.filter(item=>courses.some(course=>course.category===item));
  const otherCategories=[...new Set(courses.map(course=>course.category).filter((value):value is string=>!!value&&!categories.includes(value)))];
  const levels=[...new Set(courses.map(course=>course.level).filter((value):value is string=>!!value))];
  const query=search.trim().toLocaleLowerCase();const matching=courses.filter(course=>(category==='All'||course.category===category)&&(level==='All'||course.level===level)&&(!query||`${course.title} ${course.description}`.toLocaleLowerCase().includes(query)));
  if(sort!=='preview')matching.sort((a,b)=>sort==='title'?a.title.localeCompare(b.title):b.title.localeCompare(a.title));
  const demo=courses.some(course=>course.demo);
  const relatedAI=matching.filter(course=>course.category==='AI & Agents'||(!demo&&course.category==='AI & Vision'));
  const states=<>{result.state==='unavailable'?<p className={catalogStyles.state} role="status">{copy.academy.courseUnavailable}</p>:<>{!courses.length&&<p className={catalogStyles.state}>{copy.academy.courseEmpty}</p>}<p className={catalogStyles.count} role="status">{matching.length} {demo?'illustrative previews':'published course previews'}{result.data.length>0?` of ${result.pagination.total} published records`:''} · Search and filters apply to the available preview collection.</p>{courses.length>0&&!matching.length&&<div className={catalogStyles.state}><h3>No courses match your selection.</h3><p>Try another search, category or level.</p><button className={catalogStyles.action} type="button" onClick={()=>{setSearch('');setCategory('All');setLevel('All');}}>Clear search and filters</button></div>}</>}</>;
  return <><AcademyHeroSlider page={page}><nav className={styles.breadcrumbs} aria-label="Breadcrumb"><ol><li><Link href="/">Home</Link></li><li aria-current="page">Academy</li></ol></nav></AcademyHeroSlider>
    <Section tone="light" className={`${catalogStyles.catalog} ${discovery.showcase}`} aria-labelledby="academy-areas-title">
      <div className={discovery.showcaseLayout}><header><h2 id="academy-areas-title">Explore learning areas</h2><p className={discovery.intro}>{section('areas')?.description??'Build practical skills in engineering, intelligent systems and research. Find course requirements that fit your next step.'}</p><Link className={catalogStyles.action} href="/academy/courses">Explore published courses<ArrowUpRight aria-hidden="true"/></Link></header><ul className={discovery.showcaseTiles}>{pathways.map(pathway=>{const related=courses.filter(course=>course.category&&pathway.categories.includes(course.category));if(!related.length)return null;const image=related.find(course=>course.image)?.image;return <li key={pathway.title}><Link href={`/academy?category=${encodeURIComponent(related[0].category!)}#academy-catalog-results`}><div className={discovery.pathwayImage}>{image?<Image src={image.src} alt={image.alt} fill sizes="(max-width:767px) 45vw, 220px"/>:<BookOpen aria-hidden="true"/>}</div><h3>{pathway.title}</h3></Link></li>;})}</ul></div>
    </Section>
    <Section tone="light" className={`${catalogStyles.catalog} ${discovery.featured}`} aria-label="Featured course collection">
      <div className={catalogStyles.notice}><p>Paid checkout requires a configured payment provider. Course enrollment and lesson access follow the saved course settings; schedules and certification require confirmation.</p>{demo&&<p className={catalogStyles.demoNotice}>{academyDemoNotice} Images are illustrative; pathways are suggestions, not accredited qualifications.</p>}</div>
      {states}{matching.length>0&&<CourseRow title="Explore current skills" id="academy-featured" courses={matching}/>}
    </Section>
    <Section tone="light" className={`${catalogStyles.catalog} ${discovery.discovery}`} aria-labelledby="academy-catalog-title">
      <header><h2 id="academy-catalog-title">Discover skills and courses</h2><p className={discovery.intro}>Browse the available collection by learning area and starting level.</p></header>
      <div className={catalogStyles.categories} role="group" aria-label="Course categories">{['All',...availableCategories,...otherCategories].map(item=><button type="button" key={item} aria-pressed={category===item} onClick={()=>setCategory(item)}>{item}</button>)}</div>
      <div className={catalogStyles.toolbar}><label>Level<select aria-label="Level" value={level} onChange={event=>setLevel(event.target.value)}><option value="All">All levels</option>{levels.map(item=><option key={item}>{item}</option>)}</select></label><label>Sort<select aria-label="Sort" value={sort} onChange={event=>setSort(event.target.value)}><option value="preview">Preview order</option><option value="title">Title A–Z</option><option value="-title">Title Z–A</option></select></label></div>
      <div id="academy-catalog-results">{matching.length?<CourseRow title="Explore course previews" id="academy-discovery" courses={matching}/>:<p className={discovery.empty}>{result.state==='unavailable'?'Course information is currently unavailable.':'No courses match the current selection. Try another category, search or level.'}</p>}</div>
    </Section>
    <AcademyTechnologySlider/>
    <AcademyLowerSections page={page} courses={courses} demo={demo} aiRow={relatedAI.length>0?<CourseRow title="Explore AI course previews" id="academy-ai" courses={relatedAI}/>:null}/>
  </>;
}
