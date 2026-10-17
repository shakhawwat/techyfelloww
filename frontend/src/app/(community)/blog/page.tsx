import Link from 'next/link';
import {BlogWorkspace} from '@/components/community/blog-workspace';
import {BlogSearchBar} from '@/components/community/blog-search-bar';
import {BlogFeed} from '@/components/community/blog-feed';
import type {BlogPost} from '@/components/community/types';
import {blogRequest} from '@/lib/public/server-blog';
import styles from '@/components/community/community.module.css';
export const metadata={title:'Community | Techyfellow',description:'Published articles from the Techyfellow community.'};
export default async function BlogPage({searchParams}:{searchParams:Promise<{search?:string;category?:string;page?:string;author?:string;post?:string}>}){
 const values=await searchParams,query=new URLSearchParams();for(const key of ['search','category','page','author','post'] as const)if(typeof values[key]==='string')query.set(key,values[key]!);const {data,status}=await blogRequest<{data:BlogPost[];pagination:{page:number;pages:number;total:number};categories:string[]}>(query.size?'?'+query:'');
 function pageHref(page:number){const next=new URLSearchParams(query);next.set('page',String(page));return '/blog?'+next;}
 return <main id="public-main" className={`${styles.page} ${styles.blogPage}`}><h1 className={styles.blogTitle}>Community</h1><BlogSearchBar search={values.search??''} category={values.category??''} categories={data?.categories??[]}/><BlogWorkspace publicPosts={data?.data??[]}>{!data?<p className={styles.error} role="alert">{status===400?'Check your search or page number.':'Published articles are temporarily unavailable. Please try again.'}</p>:<>{data.data.length?<BlogFeed posts={data.data} filterReposts={!!(values.search||values.category||values.author||values.post)}/>:<p className={styles.empty}>{query.get('search')||query.get('category')?'No published posts match your search.':'No posts have been published yet.'}</p>}<nav className={styles.actions} aria-label="Community pages">{data.pagination.page>1&&<Link className={styles.button} href={pageHref(data.pagination.page-1)}>Previous</Link>}{data.pagination.pages>0&&<span className={styles.muted}>Page {data.pagination.page} of {data.pagination.pages}</span>}{data.pagination.page<data.pagination.pages&&<Link className={styles.button} href={pageHref(data.pagination.page+1)}>Next</Link>}</nav></>}</BlogWorkspace></main>;
}
