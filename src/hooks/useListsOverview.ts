import { useCallback, useEffect, useState } from "react";
import { pb, IS_DEMO, type List } from "../lib/pocketbase";
import { demoGetItems, demoGetMembers } from "../lib/demoStore";

export interface ListOverview {
  list: List;
  /** Archived by me (personal; list_members.archived on my row). */
  archived: boolean;
  /** Active members, for the avatars. */
  members: Array<{ user_id: string; name: string }>;
  /** Items still to buy (neither bought nor "No hay"). */
  toBuy: number;
  total: number;
  /** Last time the list was used: newest item added or checked. */
  lastUsed: string | null;
}

interface MemberRow {
  list_id: string;
  user_id: string;
  archived?: boolean;
  expand?: { user_id?: { name?: string } };
}
interface ItemRow {
  list_id: string;
  checked: boolean;
  unavailable?: boolean;
  created_at: string;
  checked_at: string | null;
}

const newest = (a: string | null, b: string | null | undefined) => (!b ? a : !a || b > a ? b : a);

// Data for "Mis listas" (2.1) on top of useLists: one read of my lists'
// members and one of their items (the rules already limit both to lists
// where I'm an active member).
export function useListsOverview(lists: List[], userId: string | undefined) {
  const [overview, setOverview] = useState<ListOverview[]>([]);
  // Which lists the overview was built for: until it matches the current
  // lists, "Mis listas" keeps showing "loading" (it used to flash "you
  // have no lists" while members and items were still loading).
  const [builtFor, setBuiltFor] = useState<string | null>(null);
  const listsKey = lists.map(l => l.id).join(",");

  const load = useCallback(async () => {
    if (!userId) { setOverview([]); setBuiltFor(listsKey); return; }
    if (IS_DEMO) {
      setOverview(lists.map(list => {
        const items = demoGetItems(list.id);
        return {
          list,
          archived: false,
          members: demoGetMembers(list.id).filter(m => m.status === "active").map(m => ({ user_id: m.user_id, name: m.user_name ?? "" })),
          toBuy: items.filter(i => !i.checked).length,
          total: items.length,
          lastUsed: items.reduce<string | null>((acc, i) => newest(acc, i.created_at), null),
        };
      }));
      setBuiltFor(listsKey);
      return;
    }
    if (lists.length === 0) { setOverview([]); setBuiltFor(listsKey); return; }

    const [membersRes, itemsRes] = await Promise.allSettled([
      pb.collection("list_members").getFullList<MemberRow>({
        filter: 'status = "active"',
        expand: "user_id",
        fields: "list_id,user_id,archived,expand.user_id.name",
      }),
      pb.collection("items").getFullList<ItemRow>({
        fields: "list_id,checked,unavailable,created_at,checked_at",
      }),
    ]);
    if (membersRes.status === "rejected") console.error("[useListsOverview] members", membersRes.reason);
    if (itemsRes.status === "rejected") console.error("[useListsOverview] items", itemsRes.reason);
    const members = membersRes.status === "fulfilled" ? membersRes.value : [];
    const items = itemsRes.status === "fulfilled" ? itemsRes.value : [];

    setOverview(lists.map(list => {
      const rows = members.filter(m => m.list_id === list.id);
      const its = items.filter(i => i.list_id === list.id);
      let lastUsed: string | null = list.last_checked_at ?? null;
      for (const i of its) lastUsed = newest(newest(lastUsed, i.created_at), i.checked_at);
      return {
        list,
        archived: !!rows.find(m => m.user_id === userId)?.archived,
        members: rows.map(m => ({ user_id: m.user_id, name: m.expand?.user_id?.name ?? "" })),
        toBuy: its.filter(i => !i.checked && !i.unavailable).length,
        total: its.length,
        lastUsed,
      };
    }));
    setBuiltFor(listsKey);
  }, [lists, userId, listsKey]);

  useEffect(() => { void load(); }, [load]);

  return { overview, ready: builtFor === listsKey, reload: load, setOverview };
}

/** "hace 2 h" / "2 hours ago" / "2 godziny temu", in the person's language. */
export function usedAgo(iso: string, lang: string): string {
  const secs = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  const abs = Math.abs(secs);
  if (abs < 60) return rtf.format(Math.round(secs), "second");
  if (abs < 3600) return rtf.format(Math.round(secs / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(secs / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(secs / 86400), "day");
  return rtf.format(Math.round(secs / (86400 * 30)), "month");
}
