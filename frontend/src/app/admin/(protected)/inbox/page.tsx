import {AdminInbox} from '@/components/messaging/messages';
export default async function InboxPage({searchParams}:{searchParams:Promise<{conversation?:string}>}){
 const {conversation}=await searchParams;
 return <AdminInbox initialConversation={conversation&&/^[a-f0-9]{24}$/.test(conversation)?conversation:''}/>;
}
