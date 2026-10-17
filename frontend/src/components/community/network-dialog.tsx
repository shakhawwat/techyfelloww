'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import styles from './blog-network.module.css';
export function NetworkDialog({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{const active=document.activeElement as HTMLElement|null;ref.current?.showModal();return()=>active?.focus();},[]);return <dialog ref={ref} className={styles.dialog} aria-label={title} onCancel={event=>{event.preventDefault();onClose();}}><header><h2>{title}</h2><button type="button" aria-label="Close dialog" onClick={onClose}>×</button></header>{children}</dialog>;}
