import {editorialPage} from '@/lib/public/server-editorial';
import { contentList, publicOrigin } from '@/lib/public/server-pages';
import { parseListQuery, type Search } from '@/lib/public/pages';
import { AcademyCatalog } from './academy-catalog';
import styles from './academy-landing.module.css';
function BreadcrumbData() {
  const origin = publicOrigin();
  if (!origin) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ name: 'Home', item: origin }, { name: 'Academy', item: `${origin}/academy` }].map((item, index) => ({ '@type': 'ListItem', position: index + 1, ...item })) }).replace(/</g, '\\u003c') }}/>;
}
export async function AcademyLanding({search={}}:{search?:Search}) {
  const result = await contentList('courses', parseListQuery('courses', { limit: '100' }));
  const page=await editorialPage('academy');
  return <main id="public-main" tabIndex={-1} className={styles.page}><BreadcrumbData/><AcademyCatalog key={`${search.q}-${search.category}`} result={result} page={page} initialSearch={typeof search.q === 'string' ? search.q.slice(0,200) : ''} initialCategory={typeof search.category === 'string' ? search.category : 'All'}/></main>;
}
