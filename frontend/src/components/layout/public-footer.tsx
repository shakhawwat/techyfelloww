import Link from 'next/link';
import {Container} from '@/components/ui/container';
import {editorialPage} from '@/lib/public/server-editorial';
import {validFooterSocialUrl,type FooterPlatform} from '@/content/footer-socials';
import {configuredFooterSocials} from '@/content/footer-socials';
import {FooterSocialIcon} from './footer-social-icon';
import styles from './public-footer.module.css';
const groups=[
 {title:'Solutions',links:[['Solutions','/solutions'],['Research','/research'],['Consulting','/consulting']]},
 {title:'Learn & Build',links:[['Academy','/academy'],['Robotics Store','/store/kits'],['Build With Us','/build-with-us']]},
 {title:'Company',links:[['About','/about'],['Team','/team'],['Contact','/contact']]},
];
export async function PublicFooter(){
 const company=await editorialPage('company');
 const socials=company?(company.approvedLinks??[]).flatMap(link=>{const platform=link.label as FooterPlatform;const allowed=['Facebook','LinkedIn','Instagram','YouTube','X','GitHub','TikTok','WhatsApp'];const href=allowed.includes(platform)?validFooterSocialUrl(platform,link.url):null;return href?[{platform,href,demo:false}]:[];}):configuredFooterSocials();
 return <footer className={styles.footer} data-theme="dark"><Container><div className={styles.layout}><div className={styles.brand}><Link href="/" prefetch={false} className={styles.wordmark} aria-label="Techy Fellow home">Techy <span>Fellow</span></Link><p className={styles.description}>{company?.summary??'Engineering and research connected with practical learning and technical guidance.'}</p><p className={styles.disciplines}>{company?.sections.find(section=>section.key==='disciplines')?.description??'Engineering • Research • Academy • Consulting'}</p>{socials.length>0&&<div className={styles.socials} role="group" aria-label="Social links">{socials.map(({platform,href,demo})=><a key={platform} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${demo?`${platform} demo destination`:`Techy Fellow on ${platform}`} (opens in a new tab)`}><FooterSocialIcon platform={platform}/></a>)}</div>}{socials.some(link=>link.demo)&&<p className={styles.socialNote}>Social links shown for preview.</p>}</div><nav className={styles.navigation} aria-label="Footer navigation">{groups.map(group=><div key={group.title}><h2>{group.title}</h2><ul>{group.links.map(([label,href])=><li key={href}><Link href={href} prefetch={false}>{label}</Link></li>)}</ul></div>)}</nav></div><div className={styles.bottom}><p>© {new Date().getFullYear()} Techy Fellow. All rights reserved.</p></div></Container></footer>;
}
