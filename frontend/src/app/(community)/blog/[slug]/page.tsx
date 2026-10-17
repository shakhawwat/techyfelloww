import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArticleBody,BlogCards} from '@/components/community/blog-public';
import {ProfileAvatar} from '@/components/community/avatar';
import type {BlogPost} from '@/components/community/types';
import {blogRequest} from '@/lib/public/server-blog';
import styles from '@/components/community/community.module.css';
export default async function ArticlePage({params}:{params:Promise<{slug:string}>}){const {slug}=await params,{data,status}=await blogRequest<{data:BlogPost;related:BlogPost[]}>('/'+encodeURIComponent(slug));if(status===404)notFound();if(!data)return <main id="public-main" className={styles.page}><p role="alert">This article is temporarily unavailable.</p></main>;const post=data.data;return <main id="public-main" className={styles.page}><article className={styles.article}><header><Link href="/blog">← Community</Link><p className={styles.muted}>{post.category}</p><h1>{post.title}</h1><p className={styles.muted}>{post.excerpt}</p><div className={styles.author}><ProfileAvatar name={post.author.name} photoUrl={post.author.photoUrl}/><span>{post.author.name}{post.publishedAt&&<> · <time dateTime={post.publishedAt}>{new Date(post.publishedAt).toLocaleDateString('en',{year:'numeric',month:'long',day:'numeric'})}</time></>}</span></div></header>{post.coverUrl&&
 // Same-origin validated public images do not require an external image service.
 // eslint-disable-next-line @next/next/no-img-element
 <img className={styles.cover} src={post.coverUrl} alt={post.title}/>}<ArticleBody body={post.body}/><aside className={`${styles.card} ${styles.authorBio}`} aria-label="About the author"><ProfileAvatar name={post.author.name} photoUrl={post.author.photoUrl} size={56}/><div><h2>{post.author.name}</h2>{post.author.bio&&<p className={styles.bio}>{post.author.bio}</p>}</div></aside></article>{data.related.length>0&&<section aria-label="Related published posts"><h2>Related posts</h2><BlogCards posts={data.related}/></section>}</main>;}
