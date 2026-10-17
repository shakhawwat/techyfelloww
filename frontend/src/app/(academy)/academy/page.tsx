import {editorialPage} from '@/lib/public/server-editorial';
import { AcademyLanding } from '@/components/public/academy-landing';
import { academyAboutMetadata } from '@/components/public/academy-about';
export const dynamic = 'force-dynamic';
export async function generateMetadata() { const page=await editorialPage('academy'),base=academyAboutMetadata('academy');return {...base,title:page?.seo?.title??base.title,description:page?.seo?.description??page?.summary??base.description}; }
export default async function Page({searchParams}:{searchParams:Promise<import('@/lib/public/pages').Search>}) { return <AcademyLanding search={await searchParams}/>; }
