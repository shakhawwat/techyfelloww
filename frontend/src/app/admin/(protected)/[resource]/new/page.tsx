import {editorialDefaults} from '@/lib/admin/editorial-defaults';
import { notFound } from "next/navigation";
import { isResource } from "@/lib/admin/contracts";
import { ContentEditor } from "@/components/admin/content-editor";
export default async function CreatePage({ params,searchParams }: { params: Promise<{ resource: string }>;searchParams:Promise<{group?:string;target?:string}> }) {
  const { resource } = await params; if (!isResource(resource)) notFound(); const query=await searchParams;return <ContentEditor resource={resource} defaults={resource==='pages'?editorialDefaults(query.group??'',query.target):undefined} />;
}
