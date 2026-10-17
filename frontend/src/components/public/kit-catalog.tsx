'use client';
import Image from 'next/image';
import type {EditorialPage} from '@/lib/public/editorial';
import Link from 'next/link';
import {useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {Container} from '@/components/ui/container';
import {homeCopy} from '@/content/home';
import {demoKits,bdt,kitTotal,type KitPreview} from './kit-data';
import {KitPopup} from './home-mentorship-store';
import styles from './kit-catalog.module.css';
export function KitCatalog({published=[],page,unavailable=false}:{published?:KitPreview[];page?:EditorialPage|null;unavailable?:boolean}){
 const kits=published.length?published:demoKits;
 const [selected,setSelected]=useState<KitPreview|null>(null);
 return <main id="public-main" tabIndex={-1} data-theme="dark" className={styles.catalog}><Container><nav aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true"> / </span><span>Concept kits</span></nav><header><p className={styles.label}>ROBOTICS STORE</p><h1>{page?.title??(published.length?'Explore our kits.':'Explore all concept kits.')}</h1><p>{page?.summary??(published.length?'Browse published hardware and kit content. Contact us about availability; checkout remains unavailable.':'Browse six illustrative robotics, IoT and AI kit concepts. Component estimates are examples, not active offers or verified quotations.')}</p><p className={styles.notice}>{published.length?'Published product information. Checkout is unavailable; confirm availability by inquiry.':homeCopy.store.availability}</p></header>{unavailable&&<p className={styles.notice} role="status">Published product content is temporarily unavailable. Illustrative previews are shown separately.</p>}<div className={styles.grid}>{kits.map(kit=><article key={kit.id} className={styles.card}><div className={styles.image}><Image src={kit.image.url} alt={kit.image.alt} width={kit.image.width} height={kit.image.height} unoptimized/><span>{kit.demo===false?'Product image':'Illustrative image'}</span></div><div className={styles.content}><p className={styles.label}>{kit.demo===false?'Published kit':'Concept kit · Demo pricing'}</p><h2>{kit.title}</h2><p className={styles.summary}>{kit.summary}</p><p className={styles.price}>{kit.demo===false?(kit.priceMinor===undefined?'Price to be confirmed':bdt(kit.priceMinor/100)):bdt(kitTotal(kit.kit))}<span>{kit.demo===false?'Configured price · Checkout unavailable':'Illustrative component estimate'}</span></p><button type="button" aria-haspopup="dialog" aria-label={`View kit: ${kit.title}`} onClick={event=>{event.currentTarget.focus({preventScroll:true});setSelected(kit);}}>View kit<ArrowUpRight aria-hidden="true"/></button></div></article>)}</div><Link className={styles.inquiry} href="/contact">Discuss hardware requirements<ArrowUpRight aria-hidden="true"/></Link></Container>{selected&&<KitPopup key={selected.id} entry={selected} onClose={()=>setSelected(null)}/>}</main>;
}
