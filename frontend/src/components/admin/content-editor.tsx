"use client";
import { useUnsavedChanges } from "./unsaved-changes";
import {ContentPreview} from "./content-preview";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Save, RefreshCw } from "lucide-react";
import { checkedRecord, labels, type ContentRecord, type ContentList, type Resource } from "@/lib/admin/contracts";
import { errorOf, type ApiError } from "@/lib/admin/api";
import { fields, patchPayload, serialize, toValues, type Values } from "@/lib/admin/fields";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TextField } from "@/components/ui/form-field";
import { useAdmin, ResourceGate } from "./session";
import { ProjectImages } from "./project-images";
import { ContentField } from "./fields";
import { ConfirmAction } from "./confirm";
type Action = "publish" | "unpublish" | "archive";
export function ContentEditor({ resource, id,defaults }: { resource: Resource; id?: string;defaults?:Record<string,unknown> }) {
  return <ResourceGate resource={resource} edit={!id}>{id ? <LoadEditor key={`${resource}:${id}`} resource={resource} id={id} /> : <Editor key={resource} resource={resource} defaults={defaults} />}</ResourceGate>;
}
function LoadEditor({ resource, id }: { resource: Resource; id: string }) {
  const { call } = useAdmin(); const [data, setData] = useState<ContentRecord | null>(null); const [error, setError] = useState<ApiError | null>(null); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    call<{ data: ContentRecord }>(`/admin/${resource}/${id}`).then(result => { const record = checkedRecord(result.data); if (active) setData(record); }).catch(failure => { if (active) setError(errorOf(failure)); });
    return () => { active = false; };
  }, [call, resource, id, attempt]);
  if (data) return <Editor resource={resource} initial={data} />;
  return <Card>{error ? <><p className="admin-alert" role="alert">{error.message}</p><Button variant="secondary" onClick={() => { setError(null); setAttempt(attempt + 1); }}>Retry loading</Button></> : <p role="status">Loading saved content…</p>}</Card>;
}
function Editor({ resource, initial,defaults }: { resource: Resource; initial?: ContentRecord;defaults?:Record<string,unknown> }) {
  const router = useRouter(); const { call, can, notify } = useAdmin();
  const [record, setRecord] = useState(initial); const [values, setValues] = useState<Values>(() => toValues(resource, initial??defaults as ContentRecord));
  const [errors, setErrors] = useState<Record<string, string>>({}); const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [busy, setBusy] = useState(false);
  const [storeCategories,setStoreCategories]=useState<string[]>([]);
  useEffect(()=>{if(resource!=='products')return;let active=true;call<{data:{slug:string}[]}>('/admin/store/categories').then(result=>{if(active)setStoreCategories(result.data.map(category=>category.slug));}).catch(()=>{});return()=>{active=false;};},[resource,call]);
  const searchParams = useSearchParams();
  const [preview,setPreview]=useState(searchParams.get("preview") === "1");
  const [conflict, setConflict] = useState(false); const [latest, setLatest] = useState<ContentRecord | null>(null); const [action, setAction] = useState<Action | null>(null); const [schedule, setSchedule] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const editorFields=fields[resource].map(field=>resource==='products'&&field.key==='categorySlug'?{...field,type:'select' as const,choices:[...new Set([...storeCategories,...(values.categorySlug?[String(values.categorySlug)]:[])])]}:field).filter(field=>resource!=='pages'||(values.pageType==='homepage'?!['programAudience','audience','blocks','capabilities','deliverables','responsibilities','faqs','inquiryHref'].includes(field.key):true));
  const sectionHints:Record<string,string>={solutions:'Process section keys: process-1 to process-4. Use title and description to edit the scoping process. Solution pathways are edited separately.',institutional:'Process section keys: process-1 to process-4. Use title and description to edit the scoping process.',consulting:'Process section keys: process-1 to process-4. Use title and description to edit the scoping process.',homepage:'Section keys: hero-1 to hero-3, audience-1 to audience-3, solution-1 to solution-6, consulting-1 to consulting-3, institutional-1 to institutional-13. Main sections: hero, audience, solutions, projects, research, support, consulting, institutional, academy, mentorship-store, mentorship, store, company, inquiry.',about:'Section keys: hero (heading / label), introduction, pillar-1 to pillar-4, people, contact.',academy:'Section keys: hero-1 to hero-3 (banners), areas, promotion, career-1 to career-3, ai-collection.',company:'Section key: disciplines (footer description). Use approved social links with labels Facebook, LinkedIn, Instagram, YouTube, X, GitHub, TikTok or WhatsApp. Contact fields appear on Contact.',contact:'Section key: guidance. Page title and summary set the contact heading and introduction.',projects:'Section key: hero (label). Title and summary set the listing introduction.',research:'Title and summary set the research listing introduction.',publications:'Section key: hero (label). Title and summary set the publication listing introduction.',team:'Section key: hero (label). Title and summary set the team listing introduction.',store:'Store hero slides: keys hero-1 to hero-5 (or slide-1 to slide-5). Each slide supports Heading (title), Description, Eyebrow (label), CTA label and link, Banner image, and optional Mobile banner image. Reorder with Move up/down. Uncheck Visible to deactivate. Empty slides fall back gracefully.'};
  const baseline = toValues(resource, record);
  const dirtyKeys = fields[resource].filter(field => JSON.stringify(values[field.key]) !== JSON.stringify(baseline[field.key])).map(field => field.key);
  const dirty = dirtyKeys.length > 0;
  const editable = can(resource, "edit") && record?.status !== "archived" && (record?.status !== "published" || can(resource, "publish"));
  useUnsavedChanges(dirty);
  function focusError(next: Record<string, string>) { setErrors(next); requestAnimationFrame(() => { const field = form.current?.querySelector<HTMLElement>("[aria-invalid='true']"); if (field) { let parent = field.parentElement; while (parent) { if (parent instanceof HTMLDetailsElement) parent.open = true; parent = parent.parentElement; } field.focus(); } }); }
  function failure(failure: unknown) {
    const e = errorOf(failure); setError(e.message); setSuccess("");
    if (e.fields.length) focusError(Object.fromEntries(e.fields.map(field => [field, "Check this field; it may be required before publication."])));
    if (e.status === 409) { setConflict(true); setLatest(null); if (!record) setErrors({ slug: "This slug may already belong to another record. Choose a unique slug." }); }
  }
  function confirmed(result: ContentRecord, message: string) { const verified = checkedRecord(result); setRecord(verified); setValues(toValues(resource, verified)); setConflict(false); setLatest(null); setErrors({}); setError(""); setSuccess(message); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSuccess(""); setError("");
    const parsed = record ? patchPayload(resource, values, record) : serialize(resource, values);
    if (Object.keys(parsed.errors).length) { focusError(parsed.errors); setError("Check the highlighted fields."); return; }
    const changes = "changes" in parsed ? parsed.changes : parsed.data;
    if (record && Object.keys(changes).length === 0) { setError("There are no changed fields to save."); return; }
    setBusy(true);
    try {
      const result = await call<{ data: ContentRecord }>(`/admin/${resource}${record ? `/${record.id}` : ""}`, record ? "PATCH" : "POST", record ? { ...changes, revision: record.revision } : changes);
      const verified = checkedRecord(result.data);
      if (!record) { notify("Draft created. The server confirmed the saved record."); router.replace(`/admin/${resource}/${verified.id}`); }
      else confirmed(verified, "Changes saved.");
    } catch (e) { failure(e); } finally { setBusy(false); }
  }
  function openAction(next: Action) {
    setSuccess(""); setError(""); setErrors({}); setSchedule("");
    if (next === "publish") { const parsed = serialize(resource, values, true); if (Object.keys(parsed.errors).length) { focusError(parsed.errors); setError("Complete the highlighted publication fields before publishing."); return; } }
    setAction(next);
  }
  async function performAction() {
    if (!record || !action) return;
    let publishedAt: string | undefined;
    if (action === "publish" && schedule) {
      const date = new Date(schedule); if (!Number.isFinite(date.getTime())) { setError("Choose a valid publication date."); return; } publishedAt = date.toISOString();
    }
    setBusy(true);
    try {
      const result = await call<{ data: ContentRecord }>(`/admin/${resource}/${record.id}/${action}`, "POST", { revision: record.revision, ...(publishedAt ? { publishedAt } : {}) });
      const message = action === "publish" ? (publishedAt && Date.parse(publishedAt) > Date.now() ? "Publication scheduled." : "Content published.") : action === "unpublish" ? "Content returned to draft." : "Content archived.";
      confirmed(result.data, message); setAction(null);
    } catch (e) { setAction(null); failure(e); } finally { setBusy(false); }
  }
  async function review() {
    setBusy(true); setError("");
    try {
      const result = record ? (await call<{ data: ContentRecord }>(`/admin/${resource}/${record.id}`)).data : (await call<ContentList>(`/admin/${resource}?slug=${encodeURIComponent(String(values.slug).trim())}&limit=1`)).data[0];
      if (!result) { setError("No saved record currently uses this slug. Choose a unique slug and retry creating the draft."); return; }
      setLatest(checkedRecord(result));
    } catch (e) { failure(e); } finally { setBusy(false); }
  }
  function adoptLatest(discard: boolean) {
    if (!latest) return;
    if (discard && dirty && !window.confirm("Discard your unsaved input and reload the saved version?")) return;
    const next = toValues(resource, latest);
    if (!discard) for (const key of dirtyKeys) next[key] = values[key];
    setValues(next); setRecord(latest); setLatest(null); setConflict(false); setError(""); setSuccess(""); setErrors({});
  }
  return <><Link className="admin-back" href={`/admin/${resource}`}><ArrowLeft aria-hidden="true" />{labels[resource]}</Link>
    {record?.importProvenance&&<p className="admin-alert">Imported illustrative draft: {String((record.importProvenance as {notice:string}).notice)} Source: {String((record.importProvenance as {sourceId:string}).sourceId)}. Save the public-display review before publishing.</p>}
    <div className="admin-page-heading"><div><span className="eyebrow">{record ? "Saved content" : "New draft"}</span><h1>{record ? record.title ?? record.name ?? record.slug : `Create ${labels[resource].toLowerCase()} draft`}</h1><p>{record ? `Revision ${record.revision} · ${record.slug}` : "New content is always saved as a draft."}</p></div>{record && <Badge variant={record.status === "published" ? "success" : "neutral"}>{record.status}</Badge>}</div>
    {!editable && <p className="admin-info">{record?.status === "archived" ? "Archived content is read-only." : record?.status === "published" && can(resource, "edit") ? "Published edits require a publisher. Ask a publisher to unpublish this record before editing." : "Your role has read-only access."}</p>}
    {error && <p className="admin-alert" role="alert">{error}</p>}{success && <p className="admin-success" role="status">{success}</p>}
    {conflict && <Card className="admin-conflict"><h2>Review the current version</h2><p>Your unsaved input is unchanged. Load the latest saved version to review the conflict.</p><Button variant="secondary" loading={busy} onClick={review}><RefreshCw aria-hidden="true" />Review latest saved version</Button></Card>}
    {latest && <Card className="admin-review"><h2>Latest saved version · revision {latest.revision}</h2><p>Status: {latest.status}. Compare your changed fields before deciding how to continue.</p>
      {fields[resource].filter(field => dirtyKeys.includes(field.key)).map(field => <div className="admin-difference" key={field.key}><h3>{field.label}</h3><div><p>Your input</p><pre>{typeof values[field.key] === "string" ? String(values[field.key]) : JSON.stringify(values[field.key], null, 2)}</pre></div><div><p>Latest saved</p><pre>{typeof toValues(resource, latest)[field.key] === "string" ? String(toValues(resource, latest)[field.key]) : JSON.stringify(toValues(resource, latest)[field.key], null, 2)}</pre></div></div>)}
      {record ? <div className="admin-actions"><Button variant="secondary" onClick={() => adoptLatest(true)}>Reload saved version</Button><Button onClick={() => adoptLatest(false)}>Keep my changes on latest revision</Button></div> : <><p>This slug belongs to an existing record. Choose another slug for your new draft.</p><Link className="button button-secondary" href={`/admin/${resource}/${latest.id}`} target="_blank" rel="noopener noreferrer">Open existing record in a new tab</Link></>}
    </Card>}
    <form ref={form} className="admin-editor-form" noValidate onSubmit={save}>
      {(["Basics", "Media", "Details", "Advanced settings"] as const).map(section => {
        const group = editorFields.map(field=>field.key==='sections'?{...field,label:'Page sections and banners',hint:sectionHints[String(values.pageType)]??field.hint}:field).filter(field => {
          const category = ["title", "name", "slug", "summary", "pageType", "category", "level", "domain"].includes(field.key) ? "Basics" : ["media", "videoInput"].includes(field.key) ? "Media" : field.key === "seo" ? "Advanced settings" : "Details";
          return category === section;
        });
        if (!group.length) return null;
        const content = <div className="admin-form-grid">{group.map(field => field.key === "media" ? <ProjectImages resource={resource} key={field.key} value={values.media} disabled={!editable || busy} errors={errors} onChange={value => { setValues(previous => ({ ...previous, media: value })); setSuccess(""); }} /> : <ContentField resource={resource} key={field.key} field={field} value={values[field.key]} path={field.key} errors={errors} disabled={!editable || busy} onChange={value => { setValues(previous => ({ ...previous, [field.key]: value })); setSuccess(""); }} />)}</div>;
        return section === "Advanced settings" ? <details className="admin-advanced" key={section}><summary>{section}</summary>{content}</details> : <Card key={section}><div className="admin-form-heading"><h2>{section}</h2></div>{content}</Card>;
      })}
      {editable && <div className="admin-save-bar"><span>{dirty ? "Unsaved changes" : record ? "Saved version" : "Draft not yet created"}</span><Button type="submit" loading={busy} loadingLabel="Saving…" disabled={!!record && (!dirty || conflict)}><Save aria-hidden="true" />{record?.status === "published" ? "Save changes" : "Save draft"}</Button><Button variant="secondary" onClick={()=>setPreview(!preview)}>{preview?"Close preview":"Preview"}</Button>{record?.status === "draft" && can(resource, "publish") && <Button disabled={busy || dirty || conflict} onClick={() => openAction("publish")}>Publish</Button>}</div>}
    </form>
    {!editable && <Button variant="secondary" onClick={()=>setPreview(!preview)}>{preview?'Close preview':'Preview'}</Button>}
    {preview&&<Card><h2>Draft preview</h2><p>Entered content only; it is not publicly visible until publication.</p><ContentPreview fields={editorFields} data={serialize(resource,values).data}/></Card>}
    {record && record.status !== "archived" && <details className="admin-advanced admin-publication"><summary>Status and secondary actions</summary><p>{dirty ? "Save your changes before publishing or changing status." : "Status changes are confirmed by the server and recorded in the audit log."}</p>
      {record.publishedAt && <p>Publication time: {new Date(record.publishedAt).toLocaleString()}</p>}
      <div className="admin-actions">
        {!editable && record.status === "draft" && can(resource, "publish") && <Button disabled={busy || dirty || conflict} onClick={() => openAction("publish")}>Publish</Button>}
        {record.status === "published" && can(resource, "publish") && <Button variant="secondary" disabled={busy || dirty || conflict} onClick={() => openAction("unpublish")}>Unpublish</Button>}
        {can(resource, "edit") && (record.status !== "published" || can(resource, "publish")) && <Button variant="secondary" disabled={busy || dirty || conflict} onClick={() => openAction("archive")}>Archive</Button>}
      </div>
    </details>}
    {action && <ConfirmAction title={action === "publish" ? "Publish" : action === "unpublish" ? "Unpublish" : "Archive"} busy={busy} onCancel={() => setAction(null)} onConfirm={performAction}>
      <p>{action === "publish" ? "Make this saved version publicly available at its publication time?" : action === "unpublish" ? "Remove this record from public view and return it to a draft?" : "Archive this record? Archived records are read-only and cannot be restored here."}</p><p>Revision {record?.revision} · {record?.title ?? record?.name}</p>
      {action === "publish" && <TextField id="publish-schedule" label="Publish at (optional, local time)" type="datetime-local" value={schedule} disabled={busy} onChange={event => setSchedule(event.target.value)} hint="Leave blank to publish now. Future dates keep content hidden until that time." />}
    </ConfirmAction>}
  </>;
}
