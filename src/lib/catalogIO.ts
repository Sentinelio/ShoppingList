// Catalog import / export (admin): the dictionary entries plus the custom
// store types and categories, as JSON (complete) or CSV (for a spreadsheet).
// Pure: applyImport writes through the functions it is given (the admin
// passes the dictionary collection, which only admins may write).

import type { CustomStoreType, CustomCategory } from "./customStoreConfig";

export interface CatalogEntry {
  key: string;
  translations: Record<string, string>;
  category: string;
  store_type: string;
  is_brand: boolean;
}

export interface ExistingEntry extends CatalogEntry {
  id?: string;
}

export interface CatalogFile {
  format: "babelcart-catalog";
  version: 1;
  exported_at: string;
  langs: string[];
  store_types: CustomStoreType[];
  categories: CustomCategory[];
  entries: CatalogEntry[];
}

const BOM = String.fromCharCode(0xfeff);
const BOM_RE = new RegExp("^" + BOM);

const FIXED_COLUMNS = ["key", "category", "store_type", "is_brand"] as const;
const LANG_CODE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const normKey = (k: string) => k.trim().toLowerCase();

function toEntry(e: ExistingEntry): CatalogEntry {
  return {
    key: e.key,
    translations: { ...(e.translations ?? {}) },
    category: e.category || "other",
    store_type: e.store_type || "grocery",
    is_brand: !!e.is_brand,
  };
}

// ── Export ───────────────────────────────────────────────────────────────

export function exportJson(rows: ExistingEntry[], langs: string[], storeTypes: CustomStoreType[], categories: CustomCategory[]): string {
  const file: CatalogFile = {
    format: "babelcart-catalog",
    version: 1,
    exported_at: new Date().toISOString(),
    langs,
    store_types: storeTypes,
    categories,
    entries: [...rows].sort((a, b) => a.key.localeCompare(b.key)).map(toEntry),
  };
  return JSON.stringify(file, null, 2);
}

/** CSV with ";" (what Excel expects in Spanish/European locales) and a BOM
 *  so accents survive. One column per language. */
export function exportCsv(rows: ExistingEntry[], langs: string[]): string {
  const allLangs = [...new Set([...langs, ...rows.flatMap(r => Object.keys(r.translations ?? {}))])].filter(l => LANG_CODE.test(l));
  const cell = (v: string) => (/[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [[...FIXED_COLUMNS, ...allLangs].join(";")];
  for (const r of [...rows].sort((a, b) => a.key.localeCompare(b.key))) {
    const e = toEntry(r);
    lines.push([e.key, e.category, e.store_type, e.is_brand ? "1" : "0", ...allLangs.map(l => e.translations[l] ?? "")].map(cell).join(";"));
  }
  return BOM + lines.join("\r\n") + "\r\n";
}

export function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Parse ────────────────────────────────────────────────────────────────

export interface ParsedCatalog {
  entries: CatalogEntry[];
  storeTypes: CustomStoreType[];
  categories: CustomCategory[];
  /** Rows that could not be read: line/position and why. */
  invalid: Array<{ where: string; why: string }>;
  kind: "json" | "csv";
}

function parseCsvRows(text: string): string[][] {
  const body = text.replace(BOM_RE, "");
  const firstLine = body.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cur = "", quoted = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quoted) {
      if (c === '"') {
        if (body[i + 1] === '"') { cur += '"'; i++; } else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && body[i + 1] === "\n") i++;
      row.push(cur); rows.push(row); row = []; cur = "";
    } else cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim() !== ""));
}

function validate(raw: Partial<CatalogEntry> & { translations?: unknown }, where: string, invalid: ParsedCatalog["invalid"]): CatalogEntry | null {
  const translations: Record<string, string> = {};
  if (raw.translations && typeof raw.translations === "object") {
    for (const [l, v] of Object.entries(raw.translations as Record<string, unknown>)) {
      const t = clean(v);
      if (t && LANG_CODE.test(l)) translations[l] = t;
    }
  }
  const key = clean(raw.key) || translations.en || "";
  if (!key) { invalid.push({ where, why: "no key and no English name" }); return null; }
  if (!Object.keys(translations).length) { invalid.push({ where, why: `"${key}": no translations` }); return null; }
  if (!translations.en) translations.en = key;
  return {
    key: raw.is_brand ? key.trim() : normKey(key),
    translations,
    category: clean(raw.category) || "other",
    store_type: clean(raw.store_type) || "grocery",
    is_brand: raw.is_brand === true || String(raw.is_brand) === "1" || String(raw.is_brand).toLowerCase() === "true",
  };
}

export function parseCatalogFile(text: string, filename: string): ParsedCatalog {
  const invalid: ParsedCatalog["invalid"] = [];
  const trimmed = text.replace(BOM_RE, "").trimStart();
  if (filename.toLowerCase().endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    let data: unknown;
    try { data = JSON.parse(trimmed); } catch { throw new Error("The file is not valid JSON."); }
    const obj = (Array.isArray(data) ? { entries: data } : data) as Partial<CatalogFile> & { entries?: unknown };
    if (!Array.isArray(obj.entries)) throw new Error("No \"entries\" list in the file.");
    const entries = (obj.entries as unknown[]).map((e, i) => validate((e ?? {}) as Partial<CatalogEntry>, `entry ${i + 1}`, invalid)).filter((e): e is CatalogEntry => !!e);
    const storeTypes = Array.isArray(obj.store_types) ? obj.store_types.filter(s => s && typeof s.id === "string") : [];
    const categories = Array.isArray(obj.categories) ? obj.categories.filter(c => c && typeof c.id === "string") : [];
    return { entries, storeTypes, categories, invalid, kind: "json" };
  }
  const rows = parseCsvRows(text);
  if (rows.length < 2) throw new Error("The CSV has no rows.");
  const header = rows[0].map(h => h.trim());
  const col = (name: string) => header.findIndex(h => h.toLowerCase() === name);
  const langCols = header.map((h, i) => [h, i] as const).filter(([h]) => !FIXED_COLUMNS.includes(h.toLowerCase() as never) && LANG_CODE.test(h));
  if (col("key") < 0 && !langCols.some(([h]) => h === "en")) throw new Error("The CSV needs a \"key\" or an \"en\" column.");
  const entries: CatalogEntry[] = [];
  rows.slice(1).forEach((r, i) => {
    const get = (name: string) => { const c = col(name); return c >= 0 ? r[c] ?? "" : ""; };
    const translations: Record<string, string> = {};
    for (const [l, c] of langCols) if ((r[c] ?? "").trim()) translations[l] = r[c].trim();
    const e = validate({ key: get("key"), category: get("category"), store_type: get("store_type"), is_brand: get("is_brand") as unknown as boolean, translations }, `line ${i + 2}`, invalid);
    if (e) entries.push(e);
  });
  return { entries, storeTypes: [], categories: [], invalid, kind: "csv" };
}

// ── Plan ─────────────────────────────────────────────────────────────────

export type ImportMode = "merge" | "overwrite";

export interface ImportPlan {
  create: CatalogEntry[];
  update: Array<{ id: string; key: string; data: Partial<CatalogEntry>; changes: string[] }>;
  unchanged: number;
  duplicatesInFile: number;
}

/** merge: new entries are added; existing ones only get the languages they
 *  lack (my edits, category and store stay). overwrite: the file's values
 *  win for every field it has (languages it doesn't have are kept). */
export function planImport(entries: CatalogEntry[], existing: ExistingEntry[], mode: ImportMode): ImportPlan {
  const byKey = new Map(existing.filter(e => e.id).map(e => [normKey(e.key), e]));
  const seen = new Map<string, CatalogEntry>();
  let duplicatesInFile = 0;
  for (const e of entries) {
    const k = normKey(e.key);
    if (seen.has(k)) duplicatesInFile++;
    seen.set(k, e); // the last one in the file wins
  }
  const plan: ImportPlan = { create: [], update: [], unchanged: 0, duplicatesInFile };
  for (const [k, e] of seen) {
    const cur = byKey.get(k);
    if (!cur) { plan.create.push(e); continue; }
    const curTr = cur.translations ?? {};
    const translations = { ...curTr };
    const changes: string[] = [];
    for (const [l, v] of Object.entries(e.translations)) {
      if (!curTr[l]) { translations[l] = v; changes.push(`+${l}`); }
      else if (mode === "overwrite" && curTr[l] !== v) { translations[l] = v; changes.push(`${l}: ${curTr[l]} → ${v}`); }
    }
    const data: Partial<CatalogEntry> = {};
    if (changes.length) data.translations = translations;
    if (mode === "overwrite") {
      if (e.category && e.category !== (cur.category || "other")) { data.category = e.category; changes.push(`category → ${e.category}`); }
      if (e.store_type && e.store_type !== (cur.store_type || "grocery")) { data.store_type = e.store_type; changes.push(`store → ${e.store_type}`); }
      if (e.is_brand !== !!cur.is_brand) { data.is_brand = e.is_brand; changes.push(e.is_brand ? "now a brand" : "not a brand"); }
    }
    if (changes.length) plan.update.push({ id: cur.id!, key: cur.key, data, changes });
    else plan.unchanged++;
  }
  return plan;
}

// ── Apply ────────────────────────────────────────────────────────────────

export interface ApplyResult { created: number; updated: number; failed: Array<{ key: string; why: string }> }

export interface CatalogWriter {
  create: (e: CatalogEntry) => Promise<unknown>;
  update: (id: string, data: Partial<CatalogEntry>) => Promise<unknown>;
}

export async function applyImport(plan: ImportPlan, write: CatalogWriter, onProgress: (done: number, total: number) => void, shouldStop: () => boolean): Promise<ApplyResult> {
  const jobs: Array<() => Promise<"created" | "updated">> = [
    ...plan.create.map(e => async () => { await write.create(e); return "created" as const; }),
    ...plan.update.map(u => async () => { await write.update(u.id, u.data); return "updated" as const; }),
  ];
  const keys = [...plan.create.map(e => e.key), ...plan.update.map(u => u.key)];
  const result: ApplyResult = { created: 0, updated: 0, failed: [] };
  let next = 0, done = 0;
  const worker = async () => {
    while (next < jobs.length && !shouldStop()) {
      const i = next++;
      try {
        const kind = await jobs[i]();
        result[kind]++;
      } catch (err) {
        result.failed.push({ key: keys[i], why: err instanceof Error ? err.message : String(err) });
      }
      onProgress(++done, jobs.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return result;
}
