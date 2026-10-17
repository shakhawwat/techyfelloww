'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, GraduationCap } from 'lucide-react';
import { ExpandableMediaList } from './expandable-media-list';
import { CourseDetails } from './course-details';
import { CourseGallery } from './course-gallery';
import {AcademyAddToCart} from '@/components/academy/academy-add-to-cart';
import { AcademyPrice } from '@/components/academy/academy-price';
import { CourseLevel } from './course-level';
import { courseImage, type CoursePreview } from './academy-data';
import { safeHttps, type PublicRecord } from '@/lib/public/pages';
import { learningProfileCopy } from '@/content/public-pages';
import styles from './solution-project-list.module.css';

export function CourseList({ records }: { records: readonly PublicRecord[] }) {
  const [selected, setSelected] = useState<CoursePreview | null>(null);
  return <><ExpandableMediaList label="Academy courses" items={records.map(record => {
    const entry: CoursePreview = { ...record, demo: false, modules: record.syllabus };
    const image = courseImage(entry), enrollment = safeHttps(entry.enrollmentUrl);
    return { id: entry.slug, title: entry.title, description: entry.summary,
      media: image ? { src: image.url, alt: image.altText } : undefined,
      fallback: <GraduationCap aria-hidden="true"/>,
      metadata: <><CourseLevel level={entry.level}/>{entry.deliveryMode && <p>{entry.deliveryMode.replaceAll('-', ' ')}</p>}{entry.duration && <p>Duration: {entry.duration.value} {entry.duration.unit}</p>}<AcademyPrice courseId={entry.slug} published illustrative={entry.illustrative}/><AcademyAddToCart courseId={entry.slug}/></>,
      details: <div className={styles.scope}>
        {!!record.prerequisites.length && <section><h4>Prerequisites</h4><ul>{record.prerequisites.map(item => <li key={item}>{item}</li>)}</ul></section>}
        {!!record.syllabus.length && <section><h4>Syllabus</h4>{record.syllabus.map((module, index) => <div key={`${module.title}-${index}`}><h4>{module.title}</h4><ul>{module.topics.map(topic => <li key={topic}>{topic}</li>)}</ul></div>)}</section>}
        <section><h4>Course availability</h4><p>{learningProfileCopy.courseAvailability}</p></section>
        <CourseGallery entry={entry}/>
        <Link prefetch={false} className={styles.action} href={enrollment ?? `/academy/courses/${record.slug}#course-inquiry`} {...(enrollment ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{enrollment ? 'Enroll' : 'Express interest'}<ArrowUpRight aria-hidden="true"/></Link>
        <Link prefetch={false} className={styles.action} href={`/academy/courses/${record.slug}`}>Published course record<ArrowUpRight aria-hidden="true"/></Link>
        <button type="button" aria-haspopup="dialog" className={styles.popupAction} onClick={event => {event.currentTarget.focus({ preventScroll: true }); setSelected(entry);}}>Open course media and details<ArrowUpRight aria-hidden="true"/></button>
      </div>,
    };
  })}/>{selected && <CourseDetails academyPricing key={selected.slug} entry={selected} onClose={() => setSelected(null)}/>}</>;
}
