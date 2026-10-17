import {notFound} from 'next/navigation';
import {ClientMessages} from '@/components/messaging/messages';
export default async function InboxConversationPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[a-f0-9]{24}$/.test(id))notFound();
 return <ClientMessages conversationId={id}/>;
}
