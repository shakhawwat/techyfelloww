'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {FriendControl} from '@/components/community/friends/friend-control';
import {Bell} from 'lucide-react';
import {useAccountNotifications} from './notifications';
import styles from './notifications.module.css';
export function NotificationBell({onNavigate,label,inboxHref='/account/inbox',supportHref}:{onNavigate:()=>void;label?:string;inboxHref?:string;supportHref?:string}){
 const {snapshot,error,refresh,markRead}=useAccountNotifications(),router=useRouter(),id=useId();
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[]);
 async function read(notification?:{id:string;conversationId?:string;kind?:string;href?:string}){if(busy)return;setBusy(true);try{await markRead(notification?.id);if(notification){setOpen(false);onNavigate();if((notification.kind==='blog-comment'||notification.kind==='direct-message'||notification.kind==='friend-request'||notification.kind==='friend-accepted'||notification.kind==='community-moderation')&&notification.href?.startsWith('/blog/'))router.push(notification.href);else if(notification.conversationId){window.dispatchEvent(new CustomEvent('account:open-conversation',{detail:notification.conversationId}));router.push(`${supportHref??inboxHref}/${notification.conversationId}`);}}}catch{/* Provider exposes a retryable error; keep this dropdown open. */}finally{setBusy(false);}}
 return <div className={styles.root} ref={root} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setOpen(false);}} onKeyDown={event=>{if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();setOpen(false);trigger.current?.focus();}}}>
  <button className={styles.trigger} ref={trigger} aria-label={`Notifications${snapshot?`, ${snapshot.unread} unread`:''}`} aria-expanded={open} aria-controls={id} onClick={()=>{setOpen(!open);if(!open)void refresh();}}><Bell size={20} aria-hidden="true"/>{label&&<span>{label}</span>}{snapshot&&snapshot.unread>0&&<span className={styles.count} aria-hidden="true">{snapshot.unread>99?'99+':snapshot.unread}</span>}</button>
  {open&&<section id={id} className={styles.panel} aria-label="Notifications"><div className={styles.heading}><h2>Notifications</h2><button disabled={busy||!snapshot?.unread} onClick={()=>void read()}>Mark all as read</button></div>
   {error&&<p role="alert">{error} <button disabled={busy} onClick={()=>void refresh()}>Retry</button></p>}
   {!snapshot?<p role="status">Loading notifications…</p>:snapshot.items.length===0?<p>No notifications yet.</p>:<ul>{snapshot.items.map(notification=><li key={notification.id}><button className={styles.item} data-unread={!notification.readAt} disabled={busy} onClick={()=>void read(notification)}><strong>{!notification.readAt&&<span className={styles.dot} aria-label="Unread"/>}{notification.kind==='blog-comment'?'New comment: ':notification.kind==='direct-message'?'New message: ':notification.kind==='friend-request'?'Friend request: ':notification.kind==='friend-accepted'?'Friend request accepted: ':notification.kind==='community-moderation'?'Safety notice: ':'Support replied: '}{notification.subject}</strong><span>{notification.text}</span><time dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString()}</time></button>{notification.actionable&&notification.friendship&&<FriendControl target={notification.friendship.target} initial={notification.friendship} notification/>}</li>)}</ul>}
   <button className={styles.inboxLink} disabled={busy} onClick={()=>{setOpen(false);onNavigate();router.push(inboxHref);}}>Open Inbox</button>
  </section>}
 </div>;
}
