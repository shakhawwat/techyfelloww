import {publishedKits} from '@/components/public/published-kits';
import {editorialProductCollection,editorialPage} from '@/lib/public/server-editorial';
import {contentDetail} from '@/lib/public/server-pages';
import type {Metadata} from 'next';
import {Homepage} from '@/components/public/homepage';
import {homepageContent} from '@/lib/public/server-content';
import {homeCopy} from '@/content/home';
export const dynamic='force-dynamic';
export async function generateMetadata():Promise<Metadata>{const page=await editorialPage('homepage'),title=page?.seo?.title??homeCopy.metadata.title,description=page?.seo?.description??homeCopy.metadata.description;return {title,description,openGraph:{title,description,type:'website',siteName:'Techy Fellow'}};}
export default async function Home(){const [content,page,products]=await Promise.all([homepageContent(),editorialPage('homepage'),editorialProductCollection()]);if(page)for(const kind of ['projects','research','publications','courses','team'] as const){const selected=page.featured.filter(ref=>ref.kind===kind);if(selected.length){const records=await Promise.all(selected.map(ref=>contentDetail(kind,ref.slug)));const data=records.flatMap(result=>result.state==='available'?[result.data]:[]);content[kind]={state:data.length?'available':'empty',data};}}const mentors=page?await Promise.all((page.mentorSlugs??[]).map(slug=>contentDetail('team',slug))):[];return <Homepage mentors={mentors.flatMap(result=>result.state==='available'?[result.data]:[])} content={content} page={page} kitsUnavailable={products.state==='unavailable'} kits={publishedKits(products.data)}/>;}
