import {editorialPage} from '@/lib/public/server-editorial';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Section } from '@/components/ui/section';
import { publicPages, pageCopy } from '@/content/public-pages';
import { inquiryHref } from '@/lib/inquiry/schema';
import { parseListQuery, type Search } from '@/lib/public/pages';
import { contentList } from '@/lib/public/server-pages';
import { Unavailable } from './content-pages';
import { PublicationFilterForm } from './publication-filter-form';
import { PublicationList } from './publication-list';
import { publishedPreview, selectPublicationDemos } from './publication-preview-data';
import styles from './publication-listing.module.css';
async function Header() {const page=await editorialPage('publications');
  return <Section tone="dark" className={`content-hero ${styles.hero}`}><nav className="content-breadcrumbs" aria-label="Breadcrumb"><ol><li><Link href="/">Home</Link></li><li><span aria-current="page">Publications</span></li></ol></nav><span className="eyebrow">{page?.sections.find(section=>section.key==='hero')?.label??publicPages.publications.eyebrow}</span><h1>{page?.title??publicPages.publications.title}</h1><p className="content-lead">{page?.summary??publicPages.publications.description}</p></Section>;
}
export async function PublicationsPage({ search }: { search: Search }) {
  let query;
  try { query = parseListQuery('publications', search); } catch (error) {
    return <main id="public-main" tabIndex={-1}><Header/><Section><div className="content-validation" role="alert"><h2>Check your filters</h2><p>{error instanceof Error ? error.message : 'Choose supported filters.'}</p><Link className="public-inline-link" href="/publications">Reset filters</Link></div></Section></main>;
  }
  const result = await contentList('publications', query);
  const collection = result.state === 'available' && result.pagination.total === 0 && Object.keys(query.values).length
    ? await contentList('publications', parseListQuery('publications', {})) : result;
  const demos = result.state === 'available' && result.pagination.total === 0 && collection.state === 'available' && collection.pagination.total === 0 ? selectPublicationDemos(query) : null;
  return <main id="public-main" tabIndex={-1}><Header/><Section tone="dark" className={styles.body}>
    <PublicationFilterForm key={`filters-${query.params}`} query={query}/>
    {result.state !== 'available' || collection.state === 'unavailable' ? <Unavailable kind="publications" query={query}/> : demos ? <>
      {demos.length ? <PublicationList key={`demos-${query.params}`} entries={demos} demo query={query} pagination={{ page:1, limit:query.limit, total:demos.length, totalPages:Math.ceil(demos.length/query.limit) }}/> : <p className={styles.state} role="status">No illustrative publication previews match these filters.</p>}
    </> : <>
      <p className={styles.resultCount}>{result.pagination.total} published {result.pagination.total === 1 ? 'record' : 'records'} match this selection.</p>
      {result.data.length ? <PublicationList key={`published-${query.params}`} entries={result.data.map(publishedPreview)} pagination={result.pagination} query={query}/> : <p className={styles.state} role="status">{publicPages.publications.empty}</p>}
    </>}
    <div className={styles.related}><Link href={inquiryHref('research')}>{pageCopy.inquiry}<ArrowRight aria-hidden="true"/></Link><Link prefetch={false} href="/projects">Explore projects<ArrowRight aria-hidden="true"/></Link><Link prefetch={false} href="/research">Explore research<ArrowRight aria-hidden="true"/></Link></div>
  </Section></main>;
}
