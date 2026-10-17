"use client";
import { ConfirmAction } from "./confirm";
import {institutionalPrograms} from '@/content/institutional-programs';
import {serviceGroups,type ServiceGroup} from '@/content/services';
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Plus, RefreshCw } from "lucide-react";
import { checkedRecord, labels, resources, type ContentList as List, type ContentRecord, type Resource } from "@/lib/admin/contracts";
import { errorOf, type ApiError } from "@/lib/admin/api";
import { useAdmin, ResourceGate } from "./session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SelectField, TextField } from "@/components/ui/form-field";
export function AdminHome() {
  const { can } = useAdmin();
  return <><div className="admin-page-heading"><div><span className="eyebrow">Content workspace</span><h1>Choose a collection</h1><p>Inspect content and manage the actions assigned to your role.</p></div></div>
    <div className="admin-collection-grid">{resources.filter(resource => can(resource, "read")).map(resource => <Card key={resource}><h2>{labels[resource]}</h2><p>{can(resource, "edit") ? "Create drafts and manage content." : "Read access to saved content."}</p><Link className="button button-secondary" href={`/admin/${resource}`}>Open {labels[resource].toLowerCase()}<ArrowRight aria-hidden="true" /></Link></Card>)}{can("leads", "read") && <Card><h2>Leads</h2><p>Review inquiries and manage their assigned workflow.</p><Link className="button button-secondary" href="/admin/leads">Open leads<ArrowRight aria-hidden="true" /></Link></Card>}</div></>;
}
export function ContentList({ resource,pageType }: { resource: Resource;pageType?:string }) { return <ResourceGate resource={resource}><ResourceList resource={resource} pageType={pageType} /></ResourceGate>; }
function ResourceList({ resource,pageType }: { resource: Resource;pageType?:string }) {
  const { call, can } = useAdmin();
  const [archive, setArchive] = useState<ContentRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  async function confirmArchive() {
    if (!archive || busy) return;
    setBusy(true); setActionError(""); setNotice("");
    try { const response = await call<{ data: ContentRecord }>(`/admin/${resource}/${archive.id}/archive`, "POST", { revision: archive.revision }); checkedRecord(response.data); setArchive(null); setNotice("Content archived."); setAttempt(value => value + 1); }
    catch (failure) { setActionError(errorOf(failure).message); setArchive(null); } finally { setBusy(false); }
  }
  const [page, setPage] = useState(1); const [status, setStatus] = useState(""); const [sort, setSort] = useState("-updatedAt");
  const [slugInput, setSlugInput] = useState(""); const [slug, setSlug] = useState(""); const [filterError, setFilterError] = useState(""); const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; list?: List; error?: ApiError; checkedAt?: number }>({ key: "" });
  const query = new URLSearchParams({ page: String(page), limit: "20", sort, ...(pageType?{pageType}:{}),...(status ? { status } : {}), ...(slug ? { slug } : {}) });
  const path = `/admin/${resource}?${query}`; const key = `${path}:${attempt}`;
  useEffect(() => {
    let active = true;
    call<List>(path).then(list => {
      if (!Array.isArray(list.data) || !list.pagination || !Number.isSafeInteger(list.pagination.total)) throw new Error("Invalid list response");
      list.data.forEach(checkedRecord); if (active) setResult({ key, list, checkedAt: Date.now() });
    }).catch(error => { if (active) setResult({ key, error: errorOf(error) }); });
    return () => { active = false; };
  }, [call, path, key]);
  const loading = result.key !== key; const list = !loading ? result.list : undefined;
  return <><div className="admin-page-heading"><div><span className="eyebrow">Content collection</span><h1>{labels[resource]}</h1><p>{can(resource, "edit") ? "Manage saved content and drafts." : "Read-only access. Your role cannot change content."}</p></div>
    {can(resource, "edit") && <Link className="button button-primary" href={`/admin/${resource}/new${pageType?`?group=${pageType}`:''}`}><Plus aria-hidden="true" />Add {labels[resource].toLowerCase()}</Link>}</div>
    {resource==='pages'&&!pageType&&<Card><h2>Page management</h2><div className="admin-actions">{['homepage','solutions','institutional','consulting'].map(group=><Link className="button button-secondary" key={group} href={`/admin/${group}`}>{group.charAt(0).toUpperCase()+group.slice(1)}</Link>)}{['about','contact','academy','company','projects','research','publications','team','store'].map(group=><Link className="button button-secondary" key={group} href={`/admin/site-content/${group}`}>{group.charAt(0).toUpperCase()+group.slice(1)} content</Link>)}</div><p>These editors load existing pages. New pages start as drafts.</p></Card>}
    {pageType&&<details className="admin-advanced"><summary>Existing page destinations</summary><p>Use these destinations to edit existing service pages. Templates prefill the form; save and publish when ready.</p><div className="admin-actions">{[{slug:'',title:`${pageType} overview`},...serviceGroups[pageType as ServiceGroup].items,...(pageType==='institutional'?institutionalPrograms.map(program=>({title:program.title,slug:`program-${program.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}`})):[])].map(item=>{const slug=item.slug?`${pageType}-${item.slug}`:pageType,existing=list?.data.find(record=>record.slug===slug);return <Link key={slug} className="button button-secondary" href={existing?`/admin/pages/${existing.id}`:`/admin/pages/new?group=${pageType}${item.slug?`&target=${item.slug}`:''}`}>{item.title}</Link>;})}</div></details>}
    {actionError && <p className="admin-alert" role="alert">{actionError}</p>}{notice && <p className="admin-success" role="status">{notice}</p>}
    <Card className="admin-filters"><SelectField id="filter-status" label="Status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option>{["draft", "published", "archived"].map(value => <option key={value} value={value}>{value}</option>)}</SelectField>
      <SelectField id="filter-sort" label="Sort" value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}><option value="-updatedAt">Recently updated</option><option value="-createdAt">Recently created</option><option value={resource === "team" ? "name" : "title"}>Name / title</option><option value="-publishedAt">Publication date</option></SelectField>
      <form onSubmit={event => { event.preventDefault(); const value = slugInput.trim(); if (value && (value.length > 160 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))) { setFilterError("Enter a valid lowercase slug."); return; } setFilterError(""); setSlug(value); setPage(1); }}><TextField id="filter-slug" label="Exact slug" value={slugInput} onChange={event => setSlugInput(event.target.value)} error={filterError} /><Button type="submit" variant="secondary">Apply filter</Button></form>
    </Card>
    {loading ? <Card><p role="status">Loading {labels[resource].toLowerCase()}…</p></Card> : result.error ? <Card><p className="admin-alert" role="alert">{result.error.message}</p><Button variant="secondary" onClick={() => setAttempt(attempt + 1)}><RefreshCw aria-hidden="true" />Retry loading</Button></Card> : list && <>
      {list.data.length === 0 ? <Card><h2>No matching content</h2><p>{status || slug ? "Change the filters to view other saved records." : "This collection has no saved records."}</p></Card> : <div className="admin-record-list">{list.data.map(record => <Card key={record.id} className="admin-record"><div><Link className="admin-record-title" href={`/admin/${resource}/${record.id}`}>{record.title ?? record.name ?? record.slug}<ArrowRight aria-hidden="true" /></Link><p className="admin-slug">{record.slug}</p></div><div className="admin-record-meta"><Badge variant={record.status === "published" ? "success" : "neutral"}>{record.status}{record.publishedAt && Date.parse(record.publishedAt) > (result.checkedAt ?? 0) ? " · scheduled" : ""}</Badge><span>Revision {record.revision}</span><span>Updated {record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : "date unavailable"}</span></div><div className="admin-record-actions"><Link className="button button-secondary" href={`/admin/${resource}/${record.id}`}>{can(resource, "edit") ? "Edit" : "View"}</Link><details className="admin-action-menu"><summary aria-label={`More actions for ${record.title ?? record.name ?? record.slug}`}>More actions</summary><div><Link href={`/admin/${resource}/${record.id}?preview=1`}>Preview saved content</Link>{record.status !== "archived" && can(resource, "edit") && (record.status !== "published" || can(resource, "publish")) && <Button variant="ghost" onClick={() => { setActionError(""); setArchive(record); }}>Archive</Button>}</div></details></div></Card>)}</div>}
      <div className="admin-pagination"><span>{list.pagination.total} matching {list.pagination.total === 1 ? "record" : "records"} · Page {page} of {Math.max(1, list.pagination.totalPages)}</span><div><Button variant="secondary" aria-label="Previous page" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft aria-hidden="true" />Previous</Button><Button variant="secondary" aria-label="Next page" disabled={page >= list.pagination.totalPages} onClick={() => setPage(page + 1)}>Next<ChevronRight aria-hidden="true" /></Button></div></div>
    </>}
    {archive && <ConfirmAction title="Archive" busy={busy} onCancel={() => setArchive(null)} onConfirm={() => void confirmArchive()}><p>Archive {archive.title ?? archive.name ?? archive.slug}? Archived records are read-only and cannot be restored here.</p><p>Revision {archive.revision}</p></ConfirmAction>}
  </>;
}
