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
      setMembers(demoGetMembers(listId));
      setItems(demoGetItems(listId));
      setLoading(false);
      return;
    }

    const [listRes, membersRes, itemsRes] = await Promise.all([
      supabase.from("lists").select("*").eq("id", listId).single(),
      supabase.from("list_members").select("*").eq("list_id", listId),
      supabase.from("items").select("*").eq("list_id", listId).order("created_at", { ascending: true }),
    ]);

    if (!listRes.error && listRes.data) setList(listRes.data as List);
    if (!membersRes.error && membersRes.data) setMembers(membersRes.data as ListMember[]);
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
