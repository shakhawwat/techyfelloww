'use client';
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {api,errorOf} from '@/lib/admin/api';
export type ReplyNotification={id:string;conversationId?:string;kind?:string;href?:string;subject:string;text:string;createdAt:string;readAt:string|null;actionable?:boolean;friendship?:import('@/components/community/friends/friend-control').FriendState};
type Snapshot={ownerId:string;items:ReplyNotification[];unread:number;through:string};
type Notifications={snapshot:Snapshot|null;error:string;refresh:()=>Promise<boolean>;markRead:(id?:string)=>Promise<void>};
const Context=createContext<Notifications|null>(null);
export function AccountNotifications({userId,verifySession,children}:{userId:string;verifySession:()=>Promise<boolean>;children:ReactNode}){
 const [storedSnapshot,setSnapshot]=useState<Snapshot|null>(null),[error,setError]=useState('');
 const snapshot=storedSnapshot?.ownerId===userId?storedSnapshot:null;
 const requests=useRef<AbortController|null>(null),version=useRef(0);
 const refresh=useCallback(async()=>{
  if(!userId||!requests.current)return false;const revision=++version.current,controller=requests.current;
  try{const result=await api<{data:Snapshot}>('/account/notifications','GET',undefined,controller.signal);if(controller.signal.aborted||revision!==version.current)return false;if(result.data.ownerId!==userId){setSnapshot(null);void verifySession();return false;}setSnapshot(result.data);setError('');return true;}
  catch(cause){if(!controller.signal.aborted){const failure=errorOf(cause);setError('Notifications could not be refreshed.');if(failure.status===401){setSnapshot(null);void verifySession();}}return false;}

 },[userId,verifySession]);
 useEffect(()=>{
  const controller=new AbortController();requests.current=controller;let timer:ReturnType<typeof setTimeout>,delay=20000,active=true,running=false;
  const run=async()=>{clearTimeout(timer);if(!userId||!active||running||document.visibilityState!=='visible')return;running=true;const ok=await refresh();running=false;delay=ok?20000:Math.min(delay*2,120000);if(active)timer=setTimeout(run,delay);};
  timer=setTimeout(()=>{setSnapshot(null);setError('');void run();},0);document.addEventListener('visibilitychange',run);window.addEventListener('account:notifications',run);
  return()=>{active=false;clearTimeout(timer);controller.abort();document.removeEventListener('visibilitychange',run);window.removeEventListener('account:notifications',run);};
 },[userId,refresh]);
 const markRead=useCallback(async(id?:string)=>{
  const controller=requests.current;if(!controller||!userId||!id&&!snapshot)return;
  ++version.current;
  try{await api(id?`/account/notifications/${encodeURIComponent(id)}/read`:'/account/notifications/read-all','POST',id?{}:{through:snapshot!.through},controller.signal);if(!controller.signal.aborted)await refresh();}
  catch(cause){if(!controller.signal.aborted){setError('Read state could not be saved. Please retry.');if(errorOf(cause).status===401)void verifySession();}throw cause;}
 },[userId,snapshot,refresh,verifySession]);
 return <Context.Provider value={{snapshot,error,refresh,markRead}}>{children}</Context.Provider>;
}
export function useAccountNotifications(){const value=useContext(Context);if(!value)throw new Error('Account notifications provider missing');return value;}
