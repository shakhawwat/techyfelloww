import {type ReactNode} from 'react';
import {AccountSessionProvider} from '@/components/account/session';
import {StoreProvider} from '@/components/store/provider';
import {StoreShell} from '@/components/store/shell';
import {storeGet} from '@/components/store/server';
import type {StoreCategory} from '@/components/store/types';
export const dynamic='force-dynamic';
export const metadata={title:'Robotics Store | Techyfellow',description:'Explore robotics kits, development boards and electronics. Submit an order request for staff confirmation.'};
export default async function StoreLayout({children}:{children:ReactNode}){const result=await storeGet<{data:StoreCategory[]}>('categories');return <AccountSessionProvider><a className="skip-link" href="#public-main">Skip to content</a><StoreProvider><StoreShell categories={result.data?.data??[]}>{children}</StoreShell></StoreProvider></AccountSessionProvider>;}
