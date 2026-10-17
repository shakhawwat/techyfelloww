import { doiUrl } from '@/lib/public/pages';
import type { PublicationPreview } from './publication-preview-data';
export function citationText(entry: PublicationPreview): string {
  if(!(entry.demo||entry.illustrative)&&entry.citation)return entry.citation;
  const parts = [entry.authors?.length ? `${entry.authors.join(', ')}.` : '', entry.year ? `(${entry.year}).` : '', `${entry.title}.`, entry.venue ? `${entry.venue}.` : '', !(entry.demo||entry.illustrative) ? doiUrl(entry.doi) ?? '' : ''].filter(Boolean);
  return `${(entry.demo||entry.illustrative) ? 'Illustrative citation (fictional preview): ' : ''}${parts.join(' ')}`;
}
function escapeBibtex(value: string): string {
  return value.replace(/[\\{}%&#_$]/g, character => ({ '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '%': '\\%', '&': '\\&', '#': '\\#', '_': '\\_', '$': '\\$' }[character]!));
}
export function citationBibtex(entry: PublicationPreview): string | undefined {
  if (!entry.title || !entry.authors?.length || !entry.venue || !entry.year) return;
  const fields = [`  title = {${escapeBibtex(entry.title)}}`, `  author = {${entry.authors.map(escapeBibtex).join(' and ')}}`, `  howpublished = {${escapeBibtex(entry.venue)}}`, `  year = {${entry.year}}`];
  if (!(entry.demo||entry.illustrative) && doiUrl(entry.doi)) fields.push(`  doi = {${escapeBibtex(entry.doi!)}}`);
  return `${(entry.demo||entry.illustrative) ? '% Illustrative citation only; not a published paper.\n' : ''}@misc{${entry.id.replace(/[^a-zA-Z0-9_-]/g, '')},\n${fields.join(',\n')}\n}`;
}
