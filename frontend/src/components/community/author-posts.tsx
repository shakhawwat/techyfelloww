'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useAccountSession} from '@/components/account/session';
import {api,errorOf} from '@/lib/admin/api';
import {PostEditor} from './post-editor';
import type {BlogPost} from './types';
import styles from './community.module.css';
export function AuthorPosts({postId}:{postId?:string}){const {session}=useAccountSession();return <main id="public-main" className={styles.page}><Link href="/account/profile">← My profile</Link><h1>{postId?'Edit community post':'My posts'}</h1>{session.status==='authenticated'?<AuthorWorkspace key={`${session.user!.id}:${postId??''}`} postId={postId}/>:session.status==='anonymous'?<Link href={`/login?returnTo=${encodeURIComponent('/account/blog'+(postId?'/'+postId:''))}`}>Sign in to manage your posts</Link>:<p role="status">Checking your account…</p>}</main>;}
function AuthorWorkspace({postId}:{postId?:string}){
 const [posts,setPosts]=useState<BlogPost[]>([]),[post,setPost]=useState<BlogPost|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);const router=useRouter();
 useEffect(()=>{if(postId==='new')return;const abort=new AbortController();api<{data:BlogPost[]|BlogPost}>(postId?`/account/blog/${postId}`:'/account/blog','GET',undefined,abort.signal).then(result=>{if(postId)setPost(result.data as BlogPost);else setPosts(result.data as BlogPost[]);}).catch(cause=>{if(!abort.signal.aborted)setError(errorOf(cause).message);});return()=>abort.abort();},[postId,attempt]);
 if(error)return <p className={styles.error} role="alert">{error} <button onClick={()=>{setError('');setAttempt(n=>n+1);}}>Retry</button></p>;
 if(postId)return postId==='new'||post?<PostEditor key={post?.id??'new'} post={post} onSaved={value=>{setPost(value);router.replace(`/account/blog/${value.id}`);}}/>:<p role="status">Loading post…</p>;
 return <><div className={styles.actions}><Link className={`${styles.button} ${styles.primary}`} href="/account/blog/new">Create post</Link></div><div className={styles.table}>{posts.length?posts.map(item=><article key={item.id} className={styles.row}><div><strong>{item.title}</strong><small>{item.status==='pending'?'Pending review':item.status==='published'?'Published':'Draft'} · {item.category}</small></div><Link className={styles.button} href={item.status==='published'?`/blog/${item.slug}`:`/account/blog/${item.id}`}>{item.status==='draft'?'Edit draft':item.status==='pending'?'View submission':'Read post'}</Link></article>):<p className={styles.empty}>You have no community posts yet.</p>}</div></>;
}
