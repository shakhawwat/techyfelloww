"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import {adminReturnTo} from "@/lib/admin/idle";
import { api, errorOf, session } from "@/lib/admin/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/form-field";
export function AdminLogin({returnTo="/admin"}:{returnTo?:string}) {
  const router = useRouter();
  const [wrongAccount,setWrongAccount]=useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({}); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    session().then(() => { if (active) router.replace(adminReturnTo(returnTo)); }).catch(failure => {
      if (!active) return; const e = errorOf(failure);setWrongAccount(e.code==="ADMIN_ACCOUNT_REQUIRED"); if (e.status !== 401) setError(e.message); setChecking(false);
    });
    return () => { active = false; };
  }, [attempt, router,returnTo]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const errors: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254) errors.email = "Enter a valid email address.";
    if (!password || password.length > 128) errors.password = "Enter your password (at most 128 characters).";
    setFields(errors);
    if (Object.keys(errors).length) { requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus()); return; }
    setBusy(true);
    try { await api("/auth/login", "POST", { email: email.trim(), password }); const fresh=await session();if(!fresh.adminSession)throw new Error('Admin session could not be verified.');try{localStorage.setItem('techyfellow.admin.activity',JSON.stringify({scope:`${fresh.user.id}:${fresh.adminSession.createdAt}`,timestamp:Date.parse(fresh.adminSession.lastActivityAt)}));}catch{} setPassword(""); router.replace(adminReturnTo(returnTo));router.refresh(); }
    catch (failure) { setError(errorOf(failure).status === 401 ? "Email or password is incorrect, or this account is unavailable." : errorOf(failure).message); }
    finally { setBusy(false); setPassword(""); }
  }
  return <main className="admin-login" data-theme="light"><div className="admin-login-brand" data-theme="dark"><Link className="wordmark" href="/">Techy<span>Fellow</span><span className="wordmark-dot" aria-hidden="true" /></Link><p>Content workspace</p></div>
    <Card><span className="eyebrow"><LockKeyhole aria-hidden="true" />Restricted access</span><h1>Admin sign in</h1><p>Use your assigned administrator account.</p>
      {wrongAccount&&<p role="status">A public member account is signed in. <Button type="button" disabled={busy} onClick={async()=>{setBusy(true);try{await api('/auth/logout','POST',{});setWrongAccount(false);setError('');setChecking(false);router.refresh();}catch{setError('Switching accounts could not be confirmed. Try again.');}finally{setBusy(false);}}}>Switch to an admin account</Button></p>}
      {checking ? <p role="status">Checking your existing session…</p> : <form className="admin-form" onSubmit={submit} noValidate>
        {error && <div className="admin-alert" role="alert"><p>{error}</p><Button type="button" variant="ghost" onClick={() => { setChecking(true); setError(""); setAttempt(previous => previous + 1); }}>Retry session check</Button></div>}
        <TextField id="admin-email" label="Email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} error={fields.email} required disabled={busy} />
        <TextField id="admin-password" label="Password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} error={fields.password} required disabled={busy} />
        <Button type="submit" loading={busy} loadingLabel="Signing in…">Sign in<ArrowRight aria-hidden="true" /></Button>
      </form>}
    </Card><p className="admin-login-note">Accounts are provisioned by an administrator. There is no public registration.</p></main>;
}
