import {StoreCatalog,type StoreQuery} from '@/components/store/catalog';
export default async function Page({searchParams}:{searchParams:Promise<StoreQuery>}){return <StoreCatalog query={await searchParams} kits/>;}
