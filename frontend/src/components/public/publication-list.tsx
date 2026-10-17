'use client';
import { useEffect, useRef, useState } from 'react';
import { createPagesLoader, type ListQuery, type Pagination } from '@/lib/public/pages';
import { publishedPreview, type PublicationPreview } from './publication-preview-data';
import { PublicationDialog } from './publication-dialog';
import styles from './publication-listing.module.css';
export function PublicationList({ entries: initialEntries, pagination: initialPagination, query, demo = false }: { entries: readonly PublicationPreview[]; pagination: Pagination; query: ListQuery; demo?: boolean }) {
  const [entries, setEntries] = useState(() => [...new Map((demo ? initialEntries.slice(0, query.limit) : initialEntries).map(entry => [entry.id, entry])).values()]);
  const [pagination, setPagination] = useState(initialPagination);
  const [selected, setSelected] = useState<{ entry: PublicationPreview; mode: 'cite' | 'more' } | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState(false);
  const pending = useRef(false), mounted = useRef(true), loader = useRef<ReturnType<typeof createPagesLoader> | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function showMore() {
    if (pending.current || pagination.page >= pagination.totalPages) return;
    pending.current = true; setLoading(true); setError(false);
    try {
      const page = pagination.page + 1;
      if (demo) { setEntries([...initialEntries.slice(0, page * query.limit)]); setPagination(previous => ({ ...previous, page })); return; }
      loader.current ??= createPagesLoader(new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1', window.location.origin).href);
      const params = new URLSearchParams(query.params); params.set('page', String(page));
      const result = await loader.current.list('publications', { ...query, page, params: params.toString() });
      if (!mounted.current) return;
      if (result.state !== 'available') { setError(true); return; }
      setEntries(previous => { const seen = new Set(previous.map(entry => entry.id)); return [...previous, ...result.data.map(publishedPreview).filter(entry => { if (seen.has(entry.id)) return false; seen.add(entry.id); return true; })]; });
      setPagination(result.pagination);
    } catch { if (mounted.current) setError(true); }
    finally { pending.current = false; if (mounted.current) setLoading(false); }
  }
  return <div className={styles.results}>
    <ul className={styles.list} aria-label={demo ? 'Illustrative publication previews' : 'Publications'}>{entries.map(entry => <li key={entry.id} data-demo-id={entry.demo ? entry.id : undefined} className={styles.row}>
      <div className={styles.summary}><div><h2>{entry.title}</h2><p className={styles.status}>{[entry.venue, entry.year ? `${entry.year}${(entry.demo||entry.illustrative) ? ' (illustrative)' : ''}` : undefined, entry.impactFactor !== undefined ? `${entry.demo ? 'Demo impact factor' : 'Impact factor'}: ${entry.impactFactor}${entry.metricYear ? ` (metric year: ${entry.metricYear}${entry.demo ? ', illustrative' : ''})` : ''}` : undefined].filter(Boolean).join(' · ')}</p>{entry.illustrativeNotice&&<p className={styles.status}>{entry.illustrativeNotice}</p>}</div>
      <div className={styles.rowActions}>{(['cite','more'] as const).map(mode => <button key={mode} className={mode === 'cite' ? styles.citeButton : undefined} type="button" aria-haspopup="dialog" aria-label={`${mode === 'cite' ? 'Cite' : 'More'}: ${entry.title}`} onClick={event => { event.currentTarget.focus({ preventScroll: true }); setSelected({ entry, mode }); }}>{mode === 'cite' ? 'Cite' : 'More'}</button>)}</div></div>
    </li>)}</ul>
    {pagination.page < pagination.totalPages && <div className={styles.loadMore}><button disabled={loading} onClick={() => void showMore()}>{loading ? 'Loading publications…' : 'Show more publications'}</button><p role="status" aria-live="polite">{loading ? 'Loading the next publication batch…' : error ? 'More publications are temporarily unavailable. Loaded rows are preserved. Try again.' : ''}</p></div>}
    {selected && <PublicationDialog key={`${selected.entry.id}-${selected.mode}`} entry={selected.entry} mode={selected.mode} onClose={() => setSelected(null)}/>}
  </div>;
}
