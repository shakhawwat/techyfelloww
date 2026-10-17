import { listMetadata } from '@/components/public/content-pages';
import { ProjectDirectory } from '@/components/public/project-directory';
import type { Search } from '@/lib/public/pages';
export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<Search> };
export async function generateMetadata({ searchParams }: Props) { return listMetadata('projects', await searchParams); }
export default async function Page({ searchParams }: Props) { return <ProjectDirectory search={await searchParams}/>; }
