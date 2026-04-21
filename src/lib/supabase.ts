import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Demo mode: no real Supabase connection
export const IS_DEMO = !supabaseUrl || supabaseUrl.includes('placeholder') || !supabaseAnonKey || supabaseAnonKey.includes('placeholder');

export const supabase = IS_DEMO
  ? (null as unknown as ReturnType<typeof createClient>)
  : createClient(supabaseUrl, supabaseAnonKey);

// ── Database types ───────────────────────────────────────

export interface User {
  id: string;
  name: string;
  lang: string;
  country: string;
  avatar_color: string;
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
}

export interface ListMember {
  list_id: string;
  user_id: string;
  role: 'owner' | 'member';
  status: 'active' | 'pending' | 'rejected';
  joined_at: string;
  // Enriched from users table join
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
  key: string;
  translations: Record<string, string>;
  category: string;
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

// Response shape returned by the parse-receipt edge function.
// Not persisted directly; the UI maps this into Receipt + ReceiptItem rows
// after the user reviews and confirms.
export interface ParsedReceiptLine {
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
