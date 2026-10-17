import {editorialPage} from '@/lib/public/server-editorial';
import { inquiryMetadata } from '@/components/public/inquiry-page';
import { ContactInquiryPage } from '@/components/public/contact-inquiry-page';
import type { InquirySearch } from '@/lib/inquiry/schema';
export const dynamic = 'force-dynamic';
export async function generateMetadata() { const page=await editorialPage('contact'),base=inquiryMetadata(false);return {...base,title:page?.seo?.title??base.title,description:page?.seo?.description??page?.summary??base.description}; }
export default async function Page({ searchParams }: { searchParams: Promise<InquirySearch> }) { return <ContactInquiryPage search={await searchParams} />; }
