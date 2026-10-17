import {AdminLogin} from '@/components/admin/login';
import {adminReturnTo} from '@/lib/admin/idle';
export default async function Page({searchParams}:{searchParams:Promise<{returnTo?:string}>}){return <AdminLogin returnTo={adminReturnTo((await searchParams).returnTo)}/>;}
