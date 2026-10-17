import {editorialPage} from '@/lib/public/server-editorial';
import Link from 'next/link';
import {ArrowRight,ArrowUpRight} from 'lucide-react';
import {publicPages,pageCopy} from '@/content/public-pages';
import {inquiryHref} from '@/lib/inquiry/schema';
import {approvedImage,listHref,parseListQuery,type ListQuery,type PublicRecord,type Search} from '@/lib/public/pages';
import {contentList} from '@/lib/public/server-pages';
import {ProjectDirectoryImage} from './project-directory-image';
import styles from './project-directory.module.css';
import {conceptPage} from './project-directory-concepts';
import {ProjectConceptPreviews} from './project-directory-previews';

async function Header(){const page=await editorialPage('projects');return <header className={styles.hero}><nav aria-label="Breadcrumb" className={styles.breadcrumb}><ol><li><Link href="/">Home</Link></li><li><span aria-current="page">{publicPages.projects.title}</span></li></ol></nav><p className={styles.eyebrow}>{page?.sections.find(section=>section.key==='hero')?.label??publicPages.projects.eyebrow}</p><h1>{page?.title??publicPages.projects.title}</h1><p>{page?.summary??publicPages.projects.description}</p></header>;}
function BottomActions(){return <nav aria-label="Related pages" className={styles.related}><Link href={inquiryHref('engineering')} className={styles.primary}>{pageCopy.inquiry}<ArrowUpRight aria-hidden="true"/></Link><Link prefetch={false} href="/research">Explore research<ArrowRight aria-hidden="true"/></Link><Link prefetch={false} href="/publications">Explore publications<ArrowRight aria-hidden="true"/></Link></nav>;}
function Filters({query}:{query:ListQuery}){return <><form className={styles.filters} action="/projects" method="get" aria-label="Filter projects">
 {(['category','technology'] as const).map(key=><div key={key}><label htmlFor={key}>{publicPages.projects.filters[key]}</label><input id={key} name={key} defaultValue={query.values[key]??''} maxLength={200}/></div>)}
 <div><label htmlFor="sort">Sort</label><select id="sort" name="sort" defaultValue={query.sort}><option value="-publishedAt">Recently published</option><option value="publishedAt">First published</option><option value="title">Title A–Z</option><option value="-title">Title Z–A</option></select></div>
 <div><label htmlFor="limit">Per page</label><input id="limit" name="limit" type="number" min={1} max={100} defaultValue={query.limit}/></div><button type="submit" className={styles.primary}>Apply</button><Link prefetch={false} href="/projects" className={styles.reset}>Reset</Link>
 </form></>;}
function ProjectCard({record}:{record:PublicRecord}){
 const href=`/projects/${record.slug}`,image=record.media?.find(media=>approvedImage(media.url));
 return <article className={styles.card}><Link prefetch={false} href={href} aria-label={`View project: ${record.title}`} className={styles.imageLink}><ProjectDirectoryImage image={image}/></Link><div className={styles.cardBody}><p className={styles.category}>{record.category}</p>{record.illustrativeNotice&&<p className={styles.problem}>{record.illustrativeNotice}</p>}<h2><Link prefetch={false} href={href}>{record.title}</Link></h2>{!!record.technologies.length&&<ul className={styles.tags} aria-label="Technologies">{record.technologies.map((value,index)=><li key={`${value}-${index}`}>{value}</li>)}</ul>}<p className={styles.problem}>{record.problem??record.summary}</p><Link prefetch={false} href={href} className={styles.view}>View project<ArrowUpRight size={17} aria-hidden="true"/></Link></div></article>;
}
export async function ProjectDirectory({search}:{search:Search}){
 let query:ListQuery;
 try{query=parseListQuery('projects',search);}catch(error){return <main id="public-main" tabIndex={-1} className={styles.page}><div className={styles.container}><Header/><section className={styles.state} role="alert"><h2>Check your filters</h2><p>{error instanceof Error?error.message:'Choose supported filters.'}</p><Link href="/projects">Reset filters<ArrowRight aria-hidden="true"/></Link></section><BottomActions/></div></main>;}
 let result=await contentList('projects',query);
 let concepts:ReturnType<typeof conceptPage>|undefined;
 if(result.state==='available'&&result.pagination.total===0){const all=await contentList('projects',parseListQuery('projects',{limit:'1'}));if(all.state==='unavailable')result=all;else if(all.pagination.total===0)concepts=conceptPage(query);}
 const pagination=concepts?.pagination??(result.state==='available'?result.pagination:undefined);
 return <main id="public-main" tabIndex={-1} className={styles.page}><div className={styles.container}><Header/><Filters key={query.params} query={query}/>
  {result.state==='unavailable'?<section className={styles.state} role="status"><p>{pageCopy.unavailable}</p><a href={listHref('projects',query)}>Try again<ArrowRight aria-hidden="true"/></a></section>:<>
   {concepts?(concepts.data.length?<ProjectConceptPreviews key={query.params} projects={concepts.data}/>:<p role="status" className={styles.state}>No illustrative concepts match this selection.</p>):result.data.length?<div className={styles.grid}>{result.data.map(record=><ProjectCard key={record.slug} record={record}/>)}</div>:<p role="status" className={styles.state}>{publicPages.projects.empty}</p>}
   {pagination!.totalPages>0&&<nav aria-label="Pagination" className={styles.pagination}><span>Page {query.page} of {pagination!.totalPages}</span><div>{query.page>1&&<Link prefetch={false} href={listHref('projects',query,query.page-1)}>Previous page</Link>}{query.page<pagination!.totalPages&&<Link prefetch={false} href={listHref('projects',query,query.page+1)}>Next page</Link>}</div></nav>}
  </>}
  <BottomActions/>
 </div></main>;
}
export function ProjectDirectoryLoading(){return <main id="public-main" tabIndex={-1} aria-busy="true" className={styles.page}><div className={styles.container}><Header/><p className={styles.state} role="status">{pageCopy.loading}</p></div></main>;}
