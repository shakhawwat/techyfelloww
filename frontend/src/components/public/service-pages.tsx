import Image from 'next/image';
import {publishedServiceGroup} from '@/lib/public/server-services';
import type {GroupDefinition} from '@/content/services';
import {contentDetail as mentorDetail} from '@/lib/public/server-pages';
import { ServiceScopeList } from './service-scope-list';
import { serviceListMedia } from './service-list-media';
import styles from './solutions-overview.module.css';
import institutionalStyles from './institutional-pages.module.css';
import { InstitutionalProgramList } from './institutional-program-list';
import { illustrativeProgramNotice, type InstitutionalAudience } from '@/content/institutional-programs';
import detailStyles from './solutions-detail.module.css';
import { SolutionProjectList } from './solution-project-list';
import { solutionProjects, type SolutionSlug } from '@/content/solution-projects';
import { inquiryHref } from '@/lib/inquiry/schema';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Check, Users, CircleHelp, Bot, Microchip, BrainCircuit, Workflow, Wrench, GraduationCap, FlaskConical, Rocket, School, University, Factory } from 'lucide-react';
import { Section } from '@/components/ui/section';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { serviceCopy as copy, missingServiceCopy, serviceGroups, serviceDefinition, servicePath, type ServiceGroup, type ServiceDefinition, type ServiceIcon, type ContentBlock, type RelatedReference } from '@/content/services';
import { contentDetail, publicOrigin } from '@/lib/public/server-pages';
import { canonicalUrl } from '@/lib/public/pages';

const icons = { robot: Bot, chip: Microchip, vision: BrainCircuit, automation: Workflow, prototype: Wrench, capstone: GraduationCap, research: FlaskConical, startup: Rocket, school: School, university: University, industry: Factory } satisfies Record<ServiceIcon, typeof Bot>;
function resolveService(group: ServiceGroup, slug: string): ServiceDefinition { const service = serviceDefinition(group, slug); if (!service) notFound(); return service; }
function Breadcrumbs({ group, service }: { group: ServiceGroup; service?: ServiceDefinition }) {
  return <nav className="content-breadcrumbs" aria-label="Breadcrumb"><ol><li><Link href="/">Home</Link></li><li>{service ? <Link prefetch={false} href={servicePath(group)}>{serviceGroups[group].title}</Link> : <span aria-current="page">{serviceGroups[group].title}</span>}</li>{service && <li><span aria-current="page">{service.title}</span></li>}</ol></nav>;
}
function BreadcrumbData({ group, service }: { group: ServiceGroup; service?: ServiceDefinition }) {
  const origin = publicOrigin(); if (!origin) return null;
  const entries = [{ name: 'Home', item: `${origin}/` }, { name: serviceGroups[group].title, item: `${origin}/${group}` }, ...(service ? [{ name: service.title, item: `${origin}${servicePath(group, service)}` }] : [])];
  const data = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: entries.map((entry, index) => ({ '@type': 'ListItem', position: index + 1, ...entry })) };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026') }}/>;
}
function Header({ group, service,definition=serviceGroups[group] }: { group: ServiceGroup; service?: ServiceDefinition;definition?:GroupDefinition }) {
  return <Section tone="dark" className="content-hero service-hero"><Breadcrumbs group={group} service={service}/><span className="eyebrow">{definition.eyebrow}</span><h1>{service?.title ?? definition.title}</h1><p className="content-lead">{service?.summary ?? definition.summary}</p><div className="service-hero-actions"><Link className="button button-primary" href={service?.inquiryHref??inquiryHref(group === 'institutional' ? 'institutional' : service?.slug === 'capstone' ? 'mentorship' : service?.slug === 'research' ? 'research' : 'engineering')}>{copy.inquiryLabel}<ArrowUpRight aria-hidden="true"/></Link><Badge>{copy.proposed}</Badge></div></Section>;
}
function Notice() { return <p className="service-scope-note">{copy.notice}</p>; }
function Block({ title, text, items }: ContentBlock) { return <section className="content-text-block"><h2>{title}</h2>{text && <p>{text}</p>}{items && <ul>{items.map(item => <li key={item}>{item}</li>)}</ul>}</section>; }
function Process({steps=copy.processSteps}:{steps?:readonly {title:string;text:string}[]}) { return <section className="service-process"><h2>{copy.process}</h2><ol>{steps.map((step, index) => <li key={step.title}><span className="service-step-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol></section>; }
function Faqs({ solutions = false,faqs=copy.faqs }: { solutions?: boolean;faqs?:readonly {question:string;answer:string}[] } = {}) { return <Section tone={solutions ? "dark" : "light"} className={solutions ? styles.faq : "public-light-surface"}><div className="service-faq"><h2>{copy.faqTitle}</h2>{faqs.map(faq => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></Section>; }
function Inquiry({ group, service }: { group: ServiceGroup; service?: ServiceDefinition }) { return <Section tone="navy" className="service-inquiry"><div><span className="eyebrow">{copy.proposed}</span><h2>{copy.inquiryTitle}</h2><p>{copy.inquiryText}</p><Link className="button button-primary" href={service?.inquiryHref??inquiryHref(group === 'institutional' ? 'institutional' : service?.slug === 'capstone' ? 'mentorship' : service?.slug === 'research' ? 'research' : 'engineering')}>{copy.inquiryLabel}<ArrowUpRight aria-hidden="true"/></Link><p className="service-inquiry-availability">{copy.inquiryAvailability}</p></div></Section>; }
async function RelatedWork({ references }: { references: readonly RelatedReference[] }) {
  // Only explicitly curated references establish relevance. Never infer it from keywords or fabricate a case study.
  if (!references.length) return null;
  const unique = references.filter((ref, index) => references.findIndex(other => other.kind === ref.kind && other.slug === ref.slug) === index).slice(0, 6);
  const records = (await Promise.all(unique.map(async ref => ({ ref, result: await contentDetail(ref.kind, ref.slug) })))).filter(entry => entry.result.state === 'available');
  if (!records.length) return null;
  return <Section><div className="public-heading"><span className="eyebrow">Published records</span><h2>{copy.relatedTitle}</h2><p>{copy.relatedNote}</p></div><div className="content-grid">{records.map(({ ref, result }) => result.state === 'available' && <Card className="content-record" key={`${ref.kind}/${ref.slug}`}><span className="content-record-kicker">{ref.kind === 'projects' ? 'Published project' : 'Published research'}</span><h3><Link prefetch={false} href={`/${ref.kind}/${result.data.slug}`}>{result.data.title}</Link></h3><p>{result.data.summary}</p></Card>)}</div></Section>;
}
function SolutionsInquiry({href}:{href?:string}={}) {
  return (<Section tone="dark" className={styles.inquiry}>
      <div className={styles.inquiryLayout}><div><p className={styles.eyebrow}>{copy.proposed}</p><h2>{copy.inquiryTitle}</h2><p>{copy.inquiryText}</p></div>
        <Link className={styles.button} href={href??inquiryHref('engineering')}><span>{copy.inquiryLabel}</span><ArrowUpRight aria-hidden="true"/></Link>
      </div>
      <p className={styles.availability}>{copy.inquiryAvailability}</p>
    </Section>);
}
function SolutionsOverview({definition}:{definition:GroupDefinition}) {
  return <main id="public-main" tabIndex={-1} className={styles.page}>
    <BreadcrumbData group="solutions"/>
    <Section tone="dark" className={styles.hero}>
      <Breadcrumbs group="solutions"/>
      <p className={styles.eyebrow}>ENGINEERING SOLUTIONS</p>
      <h1>{definition.heading??<>Engineering ideas.{' '}<span>Into working systems.</span></>}</h1>
      <p className={styles.intro}>{definition.summary}</p>
      <p className={styles.notice}>{copy.notice}</p>
      <Link className={styles.textLink} href={definition.inquiryHref??inquiryHref('engineering')}>{copy.inquiryLabel}<ArrowUpRight aria-hidden="true"/></Link>
    </Section>
    <Section tone="dark" className={styles.overview} aria-label="Engineering solutions and institutional pathways">
      <ServiceScopeList group="solutions" services={definition.items}/>
      <SolutionsInstitutional/>
    </Section>
    <Faqs solutions faqs={definition.faqs??copy.faqs}/>
    <SolutionsInquiry href={definition.inquiryHref}/>
  </main>;
}
function InstitutionalPage({service,definition}:{service?:ServiceDefinition;definition:GroupDefinition}) {
  return <main id="public-main" tabIndex={-1} className={`${styles.page} ${detailStyles.page} ${institutionalStyles.page}`}>
    <BreadcrumbData group="institutional" service={service}/>
    <Section tone="dark" className={styles.hero}>
      <Breadcrumbs group="institutional" service={service}/>
      <p className={styles.eyebrow}>{definition.eyebrow}</p>
      <h1>{service?.title ?? definition.title}</h1>
      <p className={styles.intro}>{service?.summary ?? definition.summary}</p>
      <p className={styles.notice}><strong>{copy.proposed}.</strong> {copy.notice}</p>
      <Link className={styles.textLink} href={inquiryHref('institutional')}>{copy.inquiryLabel}<ArrowUpRight aria-hidden="true"/></Link>
    </Section>
    {service ? <>
      <Section tone="dark" className={detailStyles.context}>
        {service.media&&<Image src={service.media.url} alt={service.media.altText} width={1200} height={675} unoptimized/>}
        <h2>{definition.audienceTitle}</h2><ul className={detailStyles.rows}>{service.audience.map(item => <li key={item}>{item}</li>)}</ul>
        <div className={institutionalStyles.scopeColumns}>{service.blocks.map(block => <section key={block.title}><h2>{block.title}</h2>{block.text && <p>{block.text}</p>}{block.items && <ul className={detailStyles.rows}>{block.items.map(item => <li key={item}>{item}</li>)}</ul>}</section>)}</div>
      </Section>
    </> : <Section tone="dark" className={styles.overview} aria-label="Institutional pathways"><div className={styles.services}>{definition.items.map(item => {
      const Icon = icons[item.icon];
      return <article key={item.slug} className={styles.serviceRow}><Icon aria-hidden="true"/><div><h2>{item.title}</h2><p>{item.summary}</p></div><Link prefetch={false} className={styles.textLink} href={servicePath('institutional', item)} aria-label={`Explore pathway: ${item.title}`}>Explore pathway<ArrowUpRight aria-hidden="true"/></Link></article>;
    })}</div></Section>}
    <Section tone="dark" className={detailStyles.projects}>
      <h2>{definition.programs?.length?'Institutional programs':'Illustrative program previews'}</h2><p className={institutionalStyles.demoNotice}>{definition.programs?.length?'Published program scopes. Availability requires confirmation.':illustrativeProgramNotice}</p>
      <p className={detailStyles.explanation}>{definition.programs?.length?'Published scopes are not completed engagements or confirmed bookings.':'Locally defined examples for discussion, separate from published programs. These are proposed examples, not completed engagements or confirmed bookings.'}</p>
      <InstitutionalProgramList published={definition.programs} audience={service?.slug as InstitutionalAudience | undefined}/>
    </Section>
    {service && <>
      <Section tone="dark" className={detailStyles.comparison}><div className={detailStyles.columns}>
        <section><h2>{copy.deliverables}</h2><p className={detailStyles.explanation}>{copy.deliverablesNote}</p><ul className={detailStyles.checklist}>{service.deliverables.map(item => <li key={item}><Check aria-hidden="true"/><span>{item}</span></li>)}</ul></section>
        <section><h2>{copy.responsibilities}</h2><ul className={detailStyles.checklist}>{service.responsibilities.map(item => <li key={item}><Check aria-hidden="true"/><span>{item}</span></li>)}</ul></section>
      </div>{service.integrity && <p className={detailStyles.explanation}>{service.integrity}</p>}</Section>
      <Section tone="dark" className={detailStyles.process}><h2>{copy.process}</h2><ol className={detailStyles.timeline}>{(service?.processSteps??definition.processSteps??copy.processSteps).map((step, index) => <li key={step.title}><span className={detailStyles.stepNumber}>{String(index + 1).padStart(2, '0')}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol></Section>
      <Section tone="dark" className={detailStyles.related}><nav aria-label="Institutional pathways"><div className={detailStyles.navHeading}><h2>{definition.title}</h2><Link prefetch={false} className={styles.textLink} href="/institutional">All institutional pathways<ArrowRight aria-hidden="true"/></Link></div><div className={detailStyles.pills}>{definition.items.map(item => <Link prefetch={false} key={item.slug} href={servicePath('institutional', item)} aria-current={item.slug === service.slug ? 'page' : undefined}>{item.title}</Link>)}</div></nav></Section>
      <RelatedWork references={service.related}/><ApprovedMentors slugs={service.mentorSlugs??[]}/>
    </>}
    <Faqs solutions faqs={service?.faqs??definition.faqs??copy.faqs}/>
    <Section tone="dark" className={styles.inquiry}><div className={styles.inquiryLayout}><div><p className={styles.eyebrow}>{copy.proposed}</p><h2>{copy.inquiryTitle}</h2><p>{copy.inquiryText}</p></div><Link className={styles.button} href={inquiryHref('institutional')}>{copy.inquiryLabel}<ArrowUpRight aria-hidden="true"/></Link></div><p className={styles.availability}>{copy.inquiryAvailability}</p></Section>
  </main>;
}

export async function ServiceGroupPage({ group }: { group: ServiceGroup }) {
  const definition=await publishedServiceGroup(group);
  if (group === 'solutions') return <SolutionsOverview definition={definition}/>;
  if (group === 'institutional') return <InstitutionalPage definition={definition}/>;
  return <main id="public-main" tabIndex={-1} className={styles.page}><Header group={group} definition={definition}/><BreadcrumbData group={group}/><Section tone="dark" className={styles.overview}><Notice/><ServiceScopeList group="consulting" services={definition.items}/></Section><Faqs solutions faqs={definition.faqs??copy.faqs}/><Inquiry group={group}/></main>;
}
function SolutionsInstitutional() {
  return <div className={detailStyles.institutional}><div><h2>{copy.institutionalTitle}</h2><p>{copy.institutionalText}</p></div><Link prefetch={false} className={styles.textLink} href="/institutional">{copy.institutionalLink}<ArrowRight aria-hidden="true"/></Link></div>;
}
function SolutionDetail({ service,definition }: { service: ServiceDefinition & { slug: SolutionSlug };definition:GroupDefinition }) {
  const accent = service.title.split(/ |&/)[0];
  return <main id="public-main" tabIndex={-1} className={`${styles.page} ${detailStyles.page}`}>
    <BreadcrumbData group="solutions" service={service}/>
    <Section tone="dark" className={`${styles.hero} ${detailStyles.hero}`}>
      <Breadcrumbs group="solutions" service={service}/>
      <p className={styles.eyebrow}>{service.title.toUpperCase()}</p>
      <h1><span>{accent}</span>{service.title.slice(accent.length)}</h1>
      <p className={styles.intro}>{service.summary}</p>
      <p className={styles.notice}>{copy.notice}</p>
      <div className={detailStyles.heroActions}><Link className={styles.button} href={service.inquiryHref??inquiryHref('engineering')}>{copy.inquiryLabel}<ArrowUpRight aria-hidden="true"/></Link><span>{copy.proposed}</span></div>
    </Section>
    <Section tone="dark" className={detailStyles.context}>
      <div className={detailStyles.columns}>
        <section><h2><Users aria-hidden="true"/>{definition.audienceTitle}</h2><ul className={detailStyles.rows}>{service.audience.map(item => <li key={item}>{item}</li>)}</ul></section>
        <section><h2><CircleHelp aria-hidden="true"/>{service.blocks[0]?.title??'Scope'}</h2><ul className={detailStyles.rows}>{service.blocks[0]?.items?.map(item => <li key={item}>{item}</li>)}</ul></section>
      </div>
    </Section>
    <Section tone="dark" className={detailStyles.projects}>
      <h2>Proposed project pathways</h2>
      <p className={detailStyles.explanation}>Proposed project types for discussion, not completed projects. Explore a pathway to review its scope.</p>
      <SolutionProjectList projects={solutionProjects(service)} media={service.media?{src:service.media.url,alt:service.media.altText}:serviceListMedia[service.slug]}/>
    </Section>
    <Section tone="dark" className={detailStyles.comparison}>
      <div className={detailStyles.columns}>
        <section><h2>{copy.deliverables}</h2><p className={detailStyles.explanation}>{copy.deliverablesNote}</p><ul className={detailStyles.checklist}>{service.deliverables.map(item => <li key={item}><Check aria-hidden="true"/><span>{item}</span></li>)}</ul></section>
        <section><h2>{copy.responsibilities}</h2><ul className={detailStyles.checklist}>{service.responsibilities.map(item => <li key={item}><Check aria-hidden="true"/><span>{item}</span></li>)}</ul></section>
      </div>
    </Section>
    <Section tone="dark" className={detailStyles.process}>
      <h2>{copy.process}</h2>
      <ol className={detailStyles.timeline}>{(service?.processSteps??definition.processSteps??copy.processSteps).map((step, index) => <li key={step.title}><span className={detailStyles.stepNumber}>{String(index + 1).padStart(2, '0')}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol>
    </Section>
    <Section tone="dark" className={detailStyles.related}>
      <nav aria-label="Solutions pathways"><div className={detailStyles.navHeading}><h2>{definition.title}</h2><Link prefetch={false} href={servicePath('solutions')} className={styles.textLink}>All solutions<ArrowRight aria-hidden="true"/></Link></div>
        <div className={detailStyles.pills}>{definition.items.map(item => <Link prefetch={false} key={item.slug} href={servicePath('solutions', item)} aria-current={item.slug === service.slug ? 'page' : undefined}>{item.title}</Link>)}</div>
      </nav>
      <SolutionsInstitutional/>
    </Section>
    <RelatedWork references={service.related}/><ApprovedMentors slugs={service.mentorSlugs??[]}/>
    <Faqs solutions faqs={service?.faqs??definition.faqs??copy.faqs}/>
    <SolutionsInquiry href={service.inquiryHref??definition.inquiryHref}/>
  </main>;
}
export async function ServicePage({ group, slug }: { group: ServiceGroup; slug: string }) {
  resolveService(group,slug);const definition=await publishedServiceGroup(group),service=definition.items.find(item=>item.slug===slug)!;
  if (group === 'institutional') return <InstitutionalPage service={service} definition={definition}/>;
  if (group === 'solutions') {
    const solution = definition.items.find(item => item.slug === slug) as ServiceDefinition & {slug:SolutionSlug}|undefined;
    if (!solution) notFound();
    return <SolutionDetail service={solution} definition={definition}/>;
  }
  return <main id="public-main" tabIndex={-1} className={styles.page}><Header group={group} service={service} definition={definition}/><BreadcrumbData group={group} service={service}/><Section tone="dark" className="service-detail"><Notice/><div className="service-reading-layout"><article className="content-reading"><Block title={definition.audienceTitle} items={service.audience}/><ServiceScopeList group="consulting" services={[service]}/><Block title={copy.deliverables} text={copy.deliverablesNote} items={service.deliverables}/><Block title={copy.responsibilities} items={service.responsibilities}/>{service.integrity && <section className="service-integrity"><h2>{copy.integrityTitle}</h2><p>{service.integrity}</p></section>}</article><aside aria-label="Scoping process"><Process steps={service.processSteps??definition.processSteps}/><nav className="service-sibling-nav" aria-label={`${definition.title} pathways`}><h2>{definition.title}</h2><Link prefetch={false} href={servicePath(group)} className="public-inline-link">All {group}<ArrowRight aria-hidden="true"/></Link>{definition.items.map(item => <Link prefetch={false} key={item.slug} href={servicePath(group, item)} aria-current={item.slug === service.slug ? 'page' : undefined}>{item.title}</Link>)}</nav></aside></div></Section><RelatedWork references={service.related}/><ApprovedMentors slugs={service.mentorSlugs??[]}/><Faqs solutions faqs={service?.faqs??definition.faqs??copy.faqs}/><Inquiry group={group} service={service}/></main>;
}
export async function serviceMetadata(group: ServiceGroup, slug?: string): Promise<Metadata> {
  if(slug!==undefined)resolveService(group,slug);const definition=await publishedServiceGroup(group),service=slug===undefined?undefined:definition.items.find(item=>item.slug===slug),path=servicePath(group,service),canonical=canonicalUrl(path,publicOrigin());
  const title = `${service?.title ?? definition.title} | Techy Fellow`, description = service?.summary ?? definition.summary;
  return { title, description, ...(canonical ? { alternates: { canonical } } : {}), openGraph: { title, description, type: 'website', siteName: 'Techy Fellow', ...(canonical ? { url: canonical } : {}) } };
}
export function ServiceNotFound({ group }: { group: ServiceGroup }) { return <main id="public-main" tabIndex={-1}><Section><span className="eyebrow">404</span><h1 className="content-missing-title">{missingServiceCopy.title}</h1><p>{missingServiceCopy.text}</p><Link className="button button-primary" href={servicePath(group)}>{missingServiceCopy.link}</Link></Section></main>; }

async function ApprovedMentors({slugs}:{slugs:readonly string[]}){if(!slugs.length)return null;const entries=await Promise.all(slugs.slice(0,20).map(slug=>mentorDetail('team',slug)));return <Section><div className="public-heading"><h2>Approved mentors</h2></div><div className="content-grid">{entries.map(result=>result.state==='available'?<Card key={result.data.slug}><h3><Link href={`/team/${result.data.slug}`}>{result.data.title}</Link></h3><p>{result.data.summary}</p></Card>:null)}</div></Section>;}
