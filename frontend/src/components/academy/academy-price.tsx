'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/admin/api';
import { useAccountSession } from '@/components/account/session';
import { academyDemos } from '@/components/public/academy-demo-data';
import type { AcademyPricing } from '@/lib/academy/contracts';
import { demoPricing, formatAcademyMoney, unconfiguredPrice } from '@/lib/academy/pricing';
import styles from './academy-price.module.css';
const pending=new Map<string,Promise<AcademyPricing>>();
function loadPrice(id:string){let result=pending.get(id);if(!result){result=api<{data:AcademyPricing}>(`/academy/courses/${encodeURIComponent(id)}/pricing`).then(response=>response.data).finally(()=>pending.delete(id));pending.set(id,result);}return result;}
export function AcademyPrice({courseId,pricing,enrolled,showAccess=true,large=false,published=false,illustrative=false}:{courseId:string;pricing?:AcademyPricing;enrolled?:boolean;showAccess?:boolean;large?:boolean;published?:boolean;illustrative?:boolean}) {
 const demo=!published&&academyDemos.find(item=>item.id===courseId),{session}=useAccountSession();
 const [loaded,setLoaded]=useState<{id:string;pricing:AcademyPricing}|null>(null),[access,setAccess]=useState<{id:string;userId:string;enrolled:boolean}|null>(null),[refresh,setRefresh]=useState(0);
 useEffect(()=>{if(demo||pricing&&refresh===0)return;let active=true;loadPrice(courseId).then(value=>{if(active)setLoaded({id:courseId,pricing:value});}).catch(()=>{if(active)setLoaded({id:courseId,pricing:unconfiguredPrice});});return()=>{active=false;};},[courseId,demo,pricing,refresh]);
 useEffect(()=>{if(!showAccess||enrolled!==undefined||demo||session.status!=='authenticated')return;let active=true;const userId=session.user!.id;api<{data:{enrolled:boolean}}>(`/academy/courses/${encodeURIComponent(courseId)}/access`).then(value=>{if(active)setAccess({id:courseId,userId,enrolled:value.data.enrolled});}).catch(()=>{});return()=>{active=false;};},[courseId,demo,enrolled,session.status,session.user,showAccess]);
 const value=demo?demoPricing(demo.level):(loaded?.id===courseId&&refresh>0?loaded.pricing:pricing)??(loaded?.id===courseId?loaded.pricing:unconfiguredPrice);
 // Refetch at a scheduled sale boundary; current amounts are always calculated by the server.
 useEffect(()=>{if(demo)return;const boundaries=[value.saleStartsAt,value.saleEndsAt].filter((date):date is string=>!!date).map(date=>+new Date(date)-Date.now()).filter(ms=>ms>0);if(!boundaries.length)return;const timer=setTimeout(()=>{setRefresh(n=>n+1);},Math.min(Math.min(...boundaries)+50,2147483647));return()=>clearTimeout(timer);},[demo,value.saleStartsAt,value.saleEndsAt,refresh]);
 const activeEnrollment=enrolled??(session.status==='authenticated'&&access?.id===courseId&&access.userId===session.user?.id&&access.enrolled);
 return <div className={`${styles.price}${large?` ${styles.large}`:''}`} data-academy-price={courseId} data-price-state={value.state} data-price-minor={value.currentPriceMinor}>
  <strong className={styles.current}>{value.state==='unconfigured'?'Price to be confirmed':value.state==='free'?'Free':formatAcademyMoney(value.currentPriceMinor!)}</strong>
  {value.saleActive&&value.regularPriceMinor!==undefined&&<><del>{formatAcademyMoney(value.regularPriceMinor)}</del><span className={styles.badge}>{value.discountPercent}% off</span></>}
  {(demo||illustrative)&&<span className={styles.label}>Illustrative course material · Purchase unavailable</span>}
  {showAccess&&activeEnrollment&&!demo&&<span className={styles.access}>Already enrolled · <Link href={`/academy/courses/${courseId}#course-content`}>Continue learning</Link></span>}
 </div>;
}
