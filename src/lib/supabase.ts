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
}

export interface List {
  id: string;
  name: string;
  code: string;
  created_by: string;
  created_at: string;
}

export interface ListMember {
  list_id: string;
  user_id: string;
  role: 'owner' | 'member';
  status: 'active' | 'pending' | 'rejected';
  joined_at: string;
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
  checked: boolean;
  added_by: string;
  added_by_name: string;
  created_at: string;
}

export interface DictEntry {
  key: string;
  translations: Record<string, string>;
  category: string;
  created_at: string;
}
