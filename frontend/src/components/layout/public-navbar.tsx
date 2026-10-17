'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { navPathMatches, publicNavGroups, publicNavStore, type PublicNavGroup } from '@/content/public-navigation';
import styles from './public-navbar.module.css';
import { NavbarAccount } from '@/components/account/navbar-account';
import { NavbarLogo } from './navbar-logo';

export function PublicNavbar() {
  const pathname = usePathname(), header = useRef<HTMLElement>(null), dialog = useRef<HTMLDialogElement>(null), mobileTrigger = useRef<HTMLButtonElement>(null), wordmark = useRef<HTMLAnchorElement>(null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  const [desktopGroup, setDesktopGroup] = useState<string | null>(null), [mobileGroup, setMobileGroup] = useState<string | null>(null), [mobileOpen, setMobileOpen] = useState(false), [scrolled, setScrolled] = useState(false);
  const previousPath = useRef(pathname);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null), closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null; closeTimer.current = null;
  }, []);
  useEffect(() => cancelTimers, [cancelTimers]);
  function hoverEnter(event: PointerEvent<HTMLDivElement>, id: string) {
    if (event.pointerType !== 'mouse' || !window.matchMedia('(min-width: 1440px) and (hover: hover) and (pointer: fine)').matches) return;
    cancelTimers();
    openTimer.current = setTimeout(() => { openTimer.current = null; setDesktopGroup(id); }, 120);
  }
  function hoverLeave(event: PointerEvent<HTMLDivElement>, id: string) {
    if (event.pointerType !== 'mouse') return;
    cancelTimers();
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      const panel = document.getElementById(`public-desktop-${id}`);
      if (!panel?.contains(document.activeElement)) setDesktopGroup(current => current === id ? null : current);
    }, 200);
  }
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 12);
    scroll(); window.addEventListener('scroll', scroll, { passive: true });
    return () => { window.removeEventListener('scroll', scroll); };
  }, []);
  useEffect(() => {
    if (previousPath.current !== pathname) { previousPath.current = pathname; cancelTimers(); setDesktopGroup(null); dialog.current?.close(); }
  }, [pathname, cancelTimers]);
  useEffect(() => {
    const outside = (event: globalThis.PointerEvent) => { if (!header.current?.contains(event.target as Node)) { cancelTimers(); setDesktopGroup(null); } };
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') { cancelTimers(); if (desktopGroup) { event.preventDefault(); triggers.current[desktopGroup]?.focus(); setDesktopGroup(null); } } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [desktopGroup, cancelTimers]);
  useEffect(() => {
    if (!mobileOpen) return;
    const overflow = document.body.style.overflow, padding = document.body.style.paddingRight, gutter = window.innerWidth - document.documentElement.clientWidth;
    if (gutter > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + gutter}px`;
    document.body.style.overflow = 'hidden';
    const desktop = window.matchMedia('(min-width: 1440px)'), resize = () => { if (desktop.matches) dialog.current?.close(); };
    desktop.addEventListener('change', resize);
    return () => { document.body.style.overflow = overflow; document.body.style.paddingRight = padding; desktop.removeEventListener('change', resize); };
  }, [mobileOpen]);
  const storeActive = pathname === '/store' || pathname.startsWith('/store/');

  const groupActive = (group: PublicNavGroup) => group.activeRoots.some(root => navPathMatches(pathname, root));
  function closeAll() { cancelTimers(); setDesktopGroup(null); dialog.current?.close(); }
  function homeClick() { closeAll(); }
  function restoreFocus() { setMobileOpen(false); (window.matchMedia('(min-width: 1440px)').matches ? wordmark.current : mobileTrigger.current)?.focus(); }
  function openMobile() { cancelTimers(); setDesktopGroup(null); setMobileGroup(publicNavGroups.find(groupActive)?.id ?? null); dialog.current?.showModal(); setMobileOpen(true); }
  function disclosureKey(event: KeyboardEvent<HTMLButtonElement>, group: PublicNavGroup) {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault(); cancelTimers(); setDesktopGroup(group.id);
    requestAnimationFrame(() => { const links = document.getElementById(`public-desktop-${group.id}`)?.querySelectorAll<HTMLAnchorElement>('a[href]'); (event.key === 'ArrowUp' ? links?.[links.length - 1] : links?.[0])?.focus(); });
  }
  function panelKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const links = [...event.currentTarget.querySelectorAll<HTMLAnchorElement>('a[href]')], index = links.indexOf(document.activeElement as HTMLAnchorElement); if (index < 0) return;
    event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length; links[next]?.focus();
  }
  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')].filter(control => !control.closest('[hidden]'));
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  function groupLinks(group: PublicNavGroup) { return <>{!group.children.some(link => link.href === group.href) && <Link href={group.href} className={styles.overview} onClick={closeAll}>{group.id === 'company' ? 'About Techy Fellow' : `Explore ${group.label}`}<ArrowRight aria-hidden="true"/></Link>}<ul className={styles.childList}>{group.children.map(link => <li key={link.href}><Link href={link.href} onClick={closeAll} aria-current={pathname === link.href ? 'page' : undefined}>{link.label}<ArrowRight aria-hidden="true"/></Link></li>)}</ul></>; }
  function desktopDisclosure(group: PublicNavGroup) { if (group.id === 'academy') return <Link key={group.id} className={styles.navItem} href="/academy" onClick={closeAll}>Academy</Link>; return <div key={group.id} className={styles.disclosure} onPointerEnter={event => hoverEnter(event, group.id)} onPointerLeave={event => hoverLeave(event, group.id)}>
    <button type="button" ref={element => { triggers.current[group.id] = element; }} className={styles.navItem} data-active={groupActive(group) || undefined} aria-expanded={desktopGroup === group.id} aria-controls={`public-desktop-${group.id}`} onClick={() => { cancelTimers(); setDesktopGroup(current => current === group.id ? null : group.id); }} onKeyDown={event => disclosureKey(event, group)}>{group.label}<ChevronDown aria-hidden="true"/></button>
    <div id={`public-desktop-${group.id}`} className={styles.dropdown} hidden={desktopGroup !== group.id} onKeyDown={panelKeys}>{groupLinks(group)}</div>
  </div>; }
  return <header ref={header} data-public-navbar className={`${styles.header} ${scrolled ? styles.scrolled : ''}`} data-theme="dark">
    <div className={styles.circuitBackground} aria-hidden="true">
      {['left', 'right'].map(edge => <svg key={edge} className={`${styles.edgeCircuit} ${edge === 'left' ? styles.circuitLeft : styles.circuitRight}`} viewBox="0 0 220 76" fill="none" aria-hidden="true" focusable="false">
        <g className={styles.circuitTraces}>
          <path d="M0 12H40V24H72V8H152 M0 60H32V48H64V68H180"/>
          <path className={styles.circuitExtra} d="M0 36H16V32H48V40H92"/>
          <circle cx="72" cy="24" r="2"/><circle cx="64" cy="48" r="2"/>
        </g>
        <path className={styles.circuitCorners} d="M8 22V8H26 M8 54V68H26"/>
      </svg>)}
    </div>
    <Container className={styles.shell}>
      <Link ref={wordmark} href="/" aria-label="Techy Fellow — Home" className={styles.wordmark} onClick={homeClick}><NavbarLogo/></Link>
      <nav className={styles.desktop} aria-label="Main navigation" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) { cancelTimers(); setDesktopGroup(null); } }}>
        <Link className={styles.navItem} href="/" aria-current={pathname === '/' && !storeActive ? 'page' : undefined} onClick={homeClick}>Home</Link>
        {publicNavGroups.filter(group => group.id !== 'company').map(desktopDisclosure)}
        <Link className={styles.navItem} href={publicNavStore.href} aria-current={storeActive ? 'page' : undefined} onClick={closeAll}>Store</Link>
        {desktopDisclosure(publicNavGroups.find(group => group.id === 'company')!)}
        <Link className={styles.navItem} href="/blog" aria-current={pathname.startsWith('/blog')?'page':undefined} onClick={closeAll}>Community</Link>
        <NavbarAccount onNavigate={closeAll}/>
      </nav>
      <button ref={mobileTrigger} className={styles.mobileTrigger} type="button" aria-label="Open navigation menu" aria-expanded={mobileOpen} aria-controls="public-mobile-navigation" aria-haspopup="dialog" onClick={openMobile}><Menu aria-hidden="true"/></button>
      <dialog ref={dialog} id="public-mobile-navigation" className={styles.mobilePanel} aria-labelledby="public-mobile-title" onClose={restoreFocus} onCancel={() => { setDesktopGroup(null); }} onKeyDown={trapFocus} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
        <div className={styles.mobileHeading}><h2 id="public-mobile-title">Navigation</h2><button type="button" autoFocus className={styles.closeButton} aria-label="Close navigation menu" onClick={closeAll}><X aria-hidden="true"/></button></div>
        <nav aria-label="Mobile navigation"><Link className={styles.mobileItem} href="/" aria-current={pathname === '/' && !storeActive ? 'page' : undefined} onClick={homeClick}>Home</Link>
          {publicNavGroups.filter(group => group.id !== 'company').map(group => group.id === 'academy' ? <Link key={group.id} className={styles.mobileItem} href="/academy" onClick={closeAll}>Academy</Link> : <div key={group.id} className={styles.mobileGroup}><button className={styles.mobileItem} type="button" data-active={groupActive(group) || undefined} aria-expanded={mobileGroup === group.id} aria-controls={`public-mobile-${group.id}`} onClick={() => setMobileGroup(current => current === group.id ? null : group.id)}>{group.label}<ChevronDown aria-hidden="true"/></button><div className={styles.mobileChildren} id={`public-mobile-${group.id}`} hidden={mobileGroup !== group.id}>{groupLinks(group)}</div></div>)}
          <Link className={styles.mobileItem} href={publicNavStore.href} aria-current={storeActive ? 'page' : undefined} onClick={closeAll}>Store</Link>
          {publicNavGroups.filter(group => group.id === 'company').map(group => <div key={group.id} className={styles.mobileGroup}><button className={styles.mobileItem} type="button" data-active={groupActive(group) || undefined} aria-expanded={mobileGroup === group.id} aria-controls={`public-mobile-${group.id}`} onClick={() => setMobileGroup(current => current === group.id ? null : group.id)}>{group.label}<ChevronDown aria-hidden="true"/></button><div className={styles.mobileChildren} id={`public-mobile-${group.id}`} hidden={mobileGroup !== group.id}>{groupLinks(group)}</div></div>)}
          <Link className={styles.mobileItem} href="/blog" onClick={closeAll}>Community</Link>
          <NavbarAccount mobile onNavigate={closeAll}/>
        </nav>
      </dialog>
    </Container>
  </header>;
}
