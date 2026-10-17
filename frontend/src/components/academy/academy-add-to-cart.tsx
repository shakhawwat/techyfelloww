'use client';
import Link from 'next/link';
import {Check,ShoppingCart} from 'lucide-react';
import actionStyles from './academy-add-to-cart.module.css';
import {useEffect,useRef,useState} from 'react';
import {useAccountSession} from '@/components/account/session';
import {api} from '@/lib/admin/api';
import {useAcademyCart} from './academy-cart-context';
import {academyDemos} from '@/components/public/academy-demo-data';
import styles from './academy-course-details.module.css';
export function AcademyAddToCart({courseId,enrolled,className,cardAction=false}:{courseId:string;enrolled?:boolean;className?:string;cardAction?:boolean}){
 const cart=useAcademyCart(),{session}=useAccountSession(),userId=session.user?.id,[access,setAccess]=useState<{id:string;userId:string;enrolled:boolean}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[added,setAdded]=useState(false),pending=useRef(false);
 useEffect(()=>{let active=true;if(enrolled!==undefined||session.status!=='authenticated'||!userId||academyDemos.some(course=>course.id===courseId))return;api<{data:{enrolled:boolean}}>(`/academy/courses/${courseId}/access`).then(value=>{if(active)setAccess({id:courseId,userId,enrolled:value.data.enrolled});}).catch(()=>{});return()=>{active=false;};},[enrolled,session.status,userId,courseId]);
 const hasAccess=enrolled??(access?.id===courseId&&access.userId===userId&&access.enrolled);
 if(hasAccess)return null;
 async function add(){if(pending.current||!cart.ready||cart.ids.includes(courseId))return;pending.current=true;setBusy(true);setError('');setAdded(false);try{if(await cart.add(courseId))setAdded(true);else setError('Could not add this course. Try again.');}catch{setError('Could not add this course. Try again.');}finally{pending.current=false;setBusy(false);}}
 return <>{cart.ids.includes(courseId)&&!busy?<Link className={className??styles.action} href="/academy/cart" aria-label={cardAction?'Added to cart. View cart':undefined}>{cardAction?<><Check aria-hidden="true"/>Added</>:'View cart'}</Link>:<button type="button" className={className??styles.action} disabled={!cart.ready||busy} aria-busy={busy} onClick={()=>void add()}>{cardAction&&<ShoppingCart aria-hidden="true"/>}{busy?'Adding…':'Add to cart'}</button>}{cardAction&&<span className={actionStyles.announcement} role="status" aria-live="polite" aria-atomic="true">{added&&cart.ids.includes(courseId)?'Course added to cart.':''}</span>}{error&&<span role="alert">{error}</span>}</>;
}
