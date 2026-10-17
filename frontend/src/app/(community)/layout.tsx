import {Suspense,type ReactNode} from 'react';
import {AccountSessionProvider} from '@/components/account/session';
import {CommunityNavbar} from '@/components/community/community-navbar';
import styles from '@/components/community/community-navbar.module.css';
export const metadata={title:'Community | Techyfellow',description:'Connect, share and learn with the Techyfellow community.'};
export const dynamic='force-dynamic';
export default function CommunityLayout({children}:{children:ReactNode}){return <AccountSessionProvider><div className={styles.community} data-community-layout><a className="skip-link" href="#public-main">Skip to content</a><Suspense fallback={<div className={styles.headerPlaceholder} aria-label="Loading community navigation"/>}><CommunityNavbar/></Suspense>{children}</div></AccountSessionProvider>;}
