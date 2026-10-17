import {accountReturnTo} from '@/lib/account/flow';
import { AccountForm } from '@/components/account/account-form';
export const metadata = {title:'Create account | Techy Fellow'};
export default async function Page({searchParams}:{searchParams:Promise<{returnTo?:string;created?:string}>}) {const query=await searchParams;return <AccountForm signup returnTo={accountReturnTo(query.returnTo,'/')} created={query.created==='1'}/>; }
