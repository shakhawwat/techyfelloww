import {FollowingFeed} from '@/components/community/following-feed';
export const metadata={title:'Following | Techyfellow Community'};
export default async function FollowingPage({searchParams}:{searchParams:Promise<{search?:string;category?:string;page?:string}>}){const params=await searchParams;return <FollowingFeed params={params}/>;}
