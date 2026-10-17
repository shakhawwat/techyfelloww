'use client';
import {useEffect,useRef,useState} from 'react';
import {errorOf} from '@/lib/admin/api';
import styles from './community.module.css';
export function PostDialog({title,description,reason=false,confirmLabel,onConfirm,onClose}:{title:string;description:string;reason?:boolean;confirmLabel:string;onConfirm:(reason:string)=>Promise<void>;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),[value,setValue]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const element=dialog.current,trigger=document.activeElement as HTMLElement|null;element?.showModal();return()=>{element?.close();trigger?.focus();};},[]);
 return <dialog ref={dialog} className={styles.dialog} aria-labelledby="post-confirm-title" onCancel={event=>{event.preventDefault();if(!busy)onClose();}}><form onSubmit={async event=>{event.preventDefault();if(busy)return;setBusy(true);setError('');try{await onConfirm(value);onClose();}catch(cause){setError(errorOf(cause).message);}finally{setBusy(false);}}}><h2 id="post-confirm-title">{title}</h2><p>{description}</p>{reason&&<label>Rejection reason<textarea required maxLength={1000} value={value} disabled={busy} onChange={event=>setValue(event.target.value)}/></label>}{error&&<p role="alert" className={styles.error}>{error}</p>}{busy&&<p role="status">Saving…</p>}<div className={styles.actions}><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" disabled={busy} className={styles.primary}>{confirmLabel}</button></div></form></dialog>;
}
