import {AuthorPosts} from '@/components/community/author-posts';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <AuthorPosts postId={id}/>;}
