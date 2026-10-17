import {accountReturnTo} from '@/lib/account/flow';
import { AcademyAuthForm } from '@/components/academy/academy-auth-form';
export const metadata={title:'Academy login | Techyfellow',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{returnTo?:string;created?:string}>}){const query=await searchParams;return <AcademyAuthForm returnTo={accountReturnTo(query.returnTo)} created={query.created==='1'}/>;}
