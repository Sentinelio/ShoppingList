import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useListDetail, exitList, approveMember, rejectMember, removeMember } from "../hooks/useList";
import { toggleItem, updateItem, deleteItem } from "../hooks/useItems";
import { logItemHistory, logAutoPurchase, removeRecentAutoPurchase } from "../lib/itemData";
import { setLocallyImportant } from "../lib/importantStore";
import { t } from "../data/i18n";
import { CATEGORY_ORDER } from "../data/categories";
import { getCountryFlag } from "../data/countries";
import { getLangFlag, getLangName } from "../data/langs";
import { copyToClipboard } from "../lib/clipboard";
import { listLangOf, categoryNames, primaryName, secondaryName } from "../lib/names";
import { matchesSearch } from "../lib/highlight";
import type { Item } from "../lib/pocketbase";
import ItemRow from "../components/items/ItemRow";
import AddItemSheet from "../components/items/AddItemSheet";
import ItemDetail from "../components/items/ItemDetail";
import StoreMode from "../components/store/StoreMode";
import BottomNav, { type ListTab } from "../components/list/BottomNav";
import Modal from "../components/ui/Modal";
import Avatar from "../components/ui/Avatar";
import ImportReceiptModal from "../components/receipts/ImportReceiptModal";
import { IconBack, IconCamera, IconChevronDown, IconClose, IconMore, IconSearch, IconShare } from "../components/ui/icons";

interface ListDetailPageProps {
  listId: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

type Filter = "pending" | "bought" | "unavailable";

interface CategoryGroup {
  key: string;
  name: string;
  nameMine: string;
  items: Item[];
}

const statusOf = (i: Item): Filter => (i.unavailable ? "unavailable" : i.checked ? "bought" : "pending");

// Important first; otherwise keep the order they were added in.
const sortByImportance = (arr: Item[]) =>
  [...arr].sort((a, b) => (!!b.important === !!a.important ? 0 : b.important ? 1 : -1));

export default function ListDetailPage({ listId, onNavigate }: ListDetailPageProps) {
  const { user } = useAuth();
  const userLang = user?.lang ?? "en";
  const lang = userLang;

  const { list, members, setMembers, items, setItems, loading, refresh } = useListDetail(listId);
  // Primary language of every name in this list: the list country's.
  const shelfLang = listLangOf(list, user?.country);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const editingItem = editingItemId ? items.find(i => i.id === editingItemId) ?? null : null;
  const [storeItem, setStoreItem] = useState<Item | null>(null);
  const [tab, setTab] = useState<ListTab>("list");
  const [filter, setFilter] = useState<Filter>("pending");
  const [showAdd, setShowAdd] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Collapsed categories, remembered per user and per list.
  const collapsedKey = `babelcart_collapsed_${user?.id ?? "anon"}_${listId}`;
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(collapsedKey);
      setCollapsedCategories(raw ? new Set(JSON.parse(raw) as string[]) : new Set());
    } catch {
      setCollapsedCategories(new Set());
    }
  }, [collapsedKey]);
  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      try { localStorage.setItem(collapsedKey, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };

  const [confirmClear, setConfirmClear] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<string | null>(null);
  const [confirmRejectPending, setConfirmRejectPending] = useState<string | null>(null);
  const [showListSettings, setShowListSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [showImportReceipt, setShowImportReceipt] = useState(false);

  const activeMembers = members.filter(m => m.status === "active");
  const pendingMembers = members.filter(m => m.status === "pending");

  // Counts per status. "No hay" items don't count in the progress total, so
  // the bar fills up once everything that could be bought is in the cart.
  const counts = useMemo(() => {
    const c = { pending: 0, bought: 0, unavailable: 0 };
    for (const i of items) c[statusOf(i)]++;
    return c;
  }, [items]);
  const progressTotal = counts.pending + counts.bought;
  const progressPct = progressTotal ? Math.round((counts.bought / progressTotal) * 100) : 0;

  const categoryGroups = useMemo<CategoryGroup[]>(() => {
    const grouped: Record<string, Item[]> = {};
    for (const item of items) {
      if (statusOf(item) !== filter) continue;
      const cat = item.category || "other";
      (grouped[cat] ??= []).push(item);
    }
    const order = [...CATEGORY_ORDER, ...Object.keys(grouped).filter(c => !CATEGORY_ORDER.includes(c))];
    return order.filter(cat => grouped[cat]?.length).map(cat => {
      const names = categoryNames(cat, shelfLang, userLang);
      return { key: cat, name: names.primary, nameMine: names.secondary, items: sortByImportance(grouped[cat]) };
    });
  }, [items, filter, shelfLang, userLang]);

  // 3.1.1 — search matches either of the two names shown (or the original).
  const searchResults = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    return items.filter(i =>
      matchesSearch(primaryName(i, shelfLang), q) ||
      matchesSearch(secondaryName(i, shelfLang, userLang), q) ||
      matchesSearch(i.original, q),
    );
  }, [items, searchQuery, shelfLang, userLang]);

  const handleToggle = useCallback(async (itemId: string, checked: boolean) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, checked, checked_at: checked ? new Date().toISOString() : null } : i));
    try { await toggleItem(itemId, checked); } catch { /* realtime will sync */ }
    if (user) {
      // Log history event
      logItemHistory({
        itemId,
        eventType: checked ? "purchased" : "unpurchased",
        icon: checked ? "✅" : "🔄",
        description: checked ? `${user.name} marcó como comprado` : `${user.name} desmarcó`,
        byUserId: user.id,
        byUserName: user.name,
      }).catch(err => console.error("[logItemHistory:purchased]", err));
      // Auto-log purchase for stats (only when checking, not unchecking)
      if (checked) {
        logAutoPurchase({ itemId, byUserId: user.id, byUserName: user.name }).catch(err => console.error("[logAutoPurchase]", err));
      } else {
        // If user immediately unchecks, remove the recent auto-purchase
        removeRecentAutoPurchase({ itemId, byUserId: user.id }).catch(err => console.error("[removeRecentAutoPurchase]", err));
      }
    }
  }, [setItems, user]);

  const handleUpdate = useCallback(async (
    itemId: string,
    updates: Partial<Pick<Item, "qty" | "unit" | "note" | "photo" | "important" | "original" | "translations" | "brand" | "checked_at">>,
  ) => {
    // Capture previous state for diff
    const prevItem = items.find(i => i.id === itemId);
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...updates } : i));
    if ("important" in updates && typeof updates.important === "boolean") {
      setLocallyImportant(itemId, updates.important);
    }
    try { await updateItem(itemId, updates); } catch { /* realtime will sync */ }

    // Log history events for changes
    if (prevItem && user) {
      const byUserId = user.id;
      const byUserName = user.name;
      const tasks: Promise<unknown>[] = [];
      if ("qty" in updates && updates.qty !== prevItem.qty) {
        tasks.push(logItemHistory({ itemId, eventType: "qty_changed", icon: "✏️", description: `${byUserName} cambió cantidad: ${prevItem.qty || "—"} → ${updates.qty || "—"}`, byUserId, byUserName }));
      }
      if ("unit" in updates && updates.unit !== prevItem.unit) {
        tasks.push(logItemHistory({ itemId, eventType: "unit_changed", icon: "📏", description: `${byUserName} cambió unidad a ${updates.unit || "—"}`, byUserId, byUserName }));
      }
      if ("note" in updates && updates.note !== prevItem.note) {
        tasks.push(logItemHistory({ itemId, eventType: "note_changed", icon: "📝", description: updates.note ? `${byUserName} actualizó la nota` : `${byUserName} eliminó la nota`, byUserId, byUserName }));
      }
      if ("important" in updates && updates.important !== prevItem.important) {
        tasks.push(logItemHistory({ itemId, eventType: "important", icon: "❗", description: updates.important ? `${byUserName} marcó como importante` : `${byUserName} desmarcó importante`, byUserId, byUserName }));
      }
      if ("photo" in updates && updates.photo !== prevItem.photo) {
        tasks.push(logItemHistory({ itemId, eventType: "photo", icon: "📷", description: updates.photo ? `${byUserName} añadió foto` : `${byUserName} quitó foto`, byUserId, byUserName }));
      }
      if ("original" in updates && updates.original !== prevItem.original) {
        tasks.push(logItemHistory({ itemId, eventType: "name_changed", icon: "📝", description: `${byUserName} renombró "${prevItem.original}" → "${updates.original}"`, byUserId, byUserName }));
      }
      Promise.all(tasks).catch(err => console.error("[logItemHistory:update]", err));
    }
  }, [setItems, items, user]);

  const handleDelete = useCallback(async (itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
    setEditingItemId(null);
    try { await deleteItem(itemId); } catch { /* realtime will sync */ }
  }, [setItems]);


  const openItem = useCallback((item: Item) => {
    setEditingItemId(item.id);
  }, []);

  const closeSearch = () => {
    setSearching(false);
    setSearchQuery("");
  };

  // Store and Members open their current screens until phase 4 turns them
  // into real tabs.
  const openTab = (next: ListTab) => {
    if (next === "store") {
      const first = sortByImportance(items.filter(i => statusOf(i) === "pending"))[0];
      if (first) setStoreItem(first);
      return;
    }
    if (next === "members") {
      setShowMembers(true);
      return;
    }
    setTab(next);
  };

  const countryFlag = list ? getCountryFlag(list.country || user?.country || "") : "";
  const checkedItems = items.filter(i => statusOf(i) === "bought");

  if (storeItem) {
    return (
      <StoreMode
        item={storeItem}
        shelfLang={shelfLang}
        userLang={userLang}
        onClose={() => setStoreItem(null)}
      />
    );
  }

  const iconBtn = "shrink-0 w-11 h-11 flex items-center justify-center rounded-full text-text-soft active:bg-white/5 cursor-pointer";
  const filters: Array<{ id: Filter; label: string }> = [
    { id: "pending", label: t(lang, "filterToBuy") },
    { id: "bought", label: t(lang, "filterBought") },
    { id: "unavailable", label: t(lang, "filterUnavailable") },
  ];

  return (
    <div className="fixed inset-0 bg-bg flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Top bar — becomes a search field in search mode (3.1.1) */}
      <header className="shrink-0 h-14 flex items-center gap-0.5 px-1.5">
        {searching ? (
          <>
            <button onClick={closeSearch} className={iconBtn} aria-label={t(lang, "back")}><IconBack /></button>
            <div className="flex-1 min-w-0 relative">
              <input
                autoFocus
                type="text"
                inputMode="search"
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") closeSearch(); }}
                placeholder={t(lang, "searchInList")}
                aria-label={t(lang, "search")}
                className="w-full h-10 pl-3.5 pr-11 rounded-full bg-card border border-border-light text-text text-[16px] placeholder:text-text-muted outline-none focus:border-accent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-text-soft cursor-pointer"
                  aria-label={t(lang, "clear")}
                >
                  <IconClose size={18} />
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <button onClick={() => onNavigate("lists")} className={iconBtn} aria-label={t(lang, "back")}><IconBack /></button>
            <h1 className="flex-1 min-w-0 truncate text-[20px] font-bold text-text px-1">{list?.name ?? "…"}</h1>
            <button onClick={() => setSearching(true)} className={iconBtn} aria-label={t(lang, "search")}><IconSearch size={22} /></button>
            <button onClick={() => setShowImportReceipt(true)} className={iconBtn} aria-label={t(lang, "importReceipt")}><IconCamera size={22} /></button>
            <button onClick={() => setShowMembers(true)} className={iconBtn} aria-label={t(lang, "share")}><IconShare size={22} /></button>
            <button onClick={() => setShowListSettings(true)} className={iconBtn} aria-label={t(lang, "more")}><IconMore size={22} /></button>
          </>
        )}
      </header>

      {searching ? (
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {searchQuery.trim() && (
            <div className="text-[12px] text-text-muted px-1 pt-1 pb-2">
              {searchResults.length === 0
                ? t(lang, "noSearchResults")
                : `${searchResults.length} ${searchResults.length === 1 ? t(lang, "result") : t(lang, "results")}`}
            </div>
          )}
          {searchResults.length > 0 && (
            <div className="rounded-[14px] bg-card divide-y divide-border overflow-hidden">
              {searchResults.map(item => (
                <ItemRow key={item.id} item={item} listLang={shelfLang} userLang={userLang} query={searchQuery} onToggle={handleToggle} onOpen={openItem} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Fixed: compact progress + filters. Only the categories scroll. */}
          <div className="shrink-0 px-4 pb-2">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="text-text-soft">
                {t(lang, "inCart").replace("{done}", String(counts.bought)).replace("{total}", String(progressTotal))}
              </span>
              <span className="font-semibold tabular-nums" style={{ color: "var(--color-accent-ink)" }}>{progressPct}%</span>
            </div>
            <div className="mt-1.5 h-[5px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%`, background: "var(--color-accent)" }} />
            </div>
          </div>
          <div className="shrink-0 flex gap-1.5 px-3 pb-2" role="tablist">
            {filters.map(f => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f.id)}
                  className="flex-1 min-w-0 h-8 rounded-full text-[12.5px] font-semibold truncate px-2 cursor-pointer transition-colors"
                  style={{
                    background: active ? "var(--color-accent-soft)" : "var(--color-card)",
                    color: active ? "var(--color-accent-ink)" : "var(--color-text-soft)",
                  }}
                >
                  {f.label} {counts[f.id]}
                </button>
              );
            })}
          </div>

          <main className="flex-1 overflow-y-auto px-3 pb-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-text-muted animate-pulse">{t(lang, "translating")}</p>
              </div>
            ) : categoryGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="text-5xl mb-3 opacity-40">{filter === "pending" && items.length > 0 ? "🎉" : "🛒"}</div>
                <p className="text-text-soft font-medium">
                  {filter === "pending" && items.length > 0 ? t(lang, "allBought") : t(lang, "emptyFilter")}
                </p>
              </div>
            ) : (
              categoryGroups.map(group => {
                const collapsed = collapsedCategories.has(group.key);
                return (
                  <section key={group.key} className="mb-3">
                    <button
                      onClick={() => toggleCategory(group.key)}
                      aria-expanded={!collapsed}
                      className="w-full min-h-[44px] flex items-center gap-2 px-1 cursor-pointer"
                    >
                      <span className="text-[14px] font-bold truncate" style={{ color: "var(--color-accent)" }}>{group.name}</span>
                      {group.nameMine && (
                        <span className="text-[12px] truncate" style={{ color: "var(--color-secondary-name)" }}>{group.nameMine}</span>
                      )}
                      <span className="flex-1" />
                      <span className="text-[12px] text-text-muted tabular-nums">{group.items.length}</span>
                      <IconChevronDown size={18} className={`text-text-muted transition-transform ${collapsed ? "-rotate-90" : ""}`} />
                    </button>
                    {!collapsed && (
                      <div className="rounded-[14px] bg-card divide-y divide-border overflow-hidden">
                        {group.items.map(item => (
                          <ItemRow key={item.id} item={item} listLang={shelfLang} userLang={userLang} onToggle={handleToggle} onOpen={openItem} />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })
            )}
          </main>
        </>
      )}

      <BottomNav tab={tab} onTab={openTab} onAdd={() => setShowAdd(true)} lang={lang} pendingCount={pendingMembers.length} />

      {user && (
        <AddItemSheet
          open={showAdd}
          onClose={() => setShowAdd(false)}
          listId={listId}
          userLang={userLang}
          shelfLang={shelfLang}
          userId={user.id}
          userName={user.name}
          onItemAdded={(newItem) => {
            if (newItem && user) {
              logItemHistory({
                itemId: newItem.id,
                eventType: "created",
                icon: "➕",
                description: `${user.name} añadió ${newItem.original} a la lista`,
                byUserId: user.id,
                byUserName: user.name,
              }).catch(err => console.error("[logItemHistory:created]", err));
            }
          }}
        />
      )}

      {/* Item detail modal */}
      <ItemDetail
        item={editingItem}
        open={editingItem !== null}
        onClose={() => setEditingItemId(null)}
        userLang={userLang}
        shelfLang={shelfLang}
        countryFlag={countryFlag}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onShowStore={setStoreItem}
      />

      {/* Members modal */}
      <Modal open={showMembers} onClose={() => setShowMembers(false)}>
        <h3 className="text-lg font-bold mb-4">👥 {t(lang, "people")}</h3>
        {activeMembers.map((m, i) => {
          const isMe = m.user_id === user?.id;
          const isCreator = user?.id === list?.created_by;
          const canRemove = !isMe && (isCreator || list?.who_can_remove === "any_member");
          const isConfirming = confirmRemoveMember === m.user_id;
          return (
            <div key={m.user_id} className="flex items-center gap-3 py-2.5 border-b border-border">
              <Avatar name={m.user_name || m.user_id.slice(0, 4)} index={i} size={32} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{m.user_name || m.user_id.slice(0, 6)}</div>
                <div className="text-text-muted text-xs">
                  {m.user_lang && <>{getLangFlag(m.user_lang)} {getLangName(m.user_lang)}</>}
                  {m.user_country && <> · {getCountryFlag(m.user_country)}</>}
                  {m.user_last_seen_at && <> · {(() => {
                    const diff = Date.now() - new Date(m.user_last_seen_at).getTime();
                    const mins = Math.floor(diff / 60000);
                    if (mins < 1) return "online";
                    if (mins < 60) return `hace ${mins}m`;
                    const hours = Math.floor(mins / 60);
                    if (hours < 24) return `hace ${hours}h`;
                    const days = Math.floor(hours / 24);
                    return `hace ${days}d`;
                  })()}</>}
                </div>
              </div>
              {isMe && (
                <span className="text-[10px] font-semibold text-accent px-2 py-1 rounded-lg" style={{ background: "rgba(240,136,62,0.1)" }}>{t(lang, "you")}</span>
              )}
              {canRemove && (
                <button
                  onClick={() => {
                    if (isConfirming) {
                      setMembers(prev => prev.filter(x => x.user_id !== m.user_id));
                      setConfirmRemoveMember(null);
                      removeMember(listId, m.user_id).catch(() => { /* realtime will sync */ });
                    } else {
                      setConfirmRemoveMember(m.user_id);
                      setTimeout(() => setConfirmRemoveMember(prev => prev === m.user_id ? null : prev), 3000);
                    }
                  }}
                  className="px-2 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer shrink-0"
                  style={{
                    background: isConfirming ? "#b71c1c" : "rgba(255,92,92,0.08)",
                    color: isConfirming ? "#fff" : "#ff5c5c",
                    border: isConfirming ? "1px solid #b71c1c" : "1px solid rgba(255,92,92,0.15)",
                  }}
                >
                  {isConfirming ? "⚠️ Confirm" : "Remove"}
                </button>
              )}
            </div>
          );
        })}
        <div className="mt-4 rounded-xl p-4 text-center" style={{ background: "rgba(240,136,62,0.06)", border: "1px solid rgba(240,136,62,0.2)" }}>
          <div className="text-text-muted text-xs mb-1.5">{t(lang, "shareCode")}</div>
          <div className="text-2xl font-extrabold font-mono tracking-widest text-accent">{list?.code ?? ""}</div>
        </div>
        <button
          onClick={() => {
            copyToClipboard(list?.code ?? "").then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
          }}
          className="w-full mt-3 py-3 rounded-xl font-semibold cursor-pointer active:brightness-90 text-white"
          style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}
        >
          {copied ? `✓ ${t(lang, "copied")}` : `📋 ${t(lang, "copyCode")}`}
        </button>
        {/* Pending requests */}
        {pendingMembers.length > 0 && (
          <div className="mt-4">
            <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">
              {t(lang, "pendingReqs")} ({pendingMembers.length})
            </div>
            {pendingMembers.map((m, i) => (
              <div key={m.user_id} className="flex items-center gap-3 py-2.5 border-b border-border">
                <Avatar name={m.user_name || m.user_id.slice(0, 4)} index={activeMembers.length + i} size={32} />
                <div className="flex-1">
                  <div className="font-semibold text-sm">{m.user_name || m.user_id.slice(0, 8)}</div>
                  <div className="text-text-muted text-xs">{t(lang, "waitingApproval")}</div>
                </div>
                <button
                  onClick={async () => {
                    // Optimistic: update status immediately
                    setMembers(prev => prev.map(x => x.user_id === m.user_id ? { ...x, status: "active" as const } : x));
                    try { await approveMember(listId, m.user_id); } catch { /* realtime will sync */ }
                    refresh();
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{ background: "rgba(61,214,140,0.1)", color: "#3dd68c", border: "1px solid rgba(61,214,140,0.2)" }}
                >
                  {t(lang, "accept")}
                </button>
                {(() => {
                  const isConfirmingReject = confirmRejectPending === m.user_id;
                  return (
                    <button
                      onClick={async () => {
                        if (!isConfirmingReject) {
                          setConfirmRejectPending(m.user_id);
                          setTimeout(() => setConfirmRejectPending(prev => prev === m.user_id ? null : prev), 3000);
                          return;
                        }
                        setConfirmRejectPending(null);
                        // Optimistic: remove immediately
                        setMembers(prev => prev.filter(x => x.user_id !== m.user_id));
                        try { await rejectMember(listId, m.user_id); } catch { /* realtime will sync */ }
                        refresh();
                      }}
                      className="px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
                      style={{
                        background: isConfirmingReject ? "#b71c1c" : "rgba(255,92,92,0.08)",
                        color: isConfirmingReject ? "#fff" : "#ff5c5c",
                        border: isConfirmingReject ? "1px solid #b71c1c" : "1px solid rgba(255,92,92,0.2)",
                      }}
                      aria-label={isConfirmingReject ? t(lang, "confirm") : t(lang, "removeMember")}
                    >
                      {isConfirmingReject ? `⚠️ ${t(lang, "confirm") || "Confirm"}` : "✕"}
                    </button>
                  );
                })()}
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setShowMembers(false)} className="w-full mt-3 py-3 rounded-xl border border-border-light text-text-soft font-medium cursor-pointer active:bg-card">{t(lang, "close")}</button>
      </Modal>

      {/* List settings modal */}
      <Modal open={showListSettings} onClose={() => setShowListSettings(false)}>
        <h3 className="text-lg font-bold mb-4">⚙️ {t(lang, "settings")}</h3>
        <div className="mb-4">
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block">{t(lang, "name")}</label>
          <input
            defaultValue={list?.name ?? ""}
            className="w-full py-3 px-4 bg-bg border border-border-light rounded-xl text-text outline-none focus:border-accent"
          />
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: "rgba(240,136,62,0.06)", border: "1px solid rgba(240,136,62,0.2)" }}>
          <div className="text-text-muted text-xs mb-1.5">{t(lang, "shareCode")}</div>
          <div className="text-2xl font-extrabold font-mono tracking-widest text-accent">{list?.code ?? ""}</div>
        </div>
        <button
          onClick={() => {
            copyToClipboard(list?.code ?? "").then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
          }}
          className="w-full mt-3 py-3 rounded-xl font-semibold cursor-pointer active:brightness-90 text-white"
          style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}
        >
          {copied ? `✓ ${t(lang, "copied")}` : `📋 ${t(lang, "copyCode")}`}
        </button>
        {checkedItems.length > 0 && (
          <button
            onClick={() => {
              if (confirmClear) {
                checkedItems.forEach(i => handleDelete(i.id));
                setConfirmClear(false);
              } else {
                setConfirmClear(true);
                setTimeout(() => setConfirmClear(false), 3000);
              }
            }}
            className="w-full mt-3 py-3 rounded-xl font-semibold text-sm cursor-pointer"
            style={{
              background: confirmClear ? "#b71c1c" : "rgba(255,92,92,0.08)",
              color: confirmClear ? "#fff" : "#ff5c5c",
              border: confirmClear ? "1px solid #b71c1c" : "1px solid rgba(255,92,92,0.15)",
            }}
          >
            {confirmClear ? "⚠️ Borrar todos?" : `🗑️ Borrar ${checkedItems.length} comprados`}
          </button>
        )}
        <button
          onClick={async () => {
            if (confirmLeave) {
              try { if (user) await exitList(listId, user.id); } catch { /* realtime will sync */ }
              setConfirmLeave(false);
              setShowListSettings(false);
              onNavigate("lists");
            } else {
              setConfirmLeave(true);
              setTimeout(() => setConfirmLeave(false), 3000);
            }
          }}
          className="w-full mt-3 py-3 rounded-xl font-semibold text-sm cursor-pointer"
          style={{
            background: confirmLeave ? "#b71c1c" : "rgba(255,92,92,0.08)",
            color: confirmLeave ? "#fff" : "#ff5c5c",
            border: confirmLeave ? "1px solid #b71c1c" : "1px solid rgba(255,92,92,0.15)",
          }}
        >
          {confirmLeave ? `⚠️ ${t(lang, "confirm") || "Confirm"}` : `🚪 ${t(lang, "leave")}`}
        </button>
        <button onClick={() => setShowListSettings(false)} className="w-full mt-2 py-3 rounded-xl border border-border-light text-text-soft font-medium cursor-pointer active:bg-card">{t(lang, "close")}</button>
      </Modal>

      {/* Import receipt modal */}
      {user && (
        <ImportReceiptModal
          open={showImportReceipt}
          onClose={() => setShowImportReceipt(false)}
          listId={listId}
          items={items}
          userLang={userLang}
          shelfLang={shelfLang}
          userId={user.id}
          userName={user.name}
          onApplied={() => refresh()}
        />
      )}
    </div>
  );
}
