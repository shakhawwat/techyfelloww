'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {apiBase,errorOf} from '@/lib/admin/api';
import {useAdmin} from './session';
import styles from './dashboard.module.css';
type Dashboard={attention:{id:string;label:string;href:string}[];cards:{id:string;label:string;count:number;href:string}[];actions:{label:string;href:string}[];activity:{id:string;action:string;record:string;at:string;href:string}[];checkedAt:string};
export function AdminDashboard(){
 const {call}=useAdmin(),[attempt,setAttempt]=useState(0),[result,setResult]=useState<{attempt:number;data?:Dashboard;error?:string}>({attempt:-1});
 useEffect(()=>{let current=true;call<{data:Dashboard}>('/admin/dashboard').then(value=>{if(!value.data||!Array.isArray(value.data.cards)||!Array.isArray(value.data.activity))throw new Error();if(current)setResult({attempt,data:value.data});}).catch(error=>{if(current)setResult({attempt,error:errorOf(error).message});});return()=>{current=false;};},[call,attempt]);
 const loading=result.attempt!==attempt,data=loading?undefined:result.data;
 return <section className={styles.dashboard} aria-busy={loading}><div className={styles.heading}><div><h1>Dashboard</h1><p>Welcome back. Here is the latest from your workspace.</p></div><Button variant="secondary" disabled={loading} onClick={()=>setAttempt(value=>value+1)}>{loading?'Refreshing…':'Refresh'}</Button></div>
 {loading?<p role="status">Loading dashboard…</p>:result.error?<p className="admin-alert" role="alert">{result.error} Use Refresh to retry.</p>:data&&<>
 {data.cards.length?<div className={styles.cards}>{data.cards.map(card=><Link href={card.href} key={card.id} className={styles.card}><span>{card.label}</span><strong>{card.count.toLocaleString()}</strong></Link>)}</div>:<p>No summary statistics are available for your assigned permissions.</p>}
 {!!data.actions.length&&<section className={styles.section}><h2>Quick actions</h2><div className={styles.actions}>{data.actions.map(action=><Link className="button button-secondary" href={action.href} key={action.label}>{action.label}</Link>)}</div></section>}
 {!!data.attention.length&&<section className={styles.section}><h2>Needs attention</h2><ul className={styles.activity}>{data.attention.map(item=><li key={item.id}><Link href={item.href}>{item.label}</Link></li>)}</ul></section>}
 <section className={styles.section}><h2>Recent activity</h2>{data.activity.length?<ul className={styles.activity}>{data.activity.map(item=><li key={item.id}><div><span>{item.action}</span>{item.href.startsWith('/api/v1/')?<a href={`${apiBase()}${item.href.slice(7)}`}>{item.record}</a>:<Link href={item.href}>{item.record}</Link>}</div><time dateTime={item.at}>{new Date(item.at).toLocaleString()}</time></li>)}</ul>:<p>No recent activity is available for your assigned permissions.</p>}</section><p className={styles.updated}>Updated {new Date(data.checkedAt).toLocaleString()}. Counts reflect saved records.</p>
 </>}
 </section>;
}
