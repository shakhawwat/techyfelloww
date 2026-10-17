import {notFound} from 'next/navigation';
import {DirectInbox} from '@/components/messaging/direct-inbox';
export default async function Messages({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[a-f0-9]{24}$/.test(id))notFound();return <DirectInbox conversationId={id}/>;}
