'use client';
import {useHomeSections,useHomeSection} from './home-editorial';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ArrowRight, BriefcaseBusiness, GraduationCap, FlaskConical } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { homeOpening } from '@/content/home-opening';
import styles from './home-opening.module.css';

export function AudiencePathways() {
  const override=useHomeSection('audience'),sections=useHomeSections();
  const audience={...homeOpening.audience,label:override?.label??homeOpening.audience.label,heading:override?.title??homeOpening.audience.heading,pathways:homeOpening.audience.pathways.map((pathway,index)=>{const entry=sections.find(section=>section.key===`audience-${index+1}`);return {...pathway,iconIndex:index,title:entry?.title??pathway.title,description:entry?.description??pathway.description,label:entry?.cta??pathway.label,href:entry?.href??pathway.href,visible:entry?.visible!==false};}).filter(pathway=>pathway.visible)};
  const cards = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!cards.current || !('IntersectionObserver' in window)) return;
    const animations: Animation[] = [];
    let spineRevealed = false;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (motion.matches || !('animate' in entry.target)) return;
        const index = Number((entry.target as HTMLElement).dataset.index);
        const lines = [...entry.target.querySelectorAll('[data-line-reveal]')];
        if (!spineRevealed) {
          spineRevealed = true;
          lines.push(...(cards.current?.querySelectorAll('[data-spine]') ?? []));
        }
        lines.forEach(line => animations.push(line.animate([{ strokeDasharray: '1', strokeDashoffset: '1' }, { strokeDasharray: '1', strokeDashoffset: '0' }], { duration: 420, delay: index * 90, easing: 'ease-out', fill: 'backwards' })));
        animations.push(entry.target.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 500, delay: index * 90, easing: 'ease-out', fill: 'backwards' }));
      });
    }, { threshold: 0.18 });
    [...cards.current.querySelectorAll('article')].forEach(card => observer.observe(card));
    const cancel = () => { if (motion.matches) animations.forEach(animation => animation.cancel()); };
    motion.addEventListener('change', cancel);
    return () => { observer.disconnect(); animations.forEach(animation => animation.cancel()); motion.removeEventListener('change', cancel); };
  }, []);
  const icons = [BriefcaseBusiness, GraduationCap, FlaskConical];
  const heading = audience.heading.split(/(?<=\.) /);
  return <section className={styles.audience} aria-labelledby="home-audience-title">
    <div className={styles.silhouette} aria-hidden="true">
      {['top', 'bottom'].map(edge => <svg key={edge} className={`${styles.edgeCircuit} ${edge === 'top' ? styles.edgeTop : styles.edgeBottom}`} viewBox="0 0 280 160" fill="none" focusable="false" aria-hidden="true">
        <g className={styles.edgeTraces}>
          <path d="M0 24H144V48H212V92H280 M0 48H120V72H188V116H280 M32 0V16H168V32H236V64H280"/>
          <path className={styles.extraTrace} d="M0 96H64V120H148V144H280"/>
          <circle cx="144" cy="24" r="2.5"/><circle cx="212" cy="92" r="2.5"/><circle cx="188" cy="116" r="2.5"/>
        </g>
        <path className={styles.edgeMarkers} d="M196 8H248L272 32V56 M256 40V24H240"/>
      </svg>)}
    </div>
    <Container>
      <p className={styles.technical}>{audience.label}</p>
      <h2 id="home-audience-title"><span>{heading[0]}</span>{' '}<span className={styles.emphasis}>{heading[1]}</span></h2>
      <div ref={cards} className={styles.pathways}>
        <svg className={styles.connection} viewBox="0 0 1200 36" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path data-spine pathLength="1" d="M0 5H1200"/></svg>
        <svg className={styles.verticalConnection} viewBox="0 0 24 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path data-spine pathLength="1" d="M8 0V100"/></svg>
        {audience.pathways.map((pathway, index) => {
        const Icon = icons[pathway.iconIndex];
        return <article className={styles.reveal} data-index={index} key={pathway.title}>
          <svg className={styles.cardBranch} viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path data-line-reveal pathLength="1" d="M50 5V36"/><circle cx="50" cy="5" r="1"/></svg>
          <svg className={styles.mobileBranch} viewBox="0 0 24 44" aria-hidden="true" focusable="false"><path data-line-reveal pathLength="1" d="M8 22H24"/><circle cx="8" cy="22" r="2"/></svg>
          <Link className={styles.panel} href={pathway.href} prefetch={false} aria-labelledby={`audience-title-${index} audience-action-${index}`}>
            <svg className={styles.cardCorners} viewBox="0 0 360 340" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M12 42V24L24 12H42 M318 328H336L348 316V298"/></svg>
            <div className={styles.cardHeader}><span className={styles.icon}><Icon aria-hidden="true"/></span><span className={styles.marker} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span></div>
            <h3 id={`audience-title-${index}`}>{pathway.title}</h3>
            <p>{pathway.description}</p>
            <span className={styles.action} id={`audience-action-${index}`}>{pathway.label}<ArrowRight aria-hidden="true"/></span>
          </Link>
        </article>;
      })}</div>
    </Container>
  </section>;
}
