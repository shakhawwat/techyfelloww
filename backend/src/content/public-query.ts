import { BadRequestException } from "@nestjs/common";
import type { QueryFilter } from "mongoose";
import type { ContentKind, ContentRecord } from "./content.types";
import { courseLevels, deliveryModes, researchStages } from "./content.schemas";

type Filter = { field: keyof ContentRecord; values?: readonly string[]; numeric?: boolean };
const filters: Record<ContentKind, Record<string, Filter>> = {
  pages: {pageType:{field:"pageType"}},
  products: {},
  projects: { category: { field: "category" }, technology: { field: "technologies" } },
  research: { domain: { field: "domain" }, researchStage: { field: "researchStage", values: researchStages } },
  publications: { author: { field: "authors" }, venue: { field: "venue" }, year: { field: "year", numeric: true } },
  team: { classification:{field:"classification",values:["team","board"]},expertise: { field: "expertise" } },
  courses: { level: { field: "level", values: courseLevels }, deliveryMode: { field: "deliveryMode", values: deliveryModes } },
};
function integer(value: unknown, defaultValue: number, max: number): number {
  if (value === undefined) return defaultValue;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) throw new BadRequestException();
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n > max) throw new BadRequestException();
  return n;
}

export function parsePublicQuery(kind: ContentKind, raw: Record<string, unknown>, now = new Date()) {
  const supported = filters[kind];
  const allowed = new Set(["page", "limit", "sort", ...Object.keys(supported)]);
  if (Object.keys(raw).some(key => !allowed.has(key))) throw new BadRequestException();
  const page = integer(raw.page, 1, Number.MAX_SAFE_INTEGER);
  const limit = integer(raw.limit, 20, 100);
  const skip = (page - 1) * limit;
  if (!Number.isSafeInteger(skip)) throw new BadRequestException();
  const titleField = kind === "team" ? "name" : "title";
  const sortFields = ["publishedAt", titleField, ...(kind === "publications" ? ["year"] : [])];
  const value = raw.sort ?? "-publishedAt";
  if (typeof value !== "string") throw new BadRequestException();
  const field = value.startsWith("-") ? value.slice(1) : value;
  if (!sortFields.includes(field)) throw new BadRequestException();
  const sort: Record<string, 1 | -1> = { [field]: value.startsWith("-") ? -1 : 1, slug: 1 };
  const filter: QueryFilter<ContentRecord> = { status: "published", publishedAt: { $lte: now } };
  for (const [key, spec] of Object.entries(supported)) {
    if (raw[key] === undefined) continue;
    const input = raw[key];
    if (typeof input !== "string" || input.length === 0 || input.length > 200 || input.trim() !== input || /[\u0000-\u001F]/.test(input)) throw new BadRequestException();
    if (spec.values && !spec.values.includes(input)) throw new BadRequestException();
    const parsed = spec.numeric ? integer(input, 1, 9999) : input;
    // Only server-defined field names and scalar $eq values reach MongoDB.
    if(kind==='team'&&key==='classification'&&parsed==='team')filter.$or=[{classification:'team'},{classification:{$exists:false}}];else Object.assign(filter, { [spec.field]: { $eq: parsed } });
  }
  return { page, limit, skip, sort, filter };
}
