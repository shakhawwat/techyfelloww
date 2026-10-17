'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ConfirmAction } from '@/components/admin/confirm';
import { doiUrl, safeHttps } from '@/lib/public/pages';
import { inquiryHref } from '@/lib/inquiry/schema';
import { citationBibtex, citationText } from './publication-citation';
import { publicationDemoNotice, type PublicationPreview } from './publication-preview-data';
import styles from './publication-listing.module.css';
export function PublicationDialog({ entry, mode, onClose }: { entry: PublicationPreview; mode: 'cite' | 'more'; onClose: () => void }) {
  const [message, setMessage] = useState('');
  const text = citationText(entry), bibtex = citationBibtex(entry);
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); setMessage('Copied to clipboard.'); } catch { setMessage('Copy unavailable. Select and copy the text below.'); } }
  const doi = (entry.demo||entry.illustrative) ? undefined : doiUrl(entry.doi), publisher = (entry.demo||entry.illustrative) ? undefined : safeHttps(entry.publisherUrl);
  function section(title: string, items?: string[]) { return items?.length ? <section><h3>{title}</h3><ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></section> : null; }
  return <ConfirmAction title={mode === 'cite' ? `Citation: ${entry.title}` : entry.title} busy={false} onCancel={onClose} presentation="details" className={styles.dialog} headerClassName={styles.dialogHeader} contentClassName={styles.dialogContent} detailsLabel={mode === 'cite' ? 'Publication citation' : 'Publication details'} closeLabel="Close publication details">
    {(entry.demo||entry.illustrative) && <p className={styles.demoNotice}>{publicationDemoNotice}</p>}
    {mode === 'cite' ? <><h3>{(entry.demo||entry.illustrative) ? 'Illustrative citation' : 'Citation'}</h3><p className={styles.citation}>{text}</p><button className={styles.copyButton} onClick={() => void copy(text)}>Copy citation</button>{bibtex && <section><h3>{(entry.demo||entry.illustrative) ? 'Illustrative BibTeX' : 'BibTeX'}</h3><pre className={styles.citation}>{bibtex}</pre><button className={styles.copyButton} onClick={() => void copy(bibtex)}>Copy BibTeX</button></section>}<p role="status" aria-live="polite">{message}</p></> : <>
      <section><h3>{(entry.demo||entry.illustrative) ? 'Illustrative abstract' : 'Abstract / summary'}</h3><p>{entry.abstract}</p></section>
      {section((entry.demo||entry.illustrative) ? 'Illustrative placeholder authors' : 'Authors', entry.authors)}
      {entry.domain && <section><h3>Research area</h3><p>{entry.domain}</p></section>}
      {section((entry.demo||entry.illustrative) ? 'Proposed demo methods' : 'Methods supplied in the record', entry.methods)}
      {(entry.demo||entry.illustrative) ? <section><h3>Findings and limitations</h3><p>No experiments, findings, publication acceptance or verified metrics are claimed. Methods are proposals only. The illustrative abstract does not establish feasibility or effectiveness.</p></section> : <>{section('Findings supplied in the record', entry.findings)}{section('Limitations supplied in the record', entry.limitations)}</>}
      {(doi || publisher) && <section><h3>Paper links</h3>{doi && <a href={doi} target="_blank" rel="noopener noreferrer">DOI / paper (opens in a new tab)</a>}{publisher && publisher !== doi && <a href={publisher} target="_blank" rel="noopener noreferrer">Publisher (opens in a new tab)</a>}</section>}
      {!entry.demo && <Link prefetch={false} href={`/publications/${entry.id}`}>Open publication record</Link>}
      <section><h3>Collaboration inquiries</h3><Link prefetch={false} href={inquiryHref('research')}>Discuss collaboration</Link><p>Mention “{entry.title}”{(entry.demo||entry.illustrative) ? ' as an illustrative preview' : ''} in your inquiry. An inquiry does not confirm availability.</p></section>
    </>}
  </ConfirmAction>;
}
