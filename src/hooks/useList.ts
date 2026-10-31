import { useState, useEffect, useCallback } from "react";
import { pb, IS_DEMO, callRoute, subscribe, toError, type List, type ListMember, type Item, type User } from "../lib/pocketbase";
import { getAllLocallyImportant } from "../lib/importantStore";
import {
  demoGetLists, demoCreateList, demoGetList, demoJoinList,
  demoDeleteList, demoLeaveList, demoGetMembers, demoGetItems, onDemoChange,
} from "../lib/demoStore";

// ── types for demo localStorage shape ───────────────────

interface DemoMemberRow {
  list_id: string;
  user_id: string;
  status: "active" | "pending" | "rejected" | string;
  role?: "owner" | "member";
  joined_at?: string;
}
interface DemoUserRow { id: string; name?: string; lang?: string; country?: string }
interface DemoListRow { id: string; name?: string; code?: string }
interface DemoDb {
  users?: DemoUserRow[];
  lists?: DemoListRow[];
  list_members?: DemoMemberRow[];
}

function readDemoDb(): DemoDb {
  try {
    return JSON.parse(localStorage.getItem("polyglot_demo_db") ?? "{}") as DemoDb;
  } catch {
    return {};
  }
}

// ── helpers ─────────────────────────────────────────────

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// list_members rows are addressed by (list_id, user_id) in the UI.
async function findMemberRow(listId: string, userId: string): Promise<{ id: string }> {
  try {
    return await pb.collection("list_members").getFirstListItem(
      pb.filter("list_id = {:listId} && user_id = {:userId}", { listId, userId }),
    );
  } catch (err) {
    throw toError(err);
  }
}

async function deleteMemberRow(listId: string, userId: string): Promise<void> {
  const row = await findMemberRow(listId, userId);
  await pb.collection("list_members").delete(row.id);
}

// ── useLists ────────────────────────────────────────────

export function useLists(userId: string | undefined) {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLists([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (IS_DEMO) {
      setLists(demoGetLists(userId));
      setLoading(false);
      return;
    }

    // Only lists I'm an active member of. The list rule already limits normal
    // users to those, but admins may read every list: without this filter an
    // admin's home showed everyone's lists, where adding items then failed
    // (items' create rule needs membership).
    try {
      const fetched = await pb.collection("lists").getFullList<List>({
        sort: "created_at",
        filter: pb.filter("active_members.id ?= {:user}", { user: userId }),
      });
      setLists(fetched);
    } catch (err) {
      console.error("[useLists]", err);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for demo changes
  useEffect(() => {
    if (!IS_DEMO) return;
    return onDemoChange(refresh);
  }, [refresh]);

  return { lists, loading, refresh };
}

// ── useMyPendingRequests ────────────────────────────────

export interface PendingRequest {
  list_id: string;
  list_name: string;
  list_code: string;
  status: string;
  joined_at: string;
}

export function useMyPendingRequests(userId: string | undefined) {
  const [requests, setRequests] = useState<PendingRequest[]>([]);

  const refresh = useCallback(async () => {
    if (!userId) { setRequests([]); return; }

    if (IS_DEMO) {
      const db = readDemoDb();
      const pending: PendingRequest[] = (db.list_members ?? [])
        .filter(m => m.user_id === userId && m.status === "pending")
        .map(m => {
          const list = (db.lists ?? []).find(l => l.id === m.list_id);
          return {
            list_id: m.list_id,
            list_name: list?.name ?? "?",
            list_code: list?.code ?? "",
            status: m.status,
            joined_at: m.joined_at ?? "",
          };
        });
      setRequests(pending);
      return;
    }

    // Pending users can't read the list itself yet, so the server resolves
    // the names (GET /api/babelcart/my-requests).
    try {
      const data = await pb.send<PendingRequest[]>("/api/babelcart/my-requests", { method: "GET" });
      setRequests(data.map(r => ({ ...r, joined_at: r.joined_at.replace(" ", "T") })));
    } catch (err) {
      console.error("[useMyPendingRequests]", err);
    }
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!IS_DEMO) return;
    return onDemoChange(refresh);
  }, [refresh]);

  return { requests, refresh };
}

export async function cancelJoinRequest(listId: string, userId: string): Promise<void> {
  if (IS_DEMO) {
    const db = readDemoDb();
    db.list_members = (db.list_members ?? []).filter(m => !(m.list_id === listId && m.user_id === userId));
    localStorage.setItem("polyglot_demo_db", JSON.stringify(db));
    return;
  }
  await deleteMemberRow(listId, userId);
}

// ── useListDetail ───────────────────────────────────────

export function useListDetail(listId: string | undefined) {
  const [list, setList] = useState<List | null>(null);
  const [members, setMembers] = useState<ListMember[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!listId) {
      setList(null);
      setMembers([]);
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (IS_DEMO) {
      setList(demoGetList(listId));
      // Enrich demo members with user names
      const db = readDemoDb();
      const demoMembers = demoGetMembers(listId).map(m => {
        const u = (db.users ?? []).find(u => u.id === m.user_id);
        return { ...m, user_name: u?.name, user_lang: u?.lang, user_country: u?.country };
      });
      setMembers(demoMembers);
      const localImportant = getAllLocallyImportant();
      setItems(demoGetItems(listId).map(i => ({
        ...i,
        important: i.important || localImportant.has(i.id),
      })));
      setLoading(false);
      return;
    }

    const byList = pb.filter("list_id = {:listId}", { listId });
    const [listRes, membersRes, itemsRes] = await Promise.allSettled([
      pb.collection("lists").getOne<List>(listId),
      pb.collection("list_members").getFullList<ListMember & { expand?: { user_id?: User } }>({
        filter: byList,
        expand: "user_id",
      }),
      pb.collection("items").getFullList<Item>({ filter: byList, sort: "created_at" }),
    ]);

    if (listRes.status === "fulfilled") setList(listRes.value);
    if (membersRes.status === "fulfilled") {
      setMembers(membersRes.value.map(({ expand, ...m }) => ({
        ...m,
        user_name: expand?.user_id?.name,
        user_lang: expand?.user_id?.lang,
        user_country: expand?.user_id?.country,
        user_last_seen_at: expand?.user_id?.last_seen_at ?? undefined,
      })));
    }
    if (itemsRes.status === "fulfilled") {
      const localImportant = getAllLocallyImportant();
      setItems(itemsRes.value.map(i => ({
        ...i,
        important: i.important || localImportant.has(i.id),
      })));
    }

    setLoading(false);
  }, [listId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for demo changes
  useEffect(() => {
    if (!IS_DEMO) return;
    return onDemoChange(refresh);
  }, [refresh]);

  // Realtime subscription on items (only when not in demo mode)
  useEffect(() => {
    if (!listId || IS_DEMO) return;

    return subscribe<Item>(
      "items",
      pb.filter("list_id = {:listId}", { listId }),
      (action, record) => {
        const localImportant = getAllLocallyImportant();
        const withImportant = { ...record, important: record.important || localImportant.has(record.id) };
        if (action === "create") {
          setItems((prev) => (prev.some((i) => i.id === record.id) ? prev : [...prev, withImportant]));
        } else if (action === "update") {
          setItems((prev) => prev.map((item) => (item.id === record.id ? withImportant : item)));
        } else if (action === "delete") {
          setItems((prev) => prev.filter((item) => item.id !== record.id));
        }
      },
    );
  }, [listId]);

  return { list, setList, members, setMembers, items, setItems, loading, refresh };
}

// ── mutations ───────────────────────────────────────────

export async function createList(name: string, userId: string, country = ""): Promise<List> {
  if (IS_DEMO) {
    return { ...demoCreateList(name, userId), country };
  }

  const code = generateCode();

  // The server adds the creator as active owner and, when `country` is
  // empty, copies the creator's country (pb_hooks).
  return pb.collection("lists").create<List>({ name, code, created_by: userId, country });
}

export async function joinList(code: string, userId: string): Promise<List> {
  if (IS_DEMO) {
    return demoJoinList(code, userId);
  }

  // A non-member can't read the list, so the server looks the code up and
  // creates the membership for the signed-in user: active if the list
  // doesn't require approval, pending otherwise.
  const res = await callRoute<{ list: List; status: string; already: boolean }>("join", { code: code.toUpperCase() });
  if (res.already && res.status === "pending") {
    // JoinListModal shows "already pending" for this message.
    throw new Error("duplicate: join request already pending");
  }
  return res.list;
}

export async function renameList(listId: string, name: string): Promise<void> {
  if (IS_DEMO) {
    const db = JSON.parse(localStorage.getItem('polyglot_demo_db') ?? '{"lists":[]}');
    const idx = (db.lists ?? []).findIndex((l: { id: string }) => l.id === listId);
    if (idx >= 0) { db.lists[idx].name = name; localStorage.setItem('polyglot_demo_db', JSON.stringify(db)); }
    return;
  }
  await pb.collection("lists").update(listId, { name });
}

/** Archive / unarchive a list for me only (the server sets it on my own
 *  membership row; the other members keep seeing the list). */
export async function archiveList(listId: string, archived: boolean): Promise<void> {
  if (IS_DEMO) return;
  await pb.send("/api/babelcart/archive", { method: "POST", body: { list_id: listId, archived } });
}

/** Settings from the list screen (3.6 / 3.8). The server decides who may
 *  change what (owner-only for approval/removal settings). */
export async function updateList(
  listId: string,
  updates: Partial<Pick<List, "name" | "country" | "unavailable_policy" | "who_can_approve" | "who_can_remove" | "require_approval">>,
): Promise<void> {
  if (IS_DEMO) return;
  await pb.collection("lists").update(listId, updates);
}

export async function deleteList(listId: string): Promise<void> {
  if (IS_DEMO) {
    demoDeleteList(listId);
    return;
  }
  await pb.collection("lists").delete(listId);
}

// "Leave" button: owners delete the whole list (as before); other members
// only remove themselves, since deleting a list is owner-only on the server.
export async function exitList(listId: string, userId: string): Promise<void> {
  if (IS_DEMO) {
    demoDeleteList(listId);
    return;
  }
  const list = await pb.collection("lists").getOne<List>(listId);
  if (list.owners?.includes(userId)) await deleteList(listId);
  else await leaveList(listId, userId);
}

export async function leaveList(listId: string, userId: string): Promise<void> {
  if (IS_DEMO) {
    demoLeaveList(listId, userId);
    return;
  }
  await deleteMemberRow(listId, userId);
}

export async function approveMember(listId: string, userId: string): Promise<void> {
  if (IS_DEMO) {
    const db = readDemoDb();
    const members = db.list_members ?? [];
    const idx = members.findIndex(m => m.list_id === listId && m.user_id === userId);
    if (idx >= 0) {
      members[idx].status = "active";
      db.list_members = members;
      localStorage.setItem("polyglot_demo_db", JSON.stringify(db));
    }
    return;
  }
  const row = await findMemberRow(listId, userId);
  await pb.collection("list_members").update(row.id, { status: "active" });
}

export async function rejectMember(listId: string, userId: string): Promise<void> {
  if (IS_DEMO) {
    const db = readDemoDb();
    db.list_members = (db.list_members ?? []).filter(m => !(m.list_id === listId && m.user_id === userId));
    localStorage.setItem("polyglot_demo_db", JSON.stringify(db));
    return;
  }
  await deleteMemberRow(listId, userId);
}

// Remove an active member from a list (same implementation as rejectMember,
// kept as a separate export to make intent explicit at call sites)
export const removeMember = rejectMember;
