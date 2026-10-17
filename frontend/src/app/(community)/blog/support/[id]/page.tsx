import {notFound} from 'next/navigation';
import {UserChat} from '@/components/messaging/user-chat';
export default async function Support({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[a-f0-9]{24}$/.test(id))notFound();return <UserChat conversationId={id} inboxHref="/blog/support"/>;}
