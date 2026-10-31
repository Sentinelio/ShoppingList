// Data for the desktop Users / Lists screens: users, lists, memberships and
// item counts in four requests (the admin may read all of them).

import { pb, IS_DEMO } from "./pocketbase";
import { reportAdminError } from "./adminErrors";

export interface PUser {
  id: string;
  name: string;
  lang: string;
  country: string;
  tag?: string;
  is_admin?: boolean;
  avatar_color?: string;
  created_at: string;
  last_seen_at: string | null;
}

export interface PList {
  id: string;
  name: string;
  code: string;
  country?: string;
  created_by: string;
  created_at: string;
  last_checked_at?: string | null;
  require_approval: boolean;
  who_can_approve: string;
  who_can_remove: string;
  unavailable_policy?: string;
}

export interface PMember {
  list_id: string;
  user_id: string;
  role: string;
  status: string;
}

export interface PItemStats {
  total: number;
  pending: number;
  checked: number;
  unavailable: number;
  lastAdded: string | null;
}

export interface PeopleData {
  users: PUser[];
  lists: PList[];
  members: PMember[];
  itemsByList: Record<string, PItemStats>;
}

export const EMPTY_PEOPLE: PeopleData = { users: [], lists: [], members: [], itemsByList: {} };

export async function loadPeople(): Promise<PeopleData> {
  if (IS_DEMO) return EMPTY_PEOPLE;
  const fail = (what: string) => (err: unknown) => { reportAdminError(`Load ${what}`, err); return [] as never[]; };
  const [users, lists, members, items] = await Promise.all([
    pb.collection("users").getFullList<PUser>({ sort: "-created_at", fields: "id,name,lang,country,tag,is_admin,avatar_color,created_at,last_seen_at" }).catch(fail("users")),
    pb.collection("lists").getFullList<PList>({ sort: "-created_at" }).catch(fail("lists")),
    pb.collection("list_members").getFullList<PMember>({ fields: "list_id,user_id,role,status" }).catch(fail("members")),
    pb.collection("items").getFullList<{ list_id: string; checked: boolean; unavailable?: boolean; created_at: string }>({
      fields: "list_id,checked,unavailable,created_at",
    }).catch(fail("items")),
  ]);
  const itemsByList: Record<string, PItemStats> = {};
  for (const i of items) {
    const s = (itemsByList[i.list_id] ??= { total: 0, pending: 0, checked: 0, unavailable: 0, lastAdded: null });
    s.total++;
    if (i.unavailable) s.unavailable++;
    else if (i.checked) s.checked++;
    else s.pending++;
    if (!s.lastAdded || i.created_at > s.lastAdded) s.lastAdded = i.created_at;
  }
  return { users, lists, members, itemsByList };
}

// "k7m2qx", "K7M-2QX", " k7m 2qx " → "K7M2QX" (tags are stored as "K7M-2QX").
export function normTag(v: string): string {
  return v.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

// Users matching a free-text query. An exact ID returns only that user.
export function matchUsers<T extends { name: string; lang: string; country: string; tag?: string }>(users: T[], query: string): T[] {
  const q = query.trim();
  if (!q) return users;
  const asTag = normTag(q);
  if (asTag.length === 6) {
    const exact = users.filter(u => u.tag && normTag(u.tag) === asTag);
    if (exact.length) return exact;
  }
  const n = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const nq = n(q);
  return users.filter(u => n(`${u.name} ${u.lang} ${u.country} ${u.tag ?? ""}`).includes(nq)
    || (asTag.length >= 3 && !!u.tag && normTag(u.tag).includes(asTag)));
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} d ago`;
  return new Date(iso).toLocaleDateString();
}

export function timeValue(iso: string | null | undefined): number {
  return iso ? new Date(iso).getTime() : 0;
}
