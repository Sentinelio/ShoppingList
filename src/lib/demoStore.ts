// Demo mode: detects if Supabase is not configured and provides in-memory storage
import type { User, List, ListMember, Item } from './supabase';

const DEMO_STORAGE_KEY = 'polyglot_demo_db';

interface DemoDB {
  users: User[];
  lists: List[];
  list_members: ListMember[];
  items: Item[];
}

function load(): DemoDB {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { users: [], lists: [], list_members: [], items: [] };
}

function save(db: DemoDB) {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(db));
}

function uuid(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Change listeners for realtime simulation
type Listener = () => void;
const listeners: Set<Listener> = new Set();
export function onDemoChange(fn: Listener) { listeners.add(fn); return () => { listeners.delete(fn); }; }
function notify() { listeners.forEach(fn => fn()); }

// ── Users ──────────────────────────────────────────────
export function demoCreateUser(name: string, lang: string, country: string): User {
  const db = load();
  const user: User = { id: uuid(), name, lang, country, avatar_color: '#f0883e', created_at: new Date().toISOString() };
  db.users.push(user);
  save(db);
  return user;
}

export function demoGetUser(id: string): User | null {
  return load().users.find(u => u.id === id) ?? null;
}

export function demoUpdateUser(id: string, updates: Partial<User>): User | null {
  const db = load();
  const idx = db.users.findIndex(u => u.id === id);
  if (idx < 0) return null;
  db.users[idx] = { ...db.users[idx], ...updates };
  save(db);
  return db.users[idx];
}

// ── Lists ──────────────────────────────────────────────
export function demoGetLists(userId: string): List[] {
  const db = load();
  const memberListIds = db.list_members
    .filter(m => m.user_id === userId && m.status === 'active')
    .map(m => m.list_id);
  return db.lists.filter(l => memberListIds.includes(l.id));
}

export function demoCreateList(name: string, userId: string): List {
  const db = load();
  const list: List = { id: uuid(), name, code: generateCode(), created_by: userId, created_at: new Date().toISOString() };
  db.lists.push(list);
  db.list_members.push({ list_id: list.id, user_id: userId, role: 'owner', status: 'active', joined_at: new Date().toISOString() });
  save(db);
  notify();
  return list;
}

export function demoGetList(id: string): List | null {
  return load().lists.find(l => l.id === id) ?? null;
}

export function demoJoinList(code: string, userId: string): List {
  const db = load();
  const list = db.lists.find(l => l.code === code.toUpperCase());
  if (!list) throw new Error('List not found');
  db.list_members.push({ list_id: list.id, user_id: userId, role: 'member', status: 'pending', joined_at: new Date().toISOString() });
  save(db);
  return list;
}

export function demoDeleteList(id: string) {
  const db = load();
  db.lists = db.lists.filter(l => l.id !== id);
  db.list_members = db.list_members.filter(m => m.list_id !== id);
  db.items = db.items.filter(i => i.list_id !== id);
  save(db);
  notify();
}

export function demoLeaveList(listId: string, userId: string) {
  const db = load();
  db.list_members = db.list_members.filter(m => !(m.list_id === listId && m.user_id === userId));
  save(db);
  notify();
}

export function demoGetMembers(listId: string): ListMember[] {
  return load().list_members.filter(m => m.list_id === listId);
}

// ── Items ──────────────────────────────────────────────
export function demoGetItems(listId: string): Item[] {
  return load().items.filter(i => i.list_id === listId).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function demoAddItem(params: {
  listId: string; original: string; translations: Record<string, string>;
  category: string; qty: string; unit: string; note: string; photo?: string | null;
  addedBy: string; addedByName: string;
}): Item {
  const db = load();
  const item: Item = {
    id: uuid(), list_id: params.listId, original: params.original,
    translations: params.translations, category: params.category,
    qty: params.qty, unit: params.unit, note: params.note, photo: params.photo || null,
    checked: false, added_by: params.addedBy, added_by_name: params.addedByName,
    created_at: new Date().toISOString(),
  };
  db.items.push(item);
  save(db);
  notify();
  return item;
}

export function demoUpdateItem(id: string, updates: Partial<Item>): Item | null {
  const db = load();
  const idx = db.items.findIndex(i => i.id === id);
  if (idx < 0) return null;
  db.items[idx] = { ...db.items[idx], ...updates };
  save(db);
  notify();
  return db.items[idx];
}

export function demoDeleteItem(id: string) {
  const db = load();
  db.items = db.items.filter(i => i.id !== id);
  save(db);
  notify();
}

export function demoCheckDuplicate(listId: string, translations: Record<string, string>): Item | null {
  const en = translations.en?.toLowerCase();
  if (!en) return null;
  return load().items.find(i => i.list_id === listId && i.translations.en?.toLowerCase() === en) ?? null;
}
