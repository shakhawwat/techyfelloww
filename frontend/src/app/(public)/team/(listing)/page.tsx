import { listMetadata } from '@/components/public/content-pages';
import { TeamDirectory } from '@/components/public/team-directory';
import type { Search } from '@/lib/public/pages';
export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<Search> };
export async function generateMetadata({ searchParams }: Props) { return listMetadata('team', await searchParams); }
export default async function Page({ searchParams }: Props) { return <TeamDirectory search={await searchParams}/>; }
