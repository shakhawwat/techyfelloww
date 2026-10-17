'use client';
import Link from 'next/link';
import {useSyncExternalStore} from 'react';
import {useAccountSession} from '@/components/account/session';
const subscribe=()=>()=>{};
const clientSnapshot=()=>true;
const serverSnapshot=()=>false;
export function MessageMember({id}:{id:string}){const {session}=useAccountSession(),hydrated=useSyncExternalStore(subscribe,clientSnapshot,serverSnapshot);if(!hydrated||session.status==='loading'||session.status==='authenticated'&&session.user!.id===id)return null;const href='/blog/messages?user='+id;return <Link href={session.status==='authenticated'?href:'/login?returnTo='+encodeURIComponent(href)} style={{display:'inline-flex',padding:'8px 16px',border:'1px solid #16C2FF',borderRadius:20,color:'#16C2FF',marginTop:10}}>Message</Link>;}
