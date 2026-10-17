import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { serviceCopy, serviceGroups, servicePath, type ServiceDefinition } from '@/content/services';
import { inquiryHref } from '@/lib/inquiry/schema';
import { ExpandableMediaList } from './expandable-media-list';
import { serviceListMedia } from './service-list-media';
import styles from './solution-project-list.module.css';

export function ServiceScopeList({ group, services }: { group: 'solutions' | 'consulting'; services: readonly ServiceDefinition[] }) {
  return <ExpandableMediaList label={`${serviceGroups[group].title} services`} items={services.map(service => ({
    id: service.slug, title: service.title, description: service.summary,
    metadata: serviceCopy.proposed, media: service.media?{src:service.media.url,alt:service.media.altText}:serviceListMedia[service.slug],
    details: <div className={styles.scope}>
      <section><h4>{serviceGroups[group].audienceTitle}</h4><ul>{service.audience.map(item => <li key={item}>{item}</li>)}</ul></section>
      {service.blocks.map(block => <section key={block.title}><h4>{block.title}</h4>{block.text && <p>{block.text}</p>}{block.items && <ul>{block.items.map(item => <li key={item}>{item}</li>)}</ul>}</section>)}
      <section><h4>{serviceCopy.deliverables}</h4><p>{serviceCopy.deliverablesNote}</p><ul>{service.deliverables.map(item => <li key={item}>{item}</li>)}</ul></section>
      <section><h4>{serviceCopy.responsibilities}</h4><ul>{service.responsibilities.map(item => <li key={item}>{item}</li>)}</ul></section>
      {service.integrity && <section><h4>{serviceCopy.integrityTitle}</h4><p>{service.integrity}</p></section>}
      <section><h4>Scope and availability</h4><p>{serviceCopy.notice}</p><p>{serviceCopy.inquiryAvailability}</p></section>
      <Link prefetch={false} className={styles.action} href={servicePath(group, service)}>Explore service<ArrowUpRight aria-hidden="true"/></Link>
      <Link className={styles.action} href={service.inquiryHref??inquiryHref(group === 'solutions' ? 'engineering' : service.slug === 'capstone' ? 'mentorship' : service.slug === 'research' ? 'research' : 'engineering')}>{service.slug === 'capstone' ? 'Discuss mentorship' : service.slug === 'research' ? 'Discuss collaboration' : 'Discuss this project'}<ArrowUpRight aria-hidden="true"/></Link>
    </div>,
  }))}/>;
}
