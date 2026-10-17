import Link from 'next/link';
import {editorialPage} from '@/lib/public/server-editorial';
import {ArrowRight,ArrowUpRight,GraduationCap,Microscope,Cpu,MessagesSquare} from 'lucide-react';
import {learningProfileCopy as copy} from '@/content/public-pages';
import {publicOrigin} from '@/lib/public/server-pages';
import styles from './about-editorial.module.css';

const icons=[Cpu,Microscope,GraduationCap,MessagesSquare];
export async function AboutPage(){
 const content=await editorialPage('about'),base=copy.about,section=(key:string)=>content?.sections.find(item=>item.key===key);
 const page={...base,title:content?.title??base.title,description:content?.summary??base.description,eyebrow:section('hero')?.label??base.eyebrow,positioning:section('introduction')?.title??base.positioning,introduction:section('introduction')?.description??base.introduction,peopleTitle:section('people')?.title??base.peopleTitle,peopleText:section('people')?.description??base.peopleText,sections:base.sections.map((entry,index)=>{const item=section(`pillar-${index+1}`);return {...entry,title:item?.title??entry.title,text:item?.description??entry.text,href:item?.href??entry.href,link:item?.cta??entry.link};})},origin=publicOrigin();
 const breadcrumbs=origin?{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{name:'Home',item:origin},{name:page.title,item:`${origin}/about`}].map((item,index)=>({'@type':'ListItem',position:index+1,...item}))}:null;
 return <main id="public-main" tabIndex={-1} className={styles.page}>
  {breadcrumbs&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumbs).replace(/</g,'\\u003c')}}/>}
  <header className={styles.hero}>
   <div className={styles.container}>
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><ol><li><Link href="/">Home</Link></li><li><span aria-current="page">{page.title}</span></li></ol></nav>
    <p className={styles.eyebrow}>{page.eyebrow}</p>
    <h1>{section('hero')?.title??<>About <span>Techy Fellow</span></>}</h1>
    <p className={styles.tagline}>{page.description}</p>
   </div>
  </header>
  <div className={styles.container}>
   <section className={styles.introduction} aria-labelledby="about-introduction">
    <h2 id="about-introduction">{page.positioning}</h2>
    <p>{page.introduction}</p>
   </section>
   <section aria-label="Engineering, research, Academy and consulting" className={styles.pillars}>
    {page.sections.map((section,index)=>{const Icon=icons[index];return <article className={styles.pillar} key={section.title}>
     <Icon className={styles.icon} size={22} strokeWidth={1.5} aria-hidden="true"/>
     <div><h2>{section.title}</h2><p>{section.text}</p><Link prefetch={false} className={styles.action} href={section.href}>{section.link}<ArrowRight size={17} aria-hidden="true"/></Link></div>
    </article>;})}
   </section>
   <section className={styles.people} aria-labelledby="about-people">
    <div><h2 id="about-people">{page.peopleTitle}</h2><p>{page.peopleText}</p></div>
    <div className={styles.peopleActions}><Link prefetch={false} className={styles.action} href="/team">{page.teamLink}<ArrowUpRight size={18} aria-hidden="true"/></Link><Link prefetch={false} className={styles.action} href="/projects">{page.projectsLink}<ArrowUpRight size={18} aria-hidden="true"/></Link></div>
   </section>
   <section className={styles.contact} aria-labelledby="about-contact">
    <div><h2 id="about-contact">{section('contact')?.title??'Discuss your next step'}</h2><p>{section('contact')?.description??copy.inquiryAvailability}</p></div>
    <Link href="/contact" className={styles.contactButton}>{copy.inquiry}<ArrowUpRight size={18} aria-hidden="true"/></Link>
   </section>
   {content?.faqs?.length&&<section>{content.faqs.map(faq=><details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</section>}
  </div>
 </main>;
}
