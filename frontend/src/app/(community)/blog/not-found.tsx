import Link from 'next/link';
import styles from '@/components/community/community.module.css';
export default function CommunityNotFound(){return <main id="public-main" className={styles.page}><h1>Content not found</h1><p>This community page is unavailable or has not been published.</p><Link href="/blog">Back to the feed</Link></main>;}
