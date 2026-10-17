'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { MessageCircle, Minus, X, Send, Trash2 } from 'lucide-react';
import { useAccountSession } from './session';
import styles from './login-help.module.css';
const questions = [
 {question:"What Solutions can I explore?",answer:"Solutions describe proposed engineering scopes. Review the pathways, then share your problem, current stage, hardware or data and constraints. Deliverables, availability and terms need separate agreement.",href:"/solutions",label:"Explore Solutions",match:/solution|engineering|prototype|automation/},
 {question:"How can I discuss research collaboration?",answer:"Browse published research and submit a research inquiry with your domain, current stage, expected deliverable and available data or hardware. An inquiry does not confirm collaboration or research outcomes.",href:"/contact?type=research",label:"Discuss research",match:/research|collaborat|publication/},
 {question:"Where can I explore Academy courses?",answer:"Explore Academy and course details. You can submit course interest for review; this does not confirm enrollment, a cohort or a booking.",href:"/academy",label:"Explore Academy",match:/academy|course|training|learn|enroll/},
 {question:"How do I inquire about mentorship?",answer:"Mentorship supports understanding, planning and technical review. Students remain responsible for assessed work. Share your technical area, current stage and help requested; an inquiry does not confirm a mentor or session.",href:"/contact?type=mentorship",label:"Discuss mentorship",match:/mentor|capstone|student/},
 {question:"How can I ask about hardware?",answer:"Browse concept kits and discuss hardware requirements through Contact. Kit materials and demo pricing are illustrative; no catalog purchase or checkout is available here. Availability and delivery require separate confirmation.",href:"/store/kits",label:"Explore hardware kits",match:/hardware|kit|store|purchase|buy|sensor/},
 {question:'How do I create an account?',href:'/signup',label:'Create account',match:/create|sign.?up|register|registration/,answer:'Choose Create account below the login form. Enter your name, email and a password of at least 6 characters including a letter and a number, then confirm your password. Account creation does not sign you in automatically. Email verification may remain pending or unavailable; creating an account does not confirm verification.'},
 {question:'Why can’t I log in?',href:'/login',label:'Member login',match:/account|log.?in|sign.?in|password|disabled|attempt|error/,answer:'Check your email and password. Public login is for member accounts; administrators use the separate admin login. Disabled accounts cannot sign in. Too many attempts may temporarily limit login. If the service is unavailable, wait and try again. Contact support if the problem continues.'},
 {question:'How can I contact support?',href:'/contact',label:'Contact',match:/contact|support|help/,answer:'Use the contact page below to describe the issue. Never send passwords, verification codes or other sensitive information.'},
];
type Message = {id:number; role:'user'|'assistant'; text:string; time:string};
function localReply(text:string) {
 const value = text.toLowerCase();
 return questions.find(item => item.match.test(value))?.answer ?? 'I can offer local website FAQs about Solutions, research collaboration, Academy, mentorship, hardware and account assistance. Choose a suggested question or use the links below. No live AI or human connection. Do not share passwords, verification codes or sensitive information.';
}
export function LoginHelp() {
 const {session} = useAccountSession();
 // Discard local history, drafts and pending replies when the account changes or logs out.
 return <WebsiteHelp key={session.user?.id ?? 'anonymous'}/>;
}
function WebsiteHelp() {
 const [open,setOpen] = useState(false), [messages,setMessages] = useState<Message[]>([]), [draft,setDraft] = useState(''), [typing,setTyping] = useState(false), [failed,setFailed] = useState<string|null>(null), [unread,setUnread] = useState(0), [newMessage,setNewMessage] = useState(false), [announcement,setAnnouncement] = useState(''), [confirmClear,setConfirmClear] = useState(false), [viewport,setViewport] = useState<{height:number;top:number} | null>(null);
 const [bottomClearance,setBottomClearance] = useState(0);
 const dialog = useRef<HTMLDialogElement>(null), launcher = useRef<HTMLButtonElement>(null), conversation = useRef<HTMLDivElement>(null), composer = useRef<HTMLTextAreaElement>(null);
 const sequence = useRef(0), timer = useRef<ReturnType<typeof setTimeout>|null>(null), openRef = useRef(false), minimized = useRef(false), nearBottom = useRef(true), composing = useRef(false);
 const message = (role:Message['role'],text:string):Message => ({id:++sequence.current,role,text,time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})});
 const welcome = () => message('assistant','Welcome! I can help with Solutions, research collaboration, Academy, mentorship, hardware inquiries and account assistance using local website FAQs. Please do not share passwords, verification codes or sensitive information.');
 useEffect(() => {
  const visual = window.visualViewport;
  if (!visual) return;
  const update = () => setViewport({height:visual.height,top:visual.offsetTop});
  const initial = window.setTimeout(update,0); visual.addEventListener('resize',update); visual.addEventListener('scroll',update);
  return () => { window.clearTimeout(initial); visual.removeEventListener('resize',update); visual.removeEventListener('scroll',update); };
 }, []);
 useEffect(() => {
  // Reserve space above visible fixed notices and controls in the bottom-right lane.
  const update = () => {
   const visual = window.visualViewport;
   const bottom = (visual?.offsetTop ?? 0) + (visual?.height ?? window.innerHeight);
   let clearance = 0;
   for (const element of document.querySelectorAll<HTMLElement>('body *')) {
    if (element === launcher.current || element === dialog.current || dialog.current?.contains(element)) continue;
    const style = getComputedStyle(element);
    if (style.position !== 'fixed' || style.display === 'none' || style.visibility === 'hidden') continue;
    const rect = element.getBoundingClientRect();
    if (rect.width && rect.height && rect.right > window.innerWidth - 430 && rect.bottom > bottom - 180 && rect.top > bottom / 2) clearance = Math.max(clearance,bottom - rect.top + 12);
   }
   setBottomClearance(clearance);
  };
  const interval = window.setInterval(update,500);
  window.addEventListener('resize',update);
  return () => { window.clearInterval(interval); window.removeEventListener('resize',update); };
 }, []);
 useEffect(() => () => { if (timer.current) clearTimeout(timer.current); },[]);
 useEffect(() => { if (!open) return; const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = previous; }; },[open]);
 useEffect(() => { if (open && nearBottom.current && conversation.current) conversation.current.scrollTop = conversation.current.scrollHeight; },[messages,typing,open]);
 const viewportStyle = {'--help-clearance':`${bottomClearance}px`,...(viewport ? {'--help-height':`${viewport.height}px`,'--help-top':`${viewport.top}px`} : {})} as CSSProperties;
 function close(isMinimized:boolean) { minimized.current=isMinimized; openRef.current=false; dialog.current?.close(); }
 function show() { if (!messages.length) setMessages([welcome()]); minimized.current=false; openRef.current=true; setUnread(0); dialog.current?.showModal(); setOpen(true); }
 function respond(text:string) {
  setTyping(true); setFailed(null); setAnnouncement('');
  timer.current=setTimeout(() => {
   timer.current=null;
   try {
    const reply=message('assistant',localReply(text)); setMessages(current => [...current,reply]);
    if (!openRef.current && minimized.current) setUnread(current => current+1);
    if (!nearBottom.current) setNewMessage(true);
    setAnnouncement(`Website help: ${reply.text}`);
   } catch { setFailed(text); setAnnouncement('The local reply could not be prepared. Use Retry reply.'); }
   finally { setTyping(false); }
  },700);
 }
 function send(text:string) { const trimmed=text.trim(); if (!trimmed || typing || failed) return; setMessages(current => [...current,message('user',trimmed)]); setDraft(''); respond(trimmed); composer.current?.focus(); }
 function scrollBottom() { nearBottom.current=true; setNewMessage(false); const area=conversation.current; if(area) area.scrollTop=area.scrollHeight; }
 function clear() { if(timer.current) clearTimeout(timer.current); timer.current=null; setMessages([welcome()]); setDraft(''); setTyping(false); setFailed(null); setUnread(0); setNewMessage(false); setAnnouncement('Conversation cleared.'); setConfirmClear(false); nearBottom.current=true; composer.current?.focus(); }
 return <>
  <button ref={launcher} type="button" className={styles.launcher} style={viewportStyle} aria-label={`Open website help${unread ? `, ${unread} new local reply` : ''}`} aria-haspopup="dialog" aria-expanded={open} aria-controls="login-account-help" onClick={show}><MessageCircle size={22} aria-hidden="true"/>{unread>0 && <span className={styles.badge} aria-hidden="true">{unread}</span>}</button>
  <dialog ref={dialog} id="login-account-help" className={styles.panel} aria-labelledby="login-help-title" aria-describedby="login-help-description" style={viewportStyle} onKeyDown={event => { if (event.key !== 'Tab') return; const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], textarea, [tabindex="0"]')]; const first=controls[0], last=controls[controls.length-1]; if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();} }} onClose={() => { openRef.current=false; setOpen(false); launcher.current?.focus(); }} onCancel={() => { minimized.current=true; openRef.current=false; setOpen(false); }}>
   <header className={styles.header}><div><span>Website FAQ assistant</span><h2 id="login-help-title">Techy Fellow Help</h2></div><div className={styles.controls}><button type="button" aria-label="Minimize website help" onClick={() => close(true)}><Minus size={18} aria-hidden="true"/></button><button type="button" autoFocus aria-label="Close website help" onClick={() => close(false)}><X size={18} aria-hidden="true"/></button></div></header>
   <p id="login-help-description" className={styles.notice}>Local FAQ guidance. Messages stay local in this tab. No live AI or human connection. Never enter passwords or verification codes.</p>
   <div ref={conversation} className={styles.conversation} role="region" aria-label="Website help conversation" tabIndex={0} onScroll={event => { const area=event.currentTarget; nearBottom.current=area.scrollHeight-area.scrollTop-area.clientHeight<60; if(nearBottom.current) setNewMessage(false); }}>
    {messages.map(item => <div key={item.id} className={`${styles.bubble} ${item.role==='user' ? styles.userBubble : styles.assistantBubble}`}><span className={styles.sender}>{item.role==='user' ? 'You' : 'Website help'}</span><p>{item.text}</p><span className={styles.timestamp}>{item.time}</span></div>)}
    <div className={styles.questions} aria-label="Suggested questions">{questions.map(item => <button key={item.question} type="button" disabled={typing || !!failed} onClick={() => send(item.question)}>{item.question}</button>)}</div>
    <nav aria-label="Help topics" className={styles.topicLinks}>{questions.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
    {typing && <p className={styles.typing}>Preparing local reply…</p>}
    {failed && <div className={styles.failure}><p>Could not prepare a local reply.</p><button type="button" onClick={() => respond(failed)}>Retry reply</button></div>}
   </div>
   {newMessage && <button className={styles.newMessage} type="button" onClick={scrollBottom}>New message ↓</button>}
   <form className={styles.composer} onSubmit={event => {event.preventDefault();send(draft);}}><label className={styles.srOnly} htmlFor="account-help-message">Message website help</label><textarea ref={composer} id="account-help-message" rows={2} maxLength={2000} placeholder="Ask about the website…" value={draft} onChange={event => setDraft(event.target.value)} onCompositionStart={() => {composing.current=true;}} onCompositionEnd={() => {composing.current=false;}} onKeyDown={event => {if(event.key==='Enter' && !event.shiftKey && !event.nativeEvent.isComposing && !composing.current && event.keyCode!==229){event.preventDefault();send(draft);}}}/><button type="submit" aria-label="Send message" disabled={!draft.trim() || typing || !!failed}><Send size={20} aria-hidden="true"/></button></form>
   <footer className={styles.footer}><Link className={styles.contact} href="/contact">Contact</Link><button type="button" onClick={() => setConfirmClear(true)}><Trash2 size={15} aria-hidden="true"/>Clear conversation</button></footer>
   {confirmClear && <div className={styles.confirm} role="group" aria-label="Confirm clear conversation"><p>Clear this local conversation?</p><button type="button" onClick={clear}>Clear</button><button type="button" onClick={() => setConfirmClear(false)}>Cancel</button></div>}
   <div className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
  </dialog>
 </>;
}
