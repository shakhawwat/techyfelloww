import Link from 'next/link';
import {editorialPage} from '@/lib/public/server-editorial';
import { notFound } from 'next/navigation';
import { ArrowRight, ArrowUpRight, BookOpen } from 'lucide-react';
import { inquiryHref } from '@/lib/inquiry/schema';
import { Section } from '@/components/ui/section';
import { publicPages, pageCopy } from '@/content/public-pages';
import { canonicalUrl, parseListQuery, type Search } from '@/lib/public/pages';
import { contentDetail, contentList, publicOrigin } from '@/lib/public/server-pages';
import { Unavailable } from './content-pages';
import { ResearchProjectList } from './research-project-list';
import { ResearchFilterForm } from './research-filter-form';
import { ResearchDemoList } from './research-demo-list';
import { filterResearchDemos } from './research-demo-data';
import { ResearchCollaboration, ResearchMetadata, ResearchRecordContent, researchScopeNotice } from './research-record-content';
import styles from './research-page.module.css';
import heroStyles from './research-listing-hero.module.css';

function ResearchHeader({ title = publicPages.research.title, summary = publicPages.research.description, detail = false, listing = false, children }: { title?: string; summary?: string; detail?: boolean; listing?: boolean; children?: React.ReactNode }) {
  return <Section tone="dark" className={`${styles.hero}${listing ? ` ${heroStyles.hero}` : ''}`}>
    <nav className="content-breadcrumbs" aria-label="Breadcrumb"><ol><li><Link href="/">Home</Link></li><li>{detail ? <Link prefetch={false} href="/research">Research</Link> : <span aria-current="page">Research</span>}</li>{detail && <li><span aria-current="page">{title}</span></li>}</ol></nav>
    {listing ? <><div className={heroStyles.titleRow}><h1>{title}</h1>{children}</div><p className={styles.introduction}>{summary}</p></> : <><p className={styles.eyebrow}>{publicPages.research.eyebrow}</p><h1>{title}</h1><p className={styles.introduction}>{summary}</p>{children}</>}
  </Section>;
}
function PublicationsConnection() {
  return <div className={styles.publications}><div><h2><BookOpen aria-hidden="true"/>Publications and references</h2><p>{publicPages.publications.description}</p></div><div className={styles.links}><Link prefetch={false} className={styles.textLink} href="/publications">Explore publications<ArrowRight aria-hidden="true"/></Link><Link prefetch={false} className={styles.textLink} href="/projects">Explore projects<ArrowRight aria-hidden="true"/></Link></div></div>;
}
function StructuredData({ value }: { value: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026') }}/>;
}
export async function ResearchPage({ search }: { search: Search }) {
  let query;
  try { query = parseListQuery('research', search); } catch (error) {
    return <main id="public-main" tabIndex={-1} className={styles.page}><ResearchHeader listing/><Section tone="dark" className={styles.body}><div className={styles.state} role="alert"><h2>Check your filters</h2><p>{error instanceof Error ? error.message : 'Choose supported filters.'}</p><Link className={styles.textLink} href="/research">Reset filters</Link></div></Section></main>;
  }
  const page=await editorialPage('research');
  const result = await contentList('research', query);
  // A filtered empty page cannot establish that the published collection is empty.
  const collection = result.state === 'available' && result.pagination.total === 0 && Object.keys(query.values).length
    ? await contentList('research', parseListQuery('research', {})) : result;
  const demos = result.state === 'available' && result.pagination.total === 0 && collection.state === 'available' && collection.pagination.total === 0
    ? filterResearchDemos(query) : null;
  const unavailable = result.state === 'unavailable' || collection.state === 'unavailable';
  return <main id="public-main" tabIndex={-1} className={styles.page}>
    <ResearchHeader listing title={page?.title} summary={page?.summary}><div className={styles.collaboration}><Link prefetch={false} href={inquiryHref('research')} className={styles.action}>Discuss collaboration<ArrowUpRight aria-hidden="true"/></Link></div></ResearchHeader>
    <Section tone="dark" className={styles.body}>
      <ResearchFilterForm key={query.params} query={query}/>
      {unavailable || result.state !== 'available' ? <Unavailable kind="research" query={query}/> : demos ? <ResearchDemoList key={`demos-${query.params}`} records={demos}/> : <>
        <p className={styles.resultCount}>{result.pagination.total} published {result.pagination.total === 1 ? 'record' : 'records'} match this selection.</p>
        {result.data.length ? <ResearchProjectList key={query.params} records={result.data} pagination={result.pagination} query={query}/> : <p className={styles.state} role="status">{publicPages.research.empty}</p>}
      </>}
      <PublicationsConnection/>
    </Section>
  </main>;
}
export async function ResearchRecordPage({ slug }: { slug: string }) {
  const result = await contentDetail('research', slug);
  if (result.state === 'missing') notFound();
  if (result.state === 'unavailable') return <main id="public-main" tabIndex={-1} className={styles.page}><ResearchHeader title="Research temporarily unavailable"/><Section tone="dark" className={styles.body}><Unavailable kind="research" slug={slug}/><ResearchCollaboration/><PublicationsConnection/></Section></main>;
  const record = result.data, origin = publicOrigin(), url = canonicalUrl(`/research/${record.slug}`, origin, record);
  return <main id="public-main" tabIndex={-1} className={styles.page}>
    <ResearchHeader title={record.title} summary={record.summary} detail>{record.illustrativeNotice&&<p className={styles.note}>{record.illustrativeNotice}</p>}<ResearchMetadata record={record}/><p className={styles.note}>{researchScopeNotice}</p></ResearchHeader>
    {url && !record.illustrative && <StructuredData value={{ '@context': 'https://schema.org', '@type': 'CreativeWork', name: record.title, description: record.summary, datePublished: record.publishedAt, url }}/>}
    {origin && url && <StructuredData value={{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ name: 'Home', item: origin }, { name: 'Research', item: `${origin}/research` }, { name: record.title, item: url }].map((entry, index) => ({ '@type': 'ListItem', position: index + 1, ...entry })) }}/>}
    <Section tone="dark" className={styles.body}><ResearchRecordContent record={record} overview={false}/><div className={styles.recordNavigation}><p className={styles.note}>Published <time dateTime={record.publishedAt}>{record.publishedAt.slice(0, 10)}</time></p><Link prefetch={false} className={styles.textLink} href="/research">All research<ArrowRight aria-hidden="true"/></Link></div><PublicationsConnection/></Section>
  </main>;
}
export function ResearchLoading() { return <main id="public-main" tabIndex={-1} className={styles.page} aria-busy="true"><Section tone="dark" className={styles.body}><p className={styles.state} role="status">{pageCopy.loading}</p></Section></main>; }
