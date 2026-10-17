'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useAccountSession} from '@/components/account/session';
import {api} from '@/lib/admin/api';
import type {AcademyOrder} from '@/lib/academy/contracts';
import {formatAcademyMoney} from '@/lib/academy/pricing';
import styles from './academy-course-details.module.css';
export function AcademyOrders({embedded=false}:{embedded?:boolean}){
 const {session}=useAccountSession(),[result,setResult]=useState<{userId:string;orders:AcademyOrder[]}|null>(null),[error,setError]=useState('');const userId=session.user?.id;
 useEffect(()=>{let active=true;if(session.status!=='authenticated')return;if(!userId)return;api<{data:AcademyOrder[]}>('/academy/orders').then(value=>{if(active)setResult({userId,orders:value.data});}).catch(()=>{if(active)setError('Your orders could not be loaded.');});return()=>{active=false;};},[session.status,userId]);
 const orders=session.status==='authenticated'&&result&&result.userId===session.user?.id?result.orders:null;
 const content=<section className={styles.section}><h2>Course orders</h2><p>Start an order from the selected course. Course access requires confirmed enrollment.</p>{session.status==='anonymous'?<Link className={styles.action} href="/academy/login?returnTo=%2Facademy%2Fcart">Log in to view orders</Link>:error?<p role="alert">{error}</p>:!orders?<p role="status">Loading your orders…</p>:orders.length?<ul className={styles.list}>{orders.map(order=><li key={order.id}><h2>{order.course.title}</h2><p>{formatAcademyMoney(order.finalMinor)} · {order.status.replaceAll('_',' ')}</p><Link href={`/academy/courses/${order.course.slug}/order?order=${order.id}`}>Review course order</Link> · <Link href={`/academy/orders/${order.id}/memo`}>View / download memo</Link>{['paid','free','scholarship'].includes(order.status)&&<p><Link href={`/academy/courses/${order.course.slug}#course-content`}>Continue learning</Link></p>}</li>)}</ul>:<p>No course orders yet.</p>}<Link href="/academy/courses">Browse courses</Link></section>;return embedded?content:<main id="public-main" className={styles.page}>{content}</main>;
}
