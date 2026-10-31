// In-app notifications: load, live updates, read / delete, and the sentence
// for each type in the user's language (the server stores type + params).

import { useCallback, useEffect, useState } from "react";
import { pb, IS_DEMO } from "./pocketbase";
import { t, type TranslationKey } from "../data/i18n";

export interface AppNotification {
  id: string;
  type: string;
  params: Record<string, unknown>;
  list_id: string;
  read_at: string;
  created_at: string;
  updated_at: string;
}

// Types users can turn off, grouped as the settings show them. The rest
// (admin messages, inactivity warnings) are always on.
export const OPTIONAL_PREFS: { key: TranslationKey; types: string[] }[] = [
  { key: "prefItemsAdded", types: ["items_added"] },
  { key: "prefJoinRequest", types: ["join_request"] },
  { key: "prefMemberJoined", types: ["member_joined"] },
  { key: "prefJoinResult", types: ["join_approved", "join_rejected"] },
  { key: "prefRemoved", types: ["removed_from_list"] },
  { key: "prefListDeleted", types: ["list_deleted"] },
];
export const ALWAYS_ON_PREFS: TranslationKey[] = ["prefAdminMessages", "prefInactivity"];

const ICONS: Record<string, string> = {
  items_added: "🛒", join_request: "🙋", member_joined: "👋", join_approved: "✅", join_rejected: "🚫",
  removed_from_list: "🚪", list_deleted: "🗑️", admin_message: "📣", inactive_list: "⏳", inactive_user: "⏳",
};

const fill = (template: string, params: Record<string, unknown>) =>
  template.replace(/\{(\w+)\}/g, (_, k) => (params[k] === undefined ? "" : String(params[k])));

// A string, or { en: "...", es: "..." } → the user's language, then English.
function pickLang(v: unknown, lang: string): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const m = v as Record<string, string>;
    return m[lang] ?? m.en ?? Object.values(m)[0] ?? "";
  }
  return "";
}

export function renderNotification(lang: string, n: AppNotification): { icon: string; title: string; body?: string } {
  const p = n.params ?? {};
  const icon = ICONS[n.type] ?? "🔔";
  switch (n.type) {
    case "items_added": {
      const count = Number(p.count ?? 1);
      const names = Array.isArray(p.names) ? (p.names as string[]) : [];
      return count <= 1
        ? { icon, title: fill(t(lang, "nItemsAddedOne"), { ...p, item: names[0] ?? "" }) }
        : { icon, title: fill(t(lang, "nItemsAddedMany"), p), body: names.join(", ") + (count > names.length ? "…" : "") };
    }
    case "join_request": return { icon, title: fill(t(lang, "nJoinRequest"), p) };
    case "member_joined": return { icon, title: fill(t(lang, "nMemberJoined"), p) };
    case "join_approved": return { icon, title: fill(t(lang, "nJoinApproved"), p) };
    case "join_rejected": return { icon, title: fill(t(lang, "nJoinRejected"), p) };
    case "removed_from_list": return { icon, title: fill(t(lang, "nRemoved"), p) };
    case "list_deleted": return { icon, title: fill(t(lang, "nListDeleted"), p) };
    case "admin_message": {
      const title = pickLang(p.title, lang);
      const body = pickLang(p.body, lang);
      return { icon, title: title || body, body: title ? body : undefined };
    }
    default: return { icon, title: n.type };
  }
}

// Notifications whose list the user can still open.
export function opensList(n: AppNotification): boolean {
  return !!n.list_id && ["items_added", "join_request", "member_joined", "join_approved"].includes(n.type);
}

export function useNotifications(userId: string | undefined) {
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = useCallback(async () => {
    if (!userId || IS_DEMO) return;
    try {
      const res = await pb.collection("notifications").getList<AppNotification>(1, 50, { sort: "-updated_at" });
      setItems(res.items);
    } catch (err) {
      console.error("[notifications] load", err);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || IS_DEMO) return;
    void load();
    let unsub: (() => void) | undefined;
    let alive = true;
    pb.collection("notifications").subscribe("*", () => { void load(); })
      .then(fn => { if (alive) unsub = fn; else void fn(); })
      .catch(err => console.error("[notifications] realtime", err));
    const onVisible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { alive = false; unsub?.(); document.removeEventListener("visibilitychange", onVisible); };
  }, [userId, load]);

  const markRead = useCallback(async (ids: string[]) => {
    const now = new Date().toISOString();
    setItems(prev => prev.map(n => (ids.includes(n.id) ? { ...n, read_at: now } : n)));
    await Promise.allSettled(ids.map(id => pb.collection("notifications").update(id, { read_at: now })));
  }, []);

  const remove = useCallback(async (id: string) => {
    setItems(prev => prev.filter(n => n.id !== id));
    await pb.collection("notifications").delete(id).catch(err => console.error("[notifications] delete", err));
  }, []);

  return { items, unread: items.filter(n => !n.read_at).length, markRead, remove, reload: load };
}
