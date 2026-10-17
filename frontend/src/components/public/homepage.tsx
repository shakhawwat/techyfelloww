import type {KitPreview} from './kit-data';
import {HomeEditorialProvider} from './home-editorial';
import type {EditorialPage} from '@/lib/public/editorial';
import {Fragment as ReactFragment} from 'react';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import {Section} from '@/components/ui/section';
import {AudiencePathways} from './home-opening';
import {HeroSlider} from './hero-slider';
import {EngineeringServices,FeaturedProjects} from './home-engineering';
import {ResearchPublications} from './home-research';
import {HomeSupportSections} from './home-support';
import {HomeMentorshipStore} from './home-mentorship-store';
import {HomeCompany} from './home-company';
import {homeCopy as copy} from '@/content/home';
import type {ContentKind,ContentState} from '@/lib/public/content';
function Heading({eyebrow,title,description}:{eyebrow:string;title:string;description?:string}){return <div className='public-heading'><span className='eyebrow'>{eyebrow}</span><h2>{title}</h2>{description&&<p>{description}</p>}</div>;}
function Action({href,children,secondary=false}:{href:string;children:React.ReactNode;secondary?:boolean}){return <Link prefetch={false} className={`button button-${secondary?'secondary':'primary'}`} href={href}>{children}<ArrowUpRight aria-hidden='true'/></Link>;}
export function Homepage({content,page=null,kits=[],mentors=[],kitsUnavailable=false}:{kitsUnavailable?:boolean;mentors?:import('@/lib/public/content').PublishedItem[];kits?:KitPreview[];content:Record<ContentKind,ContentState>;page?:EditorialPage|null}){
 const sections:Record<string,React.ReactNode>={hero:<HeroSlider/>,audience:<AudiencePathways/>,solutions:<EngineeringServices/>,projects:<FeaturedProjects content={content.projects}/>,research:<ResearchPublications research={content.research} publications={content.publications}/>,support:<HomeSupportSections courses={content.courses}/>,"mentorship-store":<HomeMentorshipStore published={kits} unavailable={kitsUnavailable}/>,company:<HomeCompany content={content.team}/>,inquiry:<Section tone='dark' id='inquiry' tabIndex={-1} className='public-final-cta'><Heading eyebrow={page?.sections.find(s=>s.key==='inquiry')?.label??copy.inquiry.eyebrow} title={page?.sections.find(s=>s.key==='inquiry')?.title??copy.inquiry.title} description={page?.sections.find(s=>s.key==='inquiry')?.description??copy.inquiry.text}/><Action href={page?.sections.find(s=>s.key==='inquiry')?.href??'/build-with-us'}>{page?.sections.find(s=>s.key==='inquiry')?.cta??copy.inquiry.cta}</Action><p className='public-inquiry-availability'>{copy.inquiry.availability}</p></Section>};
 const configured=page?.sections.filter(s=>Object.hasOwn(sections,s.key))??[],order=[...configured.map(s=>s.key),...Object.keys(sections).filter(key=>!configured.some(s=>s.key===key))];
 return <HomeEditorialProvider page={page} mentors={mentors}><main id='public-main' tabIndex={-1}>{order.filter(key=>configured.find(s=>s.key===key)?.visible!==false).map(key=><ReactFragment key={key}>{sections[key]}</ReactFragment>)}</main></HomeEditorialProvider>;
}
