'use client';
import {isGeneratedScholarshipCode} from '@/lib/admin/scholarships';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ResourceGate, useAdmin } from './session';
import { Button } from '@/components/ui/button';
import styles from './academy-access.module.css';

type Code = { _id: string; label: string; kind: string; amount?: number; recipientEmail?: string; active: boolean; redeemed: number; totalLimit: number; startsAt: string; expiresAt?: string };
type Options = { label: string; courses: string[]; anyCourse: boolean; kind: 'full' | 'percentage'; amount: number; totalLimit: number; perAccountLimit: number; recipientEmail?: string; expiresAt?: string };
type Generated = { id: string; code: string; percentage: number };
const percentageOf = (code: Code) => code.kind === 'full' ? '100%' : code.kind === 'percentage' ? `${code.amount}%` : 'Fixed discount';
function statusOf(code: Code, now: number) {
  if (!code.active) return 'Revoked';
  if (code.expiresAt && Date.parse(code.expiresAt) <= now) return 'Expired';
  if (code.redeemed >= code.totalLimit) return 'Used';
  if (Date.parse(code.startsAt) > now) return 'Scheduled';
  return 'Active';
}
export function AcademyAccessAdmin() {
  return <ResourceGate resource="courses" edit><ScholarshipAccess /></ResourceGate>;
}
function ScholarshipAccess() {
  const { call } = useAdmin();
  const codeId = useId();
  const [percentage, setPercentage] = useState('100');
  const [recipient, setRecipient] = useState('');
  const [expiry, setExpiry] = useState('');
  const [limit, setLimit] = useState('1');
  const [accountLimit, setAccountLimit] = useState('1');
  const [codes, setCodes] = useState<Code[] | null>(null);
  const [listError, setListError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saved, setSaved] = useState<Generated | null>(null);
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [checkedAt, setCheckedAt] = useState(0);
  const pending = useRef(false);
  const request = useRef<{ key: string; options: Options; percentage: number } | null>(null);
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    let active = true;
    call<{ data: Code[] }>('/admin/academy/scholarships').then(result => {
      if (!Array.isArray(result.data)) throw new Error('The saved code list could not be verified.');
      if (active) { setCodes(result.data); setListError(''); setCheckedAt(Date.now()); }
    }).catch(cause => { if (active) { setCodes(null); setListError(cause instanceof Error ? cause.message : 'Saved codes could not be loaded.'); } });
    return () => { active = false; };
  }, [call, version]);
  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    setError(''); setNotice('');
    try {
      if (!request.current) {
        const value = Number(percentage), total = Number(limit), perAccount = Number(accountLimit);
        if (!/^\d+$/.test(percentage) || !Number.isInteger(value) || value < 1 || value > 100) throw new Error('Enter a whole scholarship percentage from 1 to 100.');
        if (!/^\d+$/.test(limit) || !/^\d+$/.test(accountLimit) || !Number.isSafeInteger(total) || !Number.isSafeInteger(perAccount) || perAccount < 1 || total < perAccount) throw new Error('Usage limits must be positive whole numbers. The per-account limit cannot exceed the total.');
        const recipientValue = recipient.trim();
        const namedEmail = recipientValue.match(/^([^<>]+)\s*<([^<>]+)>$/);
        const email = (namedEmail ? namedEmail[2] : recipientValue).trim().toLowerCase();
        const name = namedEmail?.[1].trim();
        if (recipientValue && (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))) throw new Error('Use an email or Name <email> to restrict redemption to a verified account.');
        if (name && name.length > 149) throw new Error('Use a recipient name of at most 149 characters.');
        const date = expiry ? new Date(expiry) : undefined;
        if (date && (!Number.isFinite(+date) || +date <= Date.now())) throw new Error('Choose an expiry in the future, or leave it blank.');
        const options: Options = { label: name ? `Recipient: ${name}` : `${value}% Academy scholarship`, courses: [], anyCourse: true, kind: value === 100 ? 'full' : 'percentage', amount: value === 100 ? 0 : value, totalLimit: total, perAccountLimit: perAccount, ...(email ? { recipientEmail: email } : {}), ...(date ? { expiresAt: date.toISOString() } : {}) };
        request.current = { key: crypto.randomUUID(), options, percentage: value };
      }
      pending.current = true; setBusy(true); setSaved(null);
      const submitted = request.current;
      const result = await call<{ data: { codes: { id: string; code: string }[]; plaintextUnavailable?: boolean; ids?: string[] } }>('/admin/academy/scholarships/generate', 'POST', { ...submitted.options, idempotencyKey: submitted.key });
      const generated = result.data.codes?.[0];
      if (generated && /^[a-f0-9]{24}$/.test(generated.id) && isGeneratedScholarshipCode(generated.code)) {
        setSaved({ ...generated, percentage: submitted.percentage }); setNotice('Scholarship saved. Copy the code now.');
      } else if (result.data.plaintextUnavailable && result.data.ids?.length) {
        setNotice(`Saved code ${result.data.ids[0]}. The copy window has ended. Revoke this code before generating a replacement.`);
      } else throw new Error('The generated code response could not be verified. Retry the same request.');
      request.current = null; setRetrying(false); setVersion(value => value + 1);
    } catch (cause) {
      setRetrying(request.current !== null);
      setError(cause instanceof Error ? cause.message : 'Generation could not be confirmed. Retry the same request.');
    } finally { pending.current = false; setBusy(false); }
  }
  async function copy() {
    if (!saved) return;
    try { await navigator.clipboard.writeText(saved.code); setNotice('Code copied.'); }
    catch { setNotice('Clipboard unavailable. Select and copy the code below.'); }
  }
  async function revoke(id: string) {
    if (revoking) return;
    setRevoking(id); setError(''); setNotice('');
    try { await call(`/admin/academy/scholarships/${id}/state`, 'POST', { active: false }); if (saved?.id === id) setSaved(null); setNotice('Scholarship revoked.'); setVersion(value => value + 1); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Revocation could not be confirmed.'); }
    finally { setRevoking(null); }
  }
  return <div className={styles.page}>
    <div className="admin-page-heading"><div><h1>Scholarship codes</h1><p>Let the recipient choose one eligible Academy course.</p></div></div>
    <form className={styles.generator} onSubmit={event => void generate(event)} aria-busy={busy}>
      <fieldset disabled={busy || retrying}>
        <div className={styles.grid}>
          <label>Scholarship percentage (%)<input type="number" min={1} max={100} step={1} required value={percentage} onChange={event => setPercentage(event.target.value)} /></label>
          <label>Recipient (optional name/email)<input value={recipient} maxLength={410} placeholder="Email or Name <email>" autoComplete="off" onChange={event => setRecipient(event.target.value)} /></label>
        </div>
        <p>Leave recipient blank for anyone with the code. A recipient email requires that account’s verified email.</p>
        <details><summary>Advanced settings (optional)</summary><div className={styles.grid}>
          <label>Expiry (optional, local time)<input type="datetime-local" value={expiry} onChange={event => setExpiry(event.target.value)} /></label>
          <label>Total successful redemptions<input type="number" min={1} step={1} required value={limit} onChange={event => setLimit(event.target.value)} /></label>
          <label>Successful redemptions per account<input type="number" min={1} step={1} required value={accountLimit} onChange={event => setAccountLimit(event.target.value)} /></label>
        </div></details>
      </fieldset>
      <Button type="submit" loading={busy} loadingLabel="Generating…">Generate scholarship code</Button>
      {retrying && <p>Generation was not confirmed. This button retries the same request safely; options stay locked until it is resolved.</p>}
    </form>
    {error && <p className="admin-alert" role="alert">{error}</p>}
    {notice && <p className="admin-success" role="status">{notice}</p>}
    {saved && <section className={styles.generated} aria-label="Saved scholarship code"><strong>{saved.percentage}% scholarship</strong><label htmlFor={codeId}>New code<input id={codeId} readOnly value={saved.code} autoComplete="off" spellCheck={false} /></label><Button variant="secondary" onClick={() => void copy()}>Copy</Button></section>}
    <p>100% scholarships confirm a zero-total order and course enrollment. Partial scholarships require verified payment of the remaining balance. Applying a code alone never grants access.</p>
    <section><h2>Saved codes</h2><p>Latest 100 codes. Plaintext codes are not shown in this list.</p>
      {listError ? <div role="alert"><p>{listError}</p><Button variant="secondary" onClick={() => setVersion(value => value + 1)}>Retry list</Button></div> : codes === null ? <p role="status">Loading saved codes…</p> : !codes.length ? <p>No scholarship codes yet.</p> : <div className={styles.tableScroll}><table><thead><tr><th scope="col">Code identifier</th><th scope="col">Scholarship %</th><th scope="col">Recipient/Anyone</th><th scope="col">Status</th><th scope="col">Revoke</th></tr></thead><tbody>{codes.map(code => <tr key={code._id}><td>{code._id}</td><td>{percentageOf(code)}</td><td>{code.recipientEmail ? <>{code.label.startsWith('Recipient: ') && <span>{code.label.slice(11)}<br /></span>}{code.recipientEmail}</> : 'Anyone'}</td><td>{statusOf(code, checkedAt)}</td><td><Button variant="secondary" disabled={!!revoking || !code.active} aria-label={`Revoke code ${code._id}`} onClick={() => void revoke(code._id)}>{revoking === code._id ? 'Revoking…' : 'Revoke'}</Button></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
