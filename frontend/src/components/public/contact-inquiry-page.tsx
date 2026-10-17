import Link from 'next/link';
import {editorialPage} from '@/lib/public/server-editorial';
import {MessagesSquare,Compass,Lightbulb,ArrowRight} from 'lucide-react';
import {parseListQuery} from '@/lib/public/pages';
import {contentList} from '@/lib/public/server-pages';
import {inquiryPrefill,type InquirySearch,type CourseChoices} from '@/lib/inquiry/schema';
import {InquiryForm} from './inquiry-form';
import styles from './contact-inquiry-page.module.css';

export async function ContactInquiryPage({search}:{search:InquirySearch}){
 const result=await contentList('courses',parseListQuery('courses',{limit:'100',sort:'title'}));
 const courses:CourseChoices=result.state==='unavailable'?{state:'unavailable',data:[]}:{state:'available',data:result.data.map(course=>({slug:course.slug,title:course.title}))};
 const type=inquiryPrefill(search);
 const [content,company]=await Promise.all([editorialPage('contact'),editorialPage('company')]);
 const section=(key:string)=>content?.sections.find(item=>item.key===key);
 return <main id="public-main" tabIndex={-1} className={styles.page}><div className={styles.container}>
  <header className={styles.hero}><nav className={styles.breadcrumb} aria-label="Breadcrumb"><ol><li><Link href="/">Home</Link></li><li><span aria-current="page">Contact</span></li></ol></nav><p className={styles.eyebrow}>Start a conversation</p><h1>{content?.title??<>Contact <span>Techy Fellow.</span></>}</h1><p className={styles.introduction}>{content?.summary??'Share the problem, context and support you want to discuss.'}</p></header>
  <div className={styles.layout}>
   <aside className={styles.guidance} aria-labelledby="contact-guidance"><h2 id="contact-guidance">{section('guidance')?.title??'Tell us where you are.'}</h2><p>{section('guidance')?.description??'A little context helps make your inquiry useful. Choose the inquiry type that fits, then describe what you want to explore.'}</p><ul className={styles.steps}>
    <li><Lightbulb size={21} strokeWidth={1.5} aria-hidden="true"/><div><h3>Describe the problem</h3><p>What are you trying to understand, build or improve? Include the constraints that matter.</p></div></li>
    <li><Compass size={21} strokeWidth={1.5} aria-hidden="true"/><div><h3>Share your current stage</h3><p>Explain what you have explored so far and what data, hardware or project context is available.</p></div></li>
    <li><MessagesSquare size={21} strokeWidth={1.5} aria-hidden="true"/><div><h3>Explain the support you need</h3><p>Describe the questions or next steps you would like to discuss.</p></div></li>
   </ul><section className={styles.next}><h3>What happens next</h3><p>A successful submission saves your inquiry and returns a reference. It does not confirm a booking, enrollment or delivery date.</p><p>Email notifications are not enabled.</p>{company?.contactEmail&&<p><a href={`mailto:${company.contactEmail}`}>{company.contactEmail}</a></p>}{company?.contactPhone&&<p>{company.contactPhone}</p>}{company?.contactAddress&&<p>{company.contactAddress}</p>}{!company?.contactEmail&&!company?.contactPhone&&!company?.contactAddress&&<p>Verified direct company contact details have not been supplied.</p>}{content?.faqs?.map(faq=><details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</section>
   </aside>
   <section className={styles.formPanel} aria-labelledby="contact-form-title"><div className={styles.formHeading}><h2 id="contact-form-title">Your inquiry</h2><ArrowRight size={22} aria-hidden="true"/></div><InquiryForm key={type} initialType={type} source="contact" chooseType courses={courses} contactPresentation/></section>
  </div>
 </div></main>;
}
