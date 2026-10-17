import {accountReturnTo} from '@/lib/account/flow';
import { AccountForm } from '@/components/account/account-form';
export const metadata = {title:'Log in | Techy Fellow'};
export default async function Page({searchParams}:{searchParams:Promise<{returnTo?:string;created?:string}>}) {const query=await searchParams;return <AccountForm returnTo={accountReturnTo(query.returnTo,'/')} created={query.created==='1'}/>; }
