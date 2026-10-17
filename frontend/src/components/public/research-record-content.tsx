import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { inquiryHref } from '@/lib/inquiry/schema';
import { doiUrl, researchStages, safeHttps, type PublicRecord } from '@/lib/public/pages';
import styles from './research-page.module.css';

export const researchScopeNotice = 'This describes the research lifecycle. This record is editorially published; publication does not mean the research is completed.';

export function ResearchMetadata({ record }: { record: PublicRecord }) {
  const stage = researchStages.find(value => value === record.researchStage);
  return <div className={styles.metadata}>{record.domain && <span>Research area: {record.domain}</span>}{stage && <span>Research stage: {stage}</span>}</div>;
}

export function ResearchCollaboration({ record }: { record?: PublicRecord }) {
  // Team requirements are explicit editorial fields. Research stage and contributor counts never imply an opening.
  return <div className={styles.collaboration}>
    <Link prefetch={false} href={inquiryHref('research')} className={styles.action}>Discuss collaboration<ArrowUpRight aria-hidden="true"/></Link>
    {record && <p className={styles.note}>Mention this research title in your inquiry: <strong>{record.title}</strong>.</p>}
    <p className={styles.note}>An inquiry does not confirm team membership or availability. Email notifications are not enabled.</p>
  </div>;
}

function ResearchList({ title, items }: { title: string; items: readonly string[] }) {
  return items.length ? <section><h3>{title}</h3><ul>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section> : null;
}

export function ResearchRecordContent({ record, overview = true }: { record: PublicRecord; overview?: boolean }) {
  const stage = researchStages.find(value => value === record.researchStage);
  const doi = doiUrl(record.doi), publisher = safeHttps(record.publisherUrl);
  return <div className={styles.recordContent}>
    {record.illustrativeNotice&&<p className={styles.note}>{record.illustrativeNotice}</p>}
    {record.details?.map((block,index)=><section key={`${block.title}-${index}`}><h3>{block.title}</h3>{block.text&&<p>{block.text}</p>}{!!block.items?.length&&<ul>{block.items.map((item,i)=><li key={i}>{item}</li>)}</ul>}</section>)}
    {overview && <section><h3>Research overview</h3><p>{record.summary}</p></section>}
    {/* Only decoded, supplied fields appear. Missing questions, datasets,
        evaluation plans, supervisors and expected outputs are omitted. */}
    {!!record.methods.length && <section><h3>{stage === 'planned' ? 'Methods for planned research' : 'Methods described in the record'}</h3><ul>{record.methods.map((method, index) => <li key={`${method}-${index}`}>{method}</li>)}</ul><p className={styles.note}>Methods are reproduced as supplied. Listing a method does not establish that it has been carried out.</p></section>}
    <ResearchList title="Tools and technologies listed in the record" items={record.technologies}/>
    {stage && <section><h3>Research stage</h3><p>{stage}</p><p className={styles.note}>{researchScopeNotice}</p></section>}
    <ResearchList title="Documented results" items={record.results}/>
    <ResearchList title="Contributors" items={record.contributors.map(person => person.name)}/>
    <ResearchList title="Team requirements" items={record.teamRequirements??[]}/>
    {!!record.approvedLinks?.length&&<section><h3>Approved links</h3><div className={styles.links}>{record.approvedLinks.map(link=><a key={link.url} href={link.url} rel="noopener noreferrer">{link.label}</a>)}</div></section>}
    {!!record.documents?.length&&<section><h3>Public documents</h3>{record.documents.map(doc=><p key={doc.url}><a href={doc.url} download rel="noopener noreferrer">{doc.altText}</a></p>)}</section>}
    <section><h3>Collaboration inquiries</h3><ResearchCollaboration record={record}/></section>
    {(doi || publisher) && <section><h3>Verified paper links</h3><div className={styles.links}>{doi && <a className={styles.textLink} href={doi} rel="noopener noreferrer">Open DOI record<ArrowUpRight aria-hidden="true"/></a>}{publisher && publisher !== doi && <a className={styles.textLink} href={publisher} rel="noopener noreferrer">Open publisher page<ArrowUpRight aria-hidden="true"/></a>}</div></section>}
  </div>;
}
