"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut, ShieldCheck, Menu } from "lucide-react";
import { api, errorOf, session, type ApiError } from "@/lib/admin/api";
import {AdminIdleClock,AdminRequests,syncAdminActivity,adminReturnTo,ADMIN_WARNING_MS} from "@/lib/admin/idle";
import { labels, resources, type Resource, type User } from "@/lib/admin/contracts";
import {AdminPasswordChange} from "./password-change";
import { ConfirmAction } from "./confirm";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Context = { signal:AbortSignal; user: User; can: (resource: Resource | "leads" | "inbox" | "blog" | "direct-reports" | "community", action: string) => boolean; call: <T>(path: string, method?: string, body?: unknown) => Promise<T>; notify: (message: string) => void };
const AdminContext = createContext<Context | null>(null);
export function useAdmin(): Context { const value = useContext(AdminContext); if (!value) throw new Error("Admin session required"); return value; }
export function AdminSession({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [requestSignal,setRequestSignal]=useState<AbortSignal>(()=>new AbortController().signal);
  const [obscured,setObscured]=useState(false);
  const [drawer, setDrawer] = useState(false);
  const [identity, setIdentity] = useState<Awaited<ReturnType<typeof session>> | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const requests=useRef(new AdminRequests()),ended=useRef(false),path=useRef(pathname),clock=useRef<AdminIdleClock|null>(null),scope=useRef(''),[warning,setWarning]=useState(0);
  useEffect(()=>{path.current=pathname;},[pathname]);
  const expire=useCallback(async(broadcast=true)=>{
    if(ended.current)return;ended.current=true;requests.current.clear();clock.current=null;setIdentity(null);setNotice('');setDrawer(false);setWarning(0);setError(null);
    // The app has no persisted admin records or query library. Unmounting clears editor/list state;
    // aborting this scope prevents authenticated responses from restoring it.
    let currentScope=true;try{const saved=JSON.parse(localStorage.getItem('techyfellow.admin.activity')??'null');if(saved?.scope&&saved.scope!==scope.current)currentScope=false;}catch{}
    if(broadcast&&currentScope){try{localStorage.removeItem('techyfellow.admin.activity');const channel=new BroadcastChannel('techyfellow.admin.session');channel.postMessage({type:'logout',scope:scope.current});channel.close();}catch{}}
    try{if(currentScope)await api('/auth/logout','POST',{});}catch{/* The server also rejects an expired/revoked session. */}
    router.replace(`/admin/login?returnTo=${encodeURIComponent(adminReturnTo(path.current))}`);router.refresh();
  },[router]);
  const call=useCallback(async <T,>(url:string,method?:string,body?:unknown):Promise<T>=>{
    if(ended.current||!clock.current?.remaining()){void expire();throw new Error('Admin session expired.');}
    try{return await api<T>(url,method,body,requests.current.signal);}catch(failure){const e=errorOf(failure);if(e.status===401)void expire();throw e;}
  },[expire]);
  useEffect(()=>{
    if(requests.current.signal.aborted&&!ended.current)requests.current=new AdminRequests();
    const requestScope=requests.current;let active=true;
    const check=async()=>{setObscured(true);try{const result=await session(requests.current.signal);if(!active||ended.current)return;if(!result.adminSession)throw new Error('Admin session expiry could not be verified.');
      scope.current=`${result.user.id}:${result.adminSession.createdAt}`;clock.current=new AdminIdleClock(Date.parse(result.adminSession.lastActivityAt));
      if(!clock.current.remaining()){void expire();return;}try{const saved=JSON.parse(localStorage.getItem('techyfellow.admin.activity')??'null');if(!saved||saved.scope!==scope.current)localStorage.setItem('techyfellow.admin.activity',JSON.stringify({scope:scope.current,timestamp:clock.current.lastActivity}));else syncAdminActivity(clock.current,scope.current,localStorage);}catch{}setRequestSignal(requests.current.signal);setIdentity(result);setObscured(false);setError(null);
    }catch(failure){if(!active||ended.current)return;const e=errorOf(failure);if(e.status===401)void expire();else{setIdentity(null);setError(e);}}};
    void check();const visible=()=>{if(document.visibilityState!=='visible'){setObscured(true);return;}if(clock.current)syncAdminActivity(clock.current,scope.current,localStorage);if(document.visibilityState==='visible'){if(clock.current&&!clock.current.remaining())void expire();else void check();}};
    document.addEventListener('visibilitychange',visible);window.addEventListener('pageshow',visible);
    return()=>{active=false;requestScope.clear();document.removeEventListener('visibilitychange',visible);window.removeEventListener('pageshow',visible);};
  },[attempt,expire]);
  useEffect(()=>{
    if(!identity||!clock.current)return;
    let channel:BroadcastChannel|undefined;try{channel=new BroadcastChannel('techyfellow.admin.session');}catch{}
    let lastEvent=0,lastSent=0,sending=false;
    const save=(timestamp:number)=>{try{localStorage.setItem('techyfellow.admin.activity',JSON.stringify({scope:scope.current,timestamp}));}catch{};channel?.postMessage({type:'activity',scope:scope.current,timestamp});};
    const activity=async(event:Event)=>{if(!event.isTrusted||document.visibilityState!=='visible'||ended.current)return;const now=Date.now();try{const saved=JSON.parse(localStorage.getItem('techyfellow.admin.activity')??'null');if(saved?.scope&&saved.scope!==scope.current){void expire(false);return;}}catch{}if(clock.current)syncAdminActivity(clock.current,scope.current,localStorage,now);if(!clock.current?.remaining(now)){void expire();return;}if(now-lastEvent<1000)return;lastEvent=now;clock.current.activity(now);setWarning(0);save(now);
      if(sending||now-lastSent<1000)return;sending=true;lastSent=now;try{await call('/auth/activity','POST',{});}catch{/* Authentication failures expire through call. Network errors cannot revive a server session. */}finally{sending=false;}};
    const receive=(message:{type?:string;scope?:string;timestamp?:number})=>{if(message.scope!==scope.current){if(message.scope&&message.type==='activity')void expire(false);return;}if(message.type==='logout'){void expire(false);return;}if(typeof message.timestamp==='number')clock.current?.synchronize(message.timestamp);};
    if(channel)channel.onmessage=event=>receive(event.data??{});
    const storage=(event:StorageEvent)=>{if(event.key!=='techyfellow.admin.activity')return;try{if(event.newValue){const message=JSON.parse(event.newValue);receive({...message,type:'activity'});}else if(event.oldValue){receive({...JSON.parse(event.oldValue),type:'logout'});}}catch{}};
    window.addEventListener('storage',storage);const events=['keydown','pointerdown','touchstart','scroll'];for(const event of events)window.addEventListener(event,activity,{passive:true,capture:true});
    const tick=()=>{if(clock.current)syncAdminActivity(clock.current,scope.current,localStorage);const remaining=clock.current?.remaining()??0;if(!remaining){void expire();return;}setWarning(remaining<=ADMIN_WARNING_MS?Math.ceil(remaining/1000):0);};tick();const timer=window.setInterval(tick,1000);
    return()=>{window.clearInterval(timer);channel?.close();window.removeEventListener('storage',storage);for(const event of events)window.removeEventListener(event,activity,true);};
  },[identity,call,expire]);
  if (!identity) return <main className="admin-login"><Card><ShieldCheck aria-hidden="true" /><h1>{error?.status === 403 ? "Access denied" : error ? "Unable to verify access" : "Verifying your session…"}</h1>
    {error ? <><p role="alert">{error.message}</p>{error.code === "ADMIN_ACCOUNT_REQUIRED" && <p><Button onClick={async()=>{try{await api('/auth/logout','POST',{});router.replace(`/admin/login?returnTo=${encodeURIComponent(adminReturnTo(pathname))}`);router.refresh();}catch{setError(errorOf(new Error('Switching accounts could not be confirmed.')));}}}>Switch to an admin account</Button></p>}<Button onClick={() => { setError(null); setAttempt(previous => previous + 1); }}>Retry session check</Button></> : <p role="status">Protected content stays hidden while access is checked.</p>}</Card></main>;
  const can = (resource: Resource | "leads" | "inbox" | "blog" | "direct-reports" | "community", action: string) => identity.permissions.includes(`${resource}:${action}`);
  const navigation = [...(can("direct-reports","review")?[{label:"Community moderation",href:"/admin/message-reports"}]:[]),...(can("blog","read")?[{label:"Community",href:"/admin/blog"}]:[]),...(can("inbox","read")?[{label:"Inbox",href:"/admin/inbox"}]:[]),...resources.filter(resource => can(resource, "read")).map(resource => ({ label: resource==='pages'?'Pages':resource==='products'?'Store':labels[resource], href: resource==='products'?'/admin/store':`/admin/${resource}` })), ...(can("courses", "edit") ? [{ label: "Academy", href: "/admin/academy" }, { label: "Academy access", href: "/admin/academy-access" }] : []), ...(identity.permissions.includes("users:admin")?[{label:"Users & Access",href:"/admin/users"}]:[]), ...(can("leads", "read") ? [{ label: "Leads", href: "/admin/leads" }] : []), ...(resources.some(resource => can(resource, "read")) ? [{ label: "Media", href: "/admin/media" }] : [])];
  async function logout() {
    if (!document.dispatchEvent(new Event("admin:before-logout", { cancelable: true }))) return;
    setLoggingOut(true); setNotice("");
    try { await expire(); }
    catch (failure) { setError(errorOf(failure)); } finally { setLoggingOut(false); }
  }
  return <AdminContext.Provider value={{ signal:requestSignal,user: identity.user, can, call, notify: setNotice }}>
    {obscured&&<main className="admin-login"><Card><h1>Verifying your session…</h1><p role="status">Protected content stays hidden while access is checked.</p></Card></main>}
    <div hidden={obscured} style={{display:obscured?"none":undefined}} inert={obscured}>
    <a href="#admin-main" className="skip-link">Skip to content</a>
    <div className="admin-workspace" data-theme="dark">
    <aside className="admin-sidebar"><Link className="admin-brand" href="/admin">Techy Fellow <span>Admin</span></Link><nav aria-label="Admin navigation"><Link href="/admin" aria-current={pathname === "/admin" ? "page" : undefined}>Overview</Link>{navigation.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href || pathname.startsWith(`${link.href}/`) ? "page" : undefined}>{link.label}</Link>)}</nav></aside>
    <div className="admin-workspace-content">
    <div className="admin-mobile-bar"><Link href="/admin">Techy Fellow · Admin</Link><Button variant="ghost" aria-label="Open admin navigation" aria-expanded={drawer} onClick={() => setDrawer(true)}><Menu aria-hidden="true" /></Button></div>
    {drawer && <ConfirmAction title="Admin navigation" presentation="details" className="admin-drawer" busy={false} onCancel={() => setDrawer(false)} closeLabel="Close admin navigation" detailsLabel="Admin navigation links"><nav aria-label="Mobile admin navigation"><Link href="/admin" onClick={() => setDrawer(false)} aria-current={pathname === "/admin" ? "page" : undefined}>Overview</Link>{navigation.map(link => <Link key={link.href} href={link.href} onClick={() => setDrawer(false)} aria-current={pathname === link.href || pathname.startsWith(`${link.href}/`) ? "page" : undefined}>{link.label}</Link>)}</nav></ConfirmAction>}
    <div className="admin-session-bar"><Container><span><ShieldCheck aria-hidden="true" />{identity.user.roleName??identity.user.role.replaceAll("_", " ")}<span className="admin-email">{identity.user.email}</span></span>
      <Button variant="ghost" loading={loggingOut} loadingLabel="Signing out…" onClick={logout}><LogOut aria-hidden="true" />Log out</Button></Container></div>
    <main id="admin-main" tabIndex={-1} className="admin-main"><Container>
      {error && <p className="admin-alert" role="alert">{error.message}</p>}
      {warning>0&&<p className="admin-alert" role="status">Your admin session expires in {warning} seconds. Interact with this page to stay signed in.</p>}
      {notice && <p className="admin-success" role="status">{notice}</p>}
      {identity.passwordChangeRequired?<AdminPasswordChange/>:children}
    </Container></main></div></div></div>
  </AdminContext.Provider>;
}
export function ResourceGate({ resource, edit = false, children }: { resource: Resource; edit?: boolean; children: ReactNode }) {
  const { can } = useAdmin();
  if (!can(resource, edit ? "edit" : "read")) return <Card><h1>Access denied</h1><p role="alert">Your role does not permit this resource or action.</p></Card>;
  return children;
}
