import {editorialPage} from '@/lib/public/server-editorial';
import { academyAboutMetadata } from '@/components/public/academy-about';
import { AboutPage } from '@/components/public/about-editorial';
export const dynamic = 'force-dynamic';
export async function generateMetadata() { const page=await editorialPage('about'),base=academyAboutMetadata('about');return {...base,title:page?.seo?.title??base.title,description:page?.seo?.description??page?.summary??base.description}; }
export default function Page() { return <AboutPage/>; }
