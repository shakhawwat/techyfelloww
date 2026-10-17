import {editorialPage} from '@/lib/public/server-editorial';
import Image from 'next/image';
import {approvedImage} from '@/lib/public/pages';
import Link from 'next/link';
import {ArrowRight,ArrowUpRight,UserRound} from 'lucide-react';
import {publicPages,pageCopy,learningProfileCopy} from '@/content/public-pages';
import {inquiryHref} from '@/lib/inquiry/schema';
import {listHref,parseListQuery,type ListQuery,type PublicRecord,type Search} from '@/lib/public/pages';
import {contentList} from '@/lib/public/server-pages';
import styles from './team-directory.module.css';
import {boardDemos,demoTeamPage,illustrativeNotice} from './team-directory-data';
import {DemoProfiles} from './team-directory-demos';

function BoardMembers({records=[]}:{records?:PublicRecord[]}){return <section className={styles.memberSection} aria-labelledby="board-members"><h2 id="board-members">Board members</h2><p className={styles.sectionIntro}>Board and advisory roles are presented separately from team profiles.</p>{records.length?<div className={styles.grid}>{records.map(record=><Profile key={record.slug} record={record}/>)}</div>:<><p className={styles.demoNotice}>{illustrativeNotice}</p><DemoProfiles profiles={boardDemos}/></>}</section>;}

async function Header(){const page=await editorialPage('team');return <header className={styles.hero}><nav aria-label="Breadcrumb" className={styles.breadcrumb}><ol><li><Link href="/">Home</Link></li><li><span aria-current="page">Team</span></li></ol></nav><p className={styles.eyebrow}>{page?.sections.find(section=>section.key==='hero')?.label??publicPages.team.eyebrow}</p><h1>{page?.title??publicPages.team.title}</h1><p>{page?.summary??publicPages.team.description}</p></header>;}
function BottomLinks(){return <nav aria-label="Related pages" className={styles.related}><Link prefetch={false} href="/about">About Techy Fellow<ArrowRight aria-hidden="true"/></Link><Link href={inquiryHref('contact')}>{learningProfileCopy.inquiry}<ArrowUpRight aria-hidden="true"/></Link>{(['projects','research','publications'] as const).map(kind=><Link prefetch={false} key={kind} href={`/${kind}`}>Explore {kind}<ArrowRight aria-hidden="true"/></Link>)}</nav>;}
function Filters({query}:{query:ListQuery}){return <><form className={styles.filters} action="/team" method="get" aria-label="Filter team"><label htmlFor="expertise">Expertise<input id="expertise" name="expertise" defaultValue={query.values.expertise??''} maxLength={200} aria-describedby="team-expertise-hint"/></label><label htmlFor="sort">Sort<select id="sort" name="sort" defaultValue={query.sort}><option value="-publishedAt">Recently published</option><option value="publishedAt">First published</option><option value="name">Name A–Z</option><option value="-name">Name Z–A</option></select></label><label htmlFor="limit">Per page<input id="limit" name="limit" type="number" min={1} max={100} defaultValue={query.limit}/></label><button type="submit" className={styles.apply}>Apply</button><Link prefetch={false} href="/team" className={styles.reset}>Reset</Link></form><p id="team-expertise-hint" className={styles.hint}>Exact match; case-sensitive.</p></>;}
function Profile({record}:{record:PublicRecord}){
 const href=`/team/${record.slug}`,portrait=record.media?.find(image=>approvedImage(image.url));
 return <article className={styles.profile}>
  <Link prefetch={false} href={href} className={styles.portrait} aria-label={`View ${record.title}'s profile`}>{portrait?<Image src={portrait.url} alt={portrait.altText} width={portrait.width} height={portrait.height} unoptimized/>:<><UserRound size={64} strokeWidth={1} aria-hidden="true"/><span>Profile photo unavailable</span></>}</Link>
  <div className={styles.profileText}><h2><Link prefetch={false} href={href}>{record.title}</Link></h2>{record.role&&<p>{record.role}</p>}{!!record.expertise?.length&&<p className={styles.expertise}>{record.expertise.join(' · ')}</p>}{record.illustrativeNotice&&<p className={styles.biography}>{record.illustrativeNotice}</p>}<p className={styles.biography}>{record.biography??record.summary}</p><Link prefetch={false} href={href} className={styles.view}>View profile<ArrowUpRight size={17} aria-hidden="true"/></Link></div>
 </article>;
}
export async function TeamDirectory({search}:{search:Search}){
 let query:ListQuery;
 try{query=parseListQuery('team',{classification:'team',...search});}catch(error){return <main id="public-main" tabIndex={-1} className={styles.page}><div className={styles.container}><Header/><BoardMembers/><section className={styles.memberSection} aria-labelledby="team-members"><h2 id="team-members">Team members</h2><div className={styles.state} role="alert"><h3>Check your filters</h3><p>{error instanceof Error?error.message:'Choose supported filters.'}</p><Link href="/team">Reset filters<ArrowRight aria-hidden="true"/></Link></div></section><BottomLinks/></div></main>;}
 let result=await contentList('team',query);
 let demos:ReturnType<typeof demoTeamPage>|undefined;
 if(result.state==='available'&&result.pagination.total===0){const unfiltered=await contentList('team',parseListQuery('team',{limit:'1'}));if(unfiltered.state==='unavailable')result=unfiltered;else if(unfiltered.pagination.total===0)demos=demoTeamPage(query);}
 const boardResult=await contentList('team',parseListQuery('team',{classification:'board',limit:'100'}));
 const pagination=demos?.pagination??(result.state==='available'?result.pagination:undefined);
 return <main id="public-main" tabIndex={-1} className={styles.page}><div className={styles.container}><Header/><BoardMembers records={boardResult.state==='available'?boardResult.data:[]}/><section className={styles.memberSection} aria-labelledby="team-members"><h2 id="team-members">Team members</h2><Filters key={query.params} query={query}/>
  {result.state==='unavailable'?<section className={styles.state} role="status"><p>{pageCopy.unavailable}</p><a href={listHref('team',query)}>Try again<ArrowRight aria-hidden="true"/></a></section>:<>
   {demos&&<><p className={styles.demoNotice}>{illustrativeNotice}</p><p className={styles.hint}>No approved published profiles are available. These eight local examples have no publication dates; publication sorting keeps their supplied order.</p></>}
   <p className={styles.count}>{pagination!.total} {demos?'illustrative profiles':pagination!.total===1?'published record':'published records'} match this selection.</p>
   {demos?(demos.data.length?<DemoProfiles profiles={demos.data}/>:<p role="status" className={styles.state}>No illustrative team profiles match this selection.</p>):result.data.length?<div className={styles.grid}>{result.data.filter(record=>record.classification!=='board').map(record=><Profile key={record.slug} record={record}/>)}</div>:<p role="status" className={styles.state}>{publicPages.team.empty}</p>}
   {pagination!.totalPages>0&&<nav className={styles.pagination} aria-label="Pagination"><span>Page {query.page} of {pagination!.totalPages}</span><div>{query.page>1&&<Link prefetch={false} href={listHref('team',query,query.page-1)}>Previous page</Link>}{query.page<pagination!.totalPages&&<Link prefetch={false} href={listHref('team',query,query.page+1)}>Next page</Link>}</div></nav>}
  </>}
  </section><BottomLinks/>
 </div></main>;
}
export function TeamDirectoryLoading(){return <main id="public-main" tabIndex={-1} aria-busy="true" className={styles.page}><div className={styles.container}><Header/><p className={styles.state} role="status">{pageCopy.loading}</p></div></main>;}
