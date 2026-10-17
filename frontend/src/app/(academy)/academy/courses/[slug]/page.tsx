import { detailMetadata } from '@/components/public/content-pages';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { contentDetail, contentList } from '@/lib/public/server-pages';
import { parseListQuery } from '@/lib/public/pages';
import { academyCatalogEntries } from '@/components/public/academy-catalog-data';
import { InquiryForm } from '@/components/public/inquiry-form';
import { AcademyCourseView } from '@/components/academy/academy-course-view';
import { academyDemos } from '@/components/public/academy-demo-data';
import { learningProfileCopy as copy } from '@/content/public-pages';
import styles from '@/components/academy/academy-area.module.css';
export const dynamic='force-dynamic';
type Props={params:Promise<{slug:string}>};
async function getCourse(slug:string){
 const result=await contentDetail('courses',slug);if(result.state==='available')return {state:'available',course:academyCatalogEntries({state:'available',data:[result.data],pagination:{page:1,limit:1,total:1,totalPages:1}})[0]} as const;
 if(result.state==='missing'&&academyDemos.some(course=>course.id===slug)){const course=academyCatalogEntries({state:'available',data:[],pagination:{page:1,limit:20,total:0,totalPages:0}}).find(course=>course.id===slug);return course?{state:'available',course} as const:{state:'missing'} as const;}
 return {state:result.state};
}
export async function generateMetadata({params}:Props){const slug=(await params).slug;const result=await getCourse(slug);if(result.state==='available'&&result.course&&!result.course.demo&&!result.course.illustrative)return detailMetadata('courses',slug);return {title:result.state==='available'&&result.course?`${result.course.title} | Techyfellow Academy`:'Course information | Techyfellow Academy',...(result.state!=='available'||result.course?.demo||result.course?.illustrative?{robots:{index:false,follow:false}}:{})};}
export default async function CoursePage({params}:Props){const result=await getCourse((await params).slug);if(result.state==='missing')notFound();if(result.state!=='available'||!result.course)return <main id="public-main" tabIndex={-1} className={styles.page}><h1>Course information unavailable</h1><p role="status">{copy.academy.courseUnavailable}</p><div className={styles.actions}><Link href="/academy" className={styles.button}>Explore Academy</Link></div></main>;const relatedResult=await contentList('courses',parseListQuery('courses',{limit:'20'}));const related=result.course.demo?academyCatalogEntries({state:'available',data:[],pagination:{page:1,limit:20,total:0,totalPages:0}}):relatedResult.state==='available'?academyCatalogEntries(relatedResult).filter(course=>!course.demo):[];return <AcademyCourseView key={result.course.id} course={result.course} related={related}>{!result.course.demo&&<section id="course-inquiry"><h2>Discuss this published course</h2><InquiryForm initialType="course-interest" source="academy" initialCourse={result.course.id} courses={{state:'available',data:[{slug:result.course.id,title:result.course.title}]}}/></section>}</AcademyCourseView>;}
