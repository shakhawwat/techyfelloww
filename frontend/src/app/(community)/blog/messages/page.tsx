import {DirectInbox} from '@/components/messaging/direct-inbox';
export default async function Messages({searchParams}:{searchParams:Promise<{user?:string}>}){const q=await searchParams;return <DirectInbox recipientId={typeof q.user==='string'&&/^[a-f0-9]{24}$/.test(q.user)?q.user:''}/>;}
