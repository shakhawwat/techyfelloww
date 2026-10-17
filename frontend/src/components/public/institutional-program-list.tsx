'use client';

import type {EditorialPage} from '@/lib/public/editorial';
import Link from 'next/link';
import { institutionalProgramMedia } from '@/content/institutional-program-media';
import { ArrowUpRight } from 'lucide-react';
import { institutionalPrograms, type InstitutionalAudience } from '@/content/institutional-programs';
import { serviceGroups } from '@/content/services';
import { inquiryHref } from '@/lib/inquiry/schema';
import styles from './institutional-program-list.module.css';
import { ExpandableMediaList } from './expandable-media-list';

function Items({ title, items }: { title: string; items: readonly string[] }) {
  return <section><h4>{title}</h4><ul>{items.map(item => <li key={item}>{item}</li>)}</ul></section>;
}
export function InstitutionalProgramList({ audience,published=[] }: { audience?: InstitutionalAudience;published?:EditorialPage[] }) {
  const approved=published.filter(program=>!audience||!program.programAudience||program.programAudience===audience);
  if(approved.length)return <ExpandableMediaList label="Published institutional programs" viewLabel="View program scope" hideLabel="Hide program scope" items={approved.map(program=>{const image=program.media?.find(media=>media.type==='image');return {id:program.slug,title:program.title,description:program.summary,metadata:program.illustrativeNotice??'Published program scope · Availability requires confirmation',media:image?{src:image.url,alt:image.altText}:undefined,details:<div className={styles.scope}>{program.details?.map(block=><section key={block.title}><h4>{block.title}</h4>{block.text&&<p>{block.text}</p>}{block.items&&<ul>{block.items.map(item=><li key={item}>{item}</li>)}</ul>}</section>)}{program.blocks?.map(block=><section key={block.title}><h4>{block.title}</h4>{block.text&&<p>{block.text}</p>}{block.items&&<ul>{block.items.map(item=><li key={item}>{item}</li>)}</ul>}</section>)}<Items title="Capabilities" items={program.capabilities??[]}/><Items title="Deliverables" items={program.deliverables??[]}/><Items title="Responsibilities" items={program.responsibilities??[]}/>{program.faqs?.map(faq=><details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}<Link className={styles.action} href={program.inquiryHref??inquiryHref('institutional')}>Discuss this program<ArrowUpRight aria-hidden="true"/></Link></div>};})}/>;
  const programs = institutionalPrograms.filter(program => !audience || program.audience === audience);
  return <ExpandableMediaList label="Illustrative institutional programs" viewLabel="View program scope" hideLabel="Hide program scope" items={programs.map(program => {
    const institution = serviceGroups.institutional.items.find(item => item.slug === program.audience)!;
    const image = institutionalProgramMedia[program.title];
    return { id: program.title, title: program.title, description: program.description,
      metadata: `${institution.title} · Illustrative program`,
      media: image ? { ...image, illustrative: true } : undefined,
      overviewTitle: 'Program overview',
      mediaCaption: 'Illustrative media — not a delivered Techyfellow program.',
      details: <div className={styles.scope}>
        <Items title="Purpose and proposed objectives" items={program.objectives}/>
        <Items title="Illustrative activities" items={program.activities}/>
        <Items title="Suggested participant prerequisites" items={program.prerequisites}/>
        <Items title="Facilities, equipment and information needed" items={program.resources}/>
        <section><h4>Indicative outputs</h4><p>Outputs depend on an agreed brief; these examples are not achieved results.</p><ul>{program.outputs.map(item => <li key={item}>{item}</li>)}</ul></section>
        <Items title="Institution responsibilities" items={institution.responsibilities}/>
        <section><h4>Proposed Techyfellow responsibilities</h4><p>Discuss objectives and available resources, prepare the agreed scope or activity outline, and review agreed material or outputs. Delivery responsibilities must be confirmed before work is scheduled.</p></section>
        <section><h4>Delivery format and duration</h4><p>Delivery format: To be agreed.</p><p>Duration: To be agreed.</p></section>
        <section className={styles.qualifications}><h4>Scope and availability</h4><p>These are proposed examples, not completed engagements or confirmed bookings. Equipment procurement, certificates and ongoing support are not automatically included; any such requirements need separate discussion.</p><p>Mention the program title in your inquiry. Submitting an inquiry does not confirm availability or a booking.</p></section>
        <Link className={styles.action} href={inquiryHref('institutional')}>Discuss this program<ArrowUpRight aria-hidden="true"/></Link>
      </div>,
    };
  })}/>;
}
