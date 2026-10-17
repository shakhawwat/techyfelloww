import {notFound} from 'next/navigation';
import {EditorialPageManager} from '@/components/admin/homepage-manager';
export default async function Page({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  if(!['about','contact','academy','company','projects','research','publications','team','store'].includes(slug))notFound();
  return <EditorialPageManager key={slug} slug={slug}/>;
}
