'use client';
import {useRef,useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {api} from '@/lib/admin/api';
import {accountRequest,checkedAccount,type AccountUser} from '@/lib/account/api';
import {accountFormValues,accountReturnTo} from '@/lib/account/flow';
import {useAccountSession} from './session';
export function useAccountForm(signup:boolean,destination:string,academy=false){
 const router=useRouter(),{refresh,session}=useAccountSession(),locked=useRef(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const returnTo=accountReturnTo(destination,academy?'/academy':'/'),login=`${academy?'/academy':''}/login?returnTo=${encodeURIComponent(returnTo)}`,register=`${academy?'/academy':''}/signup?returnTo=${encodeURIComponent(returnTo)}`;
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(locked.current)return;setError('');const form=event.currentTarget;let values;try{values=accountFormValues(new FormData(form),signup);}catch(cause){setError(cause instanceof Error?cause.message:'Check your fields.');return;}locked.current=true;setBusy(true);
 try{const result=await accountRequest<{data:{user:AccountUser}}>(signup?'register':'login','POST',values);checkedAccount(result.data.user);form.reset();if(signup){router.replace(`${login}&created=1`);}else{if(!await refresh())throw new Error('Sign-in was accepted, but your session could not be confirmed. Reload or try again.');router.replace(returnTo);router.refresh();}}catch(cause){setError(cause instanceof Error?cause.message:'The account service is unavailable. Please try again.');}finally{locked.current=false;setBusy(false);}}
 async function switchAccount(){setBusy(true);setError('');try{await api('/auth/logout','POST',{});await refresh();router.refresh();}catch{setError('Switching accounts could not be confirmed. Please try again.');}finally{setBusy(false);}}
 return {busy,error,submit,returnTo,login,register,wrongAccount:session.status==='authenticated'&&session.user?.role!=='MEMBER',switchAccount};
}
