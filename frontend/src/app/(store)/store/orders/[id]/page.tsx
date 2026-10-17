import {notFound} from 'next/navigation';
import {StoreOrders} from '@/components/store/orders';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[a-f0-9]{24}$/.test(id))notFound();return <StoreOrders id={id}/>;}
