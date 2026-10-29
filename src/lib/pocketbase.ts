import PocketBase, { ClientResponseError, type RecordModel, type RecordSubscription } from 'pocketbase';

const pbUrl = (import.meta.env.VITE_PB_URL as string | undefined) ?? '';

// Demo mode: no real backend connection
export const IS_DEMO = !pbUrl || pbUrl.includes('placeholder');

export const pb = IS_DEMO
  ? (null as unknown as PocketBase)
  : new PocketBase(pbUrl);

if (!IS_DEMO) {
  // The SDK cancels duplicated in-flight requests by default; the app fires
  // several identical reads in parallel (lists, members, items…).
  pb.autoCancellation(false);
  // Normalize every record that comes back (see fromPb).
  pb.afterSend = (_response, data) => normalizeDeep(data);
}

// ── Normalization ────────────────────────────────────────
// PocketBase never returns NULL: empty text/date/relation fields are "" and
// empty numbers are 0. The app (written for Postgres) relies on null for
// "no value", so the fields that were nullable are mapped back here. Dates
// come as "YYYY-MM-DD HH:MM:SS.sssZ", which Safari can't parse, so they are
// rewritten as ISO-8601.

const NULLABLE: Record<string, string[]> = {
  users: ['last_seen_at'],
  items: ['checked_at', 'photo'],
  item_prices: ['store', 'added_by', 'added_by_name'],
  product_prices: ['brand', 'store', 'added_by', 'added_by_name', 'source_item_price_id'],
  item_comments: ['added_by', 'added_by_name', 'added_by_lang'],
  item_history: ['icon', 'by_user_id', 'by_user_name'],
  receipts: ['store', 'store_address', 'nip', 'receipt_date', 'raw_json', 'added_by', 'added_by_name'],
  receipt_items: ['matched_item_id', 'expanded_name', 'brand', 'unit', 'tax_category', 'confidence'],
  store_phrases: ['last_used_at'],
};

// Numbers where 0 means "not set" (NULL in Postgres). A price of exactly 0
// is treated as "no price".
const ZERO_IS_NULL: Record<string, string[]> = {
  item_prices: ['price_value'],
  receipts: ['total'],
  receipt_items: ['qty', 'unit_price', 'total_price'],
};

const PB_DATE = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)$/;

function fixDate(v: unknown): unknown {
  if (typeof v !== 'string') return v;
  const m = PB_DATE.exec(v);
  return m ? `${m[1]}T${m[2]}` : v;
}

export function fromPb<T = RecordModel>(rec: RecordModel): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rec)) {
    out[k] = k === 'expand' && v && typeof v === 'object' ? normalizeExpand(v as Record<string, unknown>) : fixDate(v);
  }
  const name = rec.collectionName;
  for (const f of NULLABLE[name] ?? []) {
    if (out[f] === '' || out[f] === undefined) out[f] = null;
  }
  for (const f of ZERO_IS_NULL[name] ?? []) {
    if (out[f] === 0 || out[f] === undefined) out[f] = null;
  }
  if (name === 'receipts') {
    out.photo_url = rec.photo ? pb.files.getURL(rec, rec.photo as string) : null;
  }
  return out as T;
}

function normalizeExpand(expand: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(expand)) {
    out[k] = Array.isArray(v)
      ? v.map(r => (isRecord(r) ? fromPb(r) : r))
      : isRecord(v) ? fromPb(v) : v;
  }
  return out;
}

function isRecord(v: unknown): v is RecordModel {
  return !!v && typeof v === 'object' && typeof (v as RecordModel).collectionName === 'string';
}

function normalizeDeep(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(normalizeDeep);
  if (isRecord(data)) return fromPb(data);
  const obj = data as Record<string, unknown>;
  // List results ({ items: [...] }) and auth responses ({ token, record }).
  if (Array.isArray(obj.items)) return { ...obj, items: obj.items.map(normalizeDeep) };
  if (isRecord(obj.record)) return { ...obj, record: fromPb(obj.record) };
  return data;
}

// ── Helpers ──────────────────────────────────────────────

/** First record matching `filter`, or null when there is none. */
export async function pbFirst<T>(collection: string, filter: string, params?: Record<string, unknown>): Promise<T | null> {
  try {
    return await pb.collection(collection).getFirstListItem<T & RecordModel>(pb.filter(filter, params));
  } catch (err) {
    if (err instanceof ClientResponseError && err.status === 404) return null;
    throw err;
  }
}

/** Create or update the record whose `key` field equals `key` (PocketBase
 *  has no upsert; dictionary, store_phrases and app_config are keyed by it). */
export async function upsertByKey<T>(collection: string, key: string, data: Record<string, unknown>): Promise<T> {
  const existing = await pbFirst<RecordModel>(collection, 'key = {:key}', { key });
  if (existing) return pb.collection(collection).update<T & RecordModel>(existing.id, data);
  return pb.collection(collection).create<T & RecordModel>({ ...data, key });
}

/** Realtime subscription with normalized records. Returns a synchronous
 *  cleanup for useEffect; it also works if called before subscribe resolves. */
export function subscribe<T>(
  collection: string,
  filter: string,
  cb: (action: 'create' | 'update' | 'delete', record: T) => void,
): () => void {
  let unsub: (() => Promise<void>) | null = null;
  let closed = false;
  pb.collection(collection)
    .subscribe('*', (e: RecordSubscription<RecordModel>) => {
      if (!closed) cb(e.action as 'create' | 'update' | 'delete', fromPb<T>(e.record));
    }, { filter })
    .then(fn => {
      if (closed) fn().catch(() => {});
      else unsub = fn;
    })
    .catch(err => console.error(`[realtime:${collection}]`, err));
  return () => {
    closed = true;
    if (unsub) unsub().catch(() => {});
  };
}

/** POST to a custom route under /api/babelcart/. Errors become plain Error
 *  objects carrying the server message (e.g. "not_a_receipt"). */
export async function callRoute<T>(path: string, body: unknown): Promise<T> {
  try {
    return await pb.send<T>(`/api/babelcart/${path}`, { method: 'POST', body });
  } catch (err) {
    throw toError(err);
  }
}

export function toError(err: unknown): Error {
  if (err instanceof ClientResponseError) {
    const msg = (err.response?.message as string | undefined) || err.message;
    const e = new Error(msg || `HTTP ${err.status}`);
    (e as Error & { status?: number }).status = err.status;
    return e;
  }
  return err instanceof Error ? err : new Error(String(err));
}

// ── Database types ───────────────────────────────────────

export interface User {
  id: string;
  name: string;
  lang: string;
  country: string;
  avatar_color: string;
  is_admin?: boolean;
  created_at: string;
  last_seen_at: string | null;
}

export interface List {
  id: string;
  name: string;
  code: string;
  created_by: string;
  created_at: string;
  require_approval: boolean;
  who_can_approve: 'owner' | 'any_member';
  who_can_remove: 'owner' | 'any_member';
  // Country the list is used in (its language is the primary one). Empty on
  // lists created before the field existed: use the viewer's country.
  country?: string;
  // Maintained by the server (pb_hooks), read-only for clients
  active_members?: string[];
  owners?: string[];
}

export interface ListMember {
  id?: string;
  list_id: string;
  user_id: string;
  role: 'owner' | 'member';
  status: 'active' | 'pending' | 'rejected';
  joined_at: string;
  // Enriched from users relation
  user_name?: string;
  user_lang?: string;
  user_country?: string;
  user_last_seen_at?: string;
}

export interface Item {
  id: string;
  list_id: string;
  original: string;
  translations: Record<string, string>;
  category: string;
  qty: string;
  unit: string;
  note: string;
  brand: string;
  photo: string | null;
  important: boolean;
  checked: boolean;
  checked_at: string | null;
  // "No hay": out of stock at the shop. Independent of `checked`.
  unavailable?: boolean;
  unavailable_at?: string | null;
  added_by: string;
  added_by_name: string;
  created_at: string;
}

export interface ItemPrice {
  id: string;
  item_id: string;
  // Nullable: rows with null price_value/store represent purchases logged
  // by toggling the item as done, without entering a price.
  store: string | null;
  price_value: number | null;
  currency: string;
  added_by: string | null;
  added_by_name: string | null;
  created_at: string;
}

export interface ProductPrice {
  id: string;
  product_key: string;
  product_name: string;
  brand: string | null;
  store: string | null;
  price_value: number;
  currency: string;
  added_by: string | null;
  added_by_name: string | null;
  source_item_price_id: string | null;
  created_at: string;
}

export interface ItemComment {
  id: string;
  item_id: string;
  text: string;
  added_by: string | null;
  added_by_name: string | null;
  added_by_lang: string | null;
  created_at: string;
}

export interface ItemHistoryEvent {
  id: string;
  item_id: string;
  event_type: string;
  description: string;
  icon: string | null;
  by_user_id: string | null;
  by_user_name: string | null;
  created_at: string;
}

export interface DictEntry {
  id?: string;
  key: string;
  translations: Record<string, string>;
  category: string;
  store_type?: string;
  is_brand?: boolean;
  created_at: string;
}

export interface Receipt {
  id: string;
  list_id: string;
  store: string | null;
  store_address: string | null;
  nip: string | null;
  receipt_date: string | null;
  currency: string;
  total: number | null;
  // Derived from the `photo` file field (see fromPb)
  photo_url: string | null;
  raw_json: unknown;
  added_by: string | null;
  added_by_name: string | null;
  created_at: string;
}

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  matched_item_id: string | null;
  raw_name: string;
  expanded_name: string | null;
  brand: string | null;
  qty: number | null;
  unit: string | null;
  unit_price: number | null;
  total_price: number | null;
  discount: number;
  tax_category: string | null;
  confidence: string | null;
  created_at: string;
}

// Response shape returned by /api/babelcart/parse-receipt.
// Not persisted directly; the UI maps this into Receipt + ReceiptItem rows
// after the user reviews and confirms.
export interface ParsedReceiptLine {
  raw_name: string;
  expanded_name: string | null;
  translations: Record<string, string>;
  category: string;
  brand: string | null;
  qty: number | null;
  unit: string | null;
  unit_price: number | null;
  total_price: number | null;
  discount: number;
  tax_category: string | null;
  confidence: string | null;
}

export interface ParsedReceipt {
  store: string | null;
  store_address: string | null;
  nip: string | null;
  date: string | null;
  currency: string;
  total: number | null;
  lines: ParsedReceiptLine[];
}
