import {FriendControl} from '@/components/community/friends/friend-control';
import {MessageMember} from '@/components/messaging/message-member';
import {notFound} from 'next/navigation';
import {blogRequest} from '@/lib/public/server-blog';
import {ProfileAvatar} from '@/components/community/avatar';
import {BlogWorkspace} from '@/components/community/blog-workspace';
import {BlogFeed} from '@/components/community/blog-feed';
import type {BlogPost} from '@/components/community/types';
import styles from '@/components/community/community.module.css';
export default async function AuthorProfile({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[a-f0-9]{24}$/.test(id))notFound();const {data,status}=await blogRequest<{data:BlogPost[]}>('?author='+id);if(!data){if(status===404||status===400)notFound();return <main id="public-main" className={styles.page}><p role="alert">This profile is temporarily unavailable.</p></main>;}let author=data.data[0]?.author,messageable=false;try{const response=await fetch(`${process.env.CONTENT_API_BASE_URL??'http://127.0.0.1:4000/api/v1'}/community/members/${id}`,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(response.ok){author=(await response.json()).data;messageable=true;}}catch{}if(!author)notFound();return <main id="public-main" className={`${styles.page} ${styles.blogPage}`}><BlogWorkspace publicPosts={data.data}><section className={styles.card} aria-label="Public author profile"><ProfileAvatar name={author.name} photoUrl={author.photoUrl} size={64}/><h1>{author.name}</h1>{author.headline&&<p>{author.headline}</p>}{author.bio&&<p className={styles.bio}>{author.bio}</p>}{messageable&&<><MessageMember id={author.id??id}/><FriendControl target={author.id??id}/></>}</section><BlogFeed posts={data.data} filterReposts/></BlogWorkspace></main>;}
