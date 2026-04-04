import { useState, useEffect, useCallback } from "react";
import { supabase, IS_DEMO, type List, type ListMember, type Item } from "../lib/supabase";
import {
  demoGetLists, demoCreateList, demoGetList, demoJoinList,
  demoDeleteList, demoLeaveList, demoGetMembers, demoGetItems, onDemoChange,
} from "../lib/demoStore";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ── helpers ─────────────────────────────────────────────

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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

    const { data, error } = await supabase
      .from("list_members")
      .select("list_id, lists(*)")
      .eq("user_id", userId)
      .eq("status", "active");

    if (!error && data) {
      const fetched = data
        .map((row: any) => row.lists as List)
        .filter(Boolean);
      setLists(fetched);
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
      const db = JSON.parse(localStorage.getItem('polyglot_demo_db') ?? '{"list_members":[],"lists":[]}');
      const pending = (db.list_members ?? [])
        .filter((m: any) => m.user_id === userId && m.status === 'pending')
        .map((m: any) => {
          const list = (db.lists ?? []).find((l: any) => l.id === m.list_id);
          return { list_id: m.list_id, list_name: list?.name ?? '?', list_code: list?.code ?? '', status: m.status, joined_at: m.joined_at };
        });
      setRequests(pending);
      return;
    }

    const { data } = await supabase
      .from("list_members")
      .select("list_id, status, joined_at, lists(name, code)")
      .eq("user_id", userId)
      .eq("status", "pending");

    if (data) {
      setRequests(data.map((r: any) => ({
        list_id: r.list_id,
        list_name: r.lists?.name ?? '?',
        list_code: r.lists?.code ?? '',
        status: r.status,
        joined_at: r.joined_at,
      })));
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
    const db = JSON.parse(localStorage.getItem('polyglot_demo_db') ?? '{"list_members":[]}');
    db.list_members = (db.list_members ?? []).filter((m: any) => !(m.list_id === listId && m.user_id === userId));
    localStorage.setItem('polyglot_demo_db', JSON.stringify(db));
    return;
  }
  const { error } = await supabase
    .from("list_members")
    .delete()
    .eq("list_id", listId)
    .eq("user_id", userId);
  if (error) throw error;
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
      const demoMembers = demoGetMembers(listId).map(m => {
        const db = JSON.parse(localStorage.getItem('polyglot_demo_db') ?? '{"users":[]}');
        const u = (db.users ?? []).find((u: any) => u.id === m.user_id);
        return { ...m, user_name: u?.name, user_lang: u?.lang, user_country: u?.country };
      });
      setMembers(demoMembers);
      setItems(demoGetItems(listId));
      setLoading(false);
      return;
    }

    const [listRes, membersRes, itemsRes] = await Promise.all([
      supabase.from("lists").select("*").eq("id", listId).single(),
      supabase.from("list_members").select("*, users(name, lang, country)").eq("list_id", listId),
      supabase.from("items").select("*").eq("list_id", listId).order("created_at", { ascending: true }),
    ]);

    if (!listRes.error && listRes.data) setList(listRes.data as List);
    if (!membersRes.error && membersRes.data) {
      setMembers((membersRes.data as any[]).map(m => ({
        ...m,
        user_name: m.users?.name,
        user_lang: m.users?.lang,
        user_country: m.users?.country,
      })));
    }
    if (!itemsRes.error && itemsRes.data) setItems(itemsRes.data as Item[]);

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

    const channel: RealtimeChannel = supabase
      .channel(`items:${listId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "items", filter: `list_id=eq.${listId}` },
        (payload) => {
          setItems((prev) => [...prev, payload.new as Item]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "items", filter: `list_id=eq.${listId}` },
        (payload) => {
          setItems((prev) =>
            prev.map((item) => (item.id === (payload.new as Item).id ? (payload.new as Item) : item)),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "items", filter: `list_id=eq.${listId}` },
        (payload) => {
          setItems((prev) => prev.filter((item) => item.id !== (payload.old as Partial<Item>).id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listId]);

  return { list, members, items, loading, refresh };
}

// ── mutations ───────────────────────────────────────────

export async function createList(name: string, userId: string): Promise<List> {
  if (IS_DEMO) {
    return demoCreateList(name, userId);
  }

  const code = generateCode();

  const { data, error } = await supabase
    .from("lists")
    .insert({ name, code, created_by: userId })
    .select()
    .single();

  if (error) throw error;

  const newList = data as List;

  const { error: memberError } = await supabase
    .from("list_members")
    .insert({ list_id: newList.id, user_id: userId, role: "owner", status: "active" });

  if (memberError) throw memberError;

  return newList;
}

export async function joinList(code: string, userId: string): Promise<List> {
  if (IS_DEMO) {
    return demoJoinList(code, userId);
  }

  const { data, error } = await supabase
    .from("lists")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();

  if (error || !data) throw error ?? new Error("List not found");

  const list = data as List;

  const { error: memberError } = await supabase
    .from("list_members")
    .insert({ list_id: list.id, user_id: userId, role: "member", status: "pending" });

  if (memberError) throw memberError;

  return list;
}

export async function deleteList(listId: string): Promise<void> {
  if (IS_DEMO) {
    demoDeleteList(listId);
    return;
  }
  const { error } = await supabase.from("lists").delete().eq("id", listId);
  if (error) throw error;
}

export async function leaveList(listId: string, userId: string): Promise<void> {
  if (IS_DEMO) {
    demoLeaveList(listId, userId);
    return;
  }
  const { error } = await supabase
    .from("list_members")
    .delete()
    .eq("list_id", listId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function approveMember(listId: string, userId: string): Promise<void> {
  if (IS_DEMO) {
    const db = JSON.parse(localStorage.getItem('polyglot_demo_db') ?? '{"list_members":[]}');
    const idx = (db.list_members ?? []).findIndex((m: any) => m.list_id === listId && m.user_id === userId);
    if (idx >= 0) { db.list_members[idx].status = 'active'; localStorage.setItem('polyglot_demo_db', JSON.stringify(db)); }
    return;
  }
  const { error } = await supabase
    .from("list_members")
    .update({ status: "active" })
    .eq("list_id", listId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function rejectMember(listId: string, userId: string): Promise<void> {
  if (IS_DEMO) {
    const db = JSON.parse(localStorage.getItem('polyglot_demo_db') ?? '{"list_members":[]}');
    db.list_members = (db.list_members ?? []).filter((m: any) => !(m.list_id === listId && m.user_id === userId));
    localStorage.setItem('polyglot_demo_db', JSON.stringify(db));
    return;
  }
  const { error } = await supabase
    .from("list_members")
    .delete()
    .eq("list_id", listId)
    .eq("user_id", userId);
  if (error) throw error;
}
