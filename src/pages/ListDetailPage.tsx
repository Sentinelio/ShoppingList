import { useState, useMemo, useEffect, useCallback } from "react";
import { useThemeView } from "../lib/themeStore";
import { useAuth } from "../hooks/useAuth";
import { useListDetail, exitList, approveMember, rejectMember, removeMember, updateList, archiveList } from "../hooks/useList";
import { toggleItem, updateItem, deleteItem } from "../hooks/useItems";
import { logItemHistory, logAutoPurchase, removeRecentAutoPurchase } from "../lib/itemData";
import { setLocallyImportant } from "../lib/importantStore";
import { t } from "../data/i18n";
import { CATEGORY_ORDER } from "../data/categories";
import { getCountryFlag } from "../data/countries";
import { listLangOf, categoryNames, primaryName, secondaryName } from "../lib/names";
import { matchesSearch } from "../lib/highlight";
import type { Item } from "../lib/pocketbase";
import ItemRow from "../components/items/ItemRow";
import AddItemSheet from "../components/items/AddItemSheet";
import ItemDetail from "../components/items/ItemDetail";
import BottomNav, { type ListTab } from "../components/list/BottomNav";
import StoreTab from "../components/list/StoreTab";
import MembersTab from "../components/list/MembersTab";
import ShareSheet from "../components/list/ShareSheet";
import ListMenu from "../components/list/ListMenu";
import ListSettingsSheet from "../components/list/ListSettingsSheet";
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

  const { list, setList, members, setMembers, items, setItems, loading, refresh } = useListDetail(listId);
  // Primary language of every name in this list: the list country's.
  const shelfLang = listLangOf(list, user?.country);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const editingItem = editingItemId ? items.find(i => i.id === editingItemId) ?? null : null;
  // Product the Store tab opens on ("Mostrar en la tienda").
  const [storeStartId, setStoreStartId] = useState<string | null>(null);
  const [tab, setTab] = useState<ListTab>("list");
  // The Tienda tab has its own theme; Lista and Miembros share the list's.
  useThemeView(tab === "store" ? "store" : "list");
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

  const [showMenu, setShowMenu] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImportReceipt, setShowImportReceipt] = useState(false);

  // "Ordenar por categoría" (3.9), remembered per user and list.
  const sortKey = `babelcart_sort_by_category_${user?.id ?? "anon"}_${listId}`;
  const [sortByCategory, setSortByCategory] = useState(true);
  useEffect(() => {
    try { setSortByCategory(localStorage.getItem(sortKey) !== "0"); } catch { setSortByCategory(true); }
  }, [sortKey]);
  const toggleSort = () => {
    setSortByCategory(prev => {
      try { localStorage.setItem(sortKey, prev ? "0" : "1"); } catch { /* ignore */ }
      return !prev;
    });
  };

  const isOwner = !!user && !!list?.owners?.includes(user.id);

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
    if (!sortByCategory) {
      const all = sortByImportance(items.filter(i => statusOf(i) === filter));
      return all.length ? [{ key: "all", name: "", nameMine: "", items: all }] : [];
    }
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
  }, [items, filter, shelfLang, userLang, sortByCategory]);

  // Store tab (3.7): pending items in the same order as the list.
  const storeItems = useMemo(() => {
    const pending = sortByImportance(items.filter(i => statusOf(i) === "pending"));
    if (!sortByCategory) return pending;
    const rank = (c: string) => { const i = CATEGORY_ORDER.indexOf(c || "other"); return i < 0 ? CATEGORY_ORDER.length : i; };
    return [...pending].sort((a, b) => rank(a.category) - rank(b.category));
  }, [items, sortByCategory]);

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
    // Buying a "No hay" item takes it out of "No hay" (the server does the same).
    setItems(prev => prev.map(i => i.id === itemId
      ? { ...i, checked, checked_at: checked ? new Date().toISOString() : null, ...(checked ? { unavailable: false, unavailable_at: null } : {}) }
      : i));
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


  // "No hay": out of stock. Marking it takes the item out of the cart; the
  // server stamps unavailable_at and applies the list's policy later.
  const handleSetUnavailable = useCallback(async (itemId: string, unavailable: boolean) => {
    const prevItem = items.find(i => i.id === itemId);
    const cartUpdates = unavailable ? { checked: false, checked_at: null } : {};
    setItems(prev => prev.map(i => i.id === itemId
      ? { ...i, unavailable, unavailable_at: unavailable ? new Date().toISOString() : null, ...cartUpdates }
      : i));
    try { await updateItem(itemId, { unavailable, ...cartUpdates }); } catch { /* realtime will sync */ }
    if (user) {
      logItemHistory({
        itemId,
        eventType: unavailable ? "unavailable" : "available",
        icon: unavailable ? "🚫" : "↩️",
        description: `${user.name} ${t(lang, unavailable ? "markedUnavailable" : "unmarkedUnavailable")}`,
        byUserId: user.id,
        byUserName: user.name,
      }).catch(err => console.error("[logItemHistory:unavailable]", err));
      if (unavailable && prevItem?.checked) {
        removeRecentAutoPurchase({ itemId, byUserId: user.id }).catch(err => console.error("[removeRecentAutoPurchase]", err));
      }
    }
  }, [items, setItems, user, lang]);

  // "Borrar comprados". With the "next_trip" policy it also closes the
  // shopping trip: "No hay" items go back to "to buy".
  const clearBought = () => {
    items.filter(i => statusOf(i) === "bought").forEach(i => handleDelete(i.id));
    if (list?.unavailable_policy === "next_trip") {
      items.filter(i => i.unavailable).forEach(i => handleSetUnavailable(i.id, false));
    }
  };

  const openItem = useCallback((item: Item) => {
    setEditingItemId(item.id);
  }, []);

  const closeSearch = () => {
    setSearching(false);
    setSearchQuery("");
  };

  const openTab = (next: ListTab) => {
    if (next !== "store") setStoreStartId(null);
    closeSearch();
    setTab(next);
  };

  const showInStore = (item: Item) => {
    setStoreStartId(item.id);
    setTab("store");
  };

  // Optimistic list settings; the server enforces who may change what.
  const changeList = (updates: Parameters<typeof updateList>[1]) => {
    setList(prev => (prev ? { ...prev, ...updates } : prev));
    updateList(listId, updates).catch(err => {
      console.error("[updateList]", err);
      refresh();
    });
  };

  const countryFlag = list ? getCountryFlag(list.country || user?.country || "") : "";

  const iconBtn = "shrink-0 w-11 h-11 flex items-center justify-center rounded-full text-text-soft active:bg-text/5 cursor-pointer";
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
            <button onClick={() => setShowShare(true)} className={iconBtn} aria-label={t(lang, "share")}><IconShare size={22} /></button>
            <button onClick={() => setShowMenu(true)} className={iconBtn} aria-label={t(lang, "more")} aria-haspopup="menu"><IconMore size={22} /></button>
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
      ) : tab === "store" ? (
        <StoreTab items={storeItems} startItemId={storeStartId} listLang={shelfLang} userLang={userLang} />
      ) : tab === "members" ? (
        <MembersTab
          list={list}
          members={members}
          userId={user?.id ?? ""}
          lang={lang}
          onApprove={async (uid) => {
            setMembers(prev => prev.map(x => x.user_id === uid ? { ...x, status: "active" as const } : x));
            try { await approveMember(listId, uid); } catch { /* realtime will sync */ }
            refresh();
          }}
          onReject={async (uid) => {
            setMembers(prev => prev.filter(x => x.user_id !== uid));
            try { await rejectMember(listId, uid); } catch { /* realtime will sync */ }
            refresh();
          }}
          onRemove={(uid) => {
            setMembers(prev => prev.filter(x => x.user_id !== uid));
            removeMember(listId, uid).catch(() => { /* realtime will sync */ });
          }}
        />
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
            <div className="mt-1.5 h-[5px] rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--color-text) 8%, transparent)" }}>
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
                    {group.key !== "all" && <button
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
                    </button>}
                    {(!collapsed || group.key === "all") && (
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
        onShowStore={showInStore}
        onSetUnavailable={handleSetUnavailable}
      />

      <ListMenu
        open={showMenu}
        onClose={() => setShowMenu(false)}
        lang={lang}
        sortByCategory={sortByCategory}
        onToggleSort={toggleSort}
        boughtCount={counts.bought}
        onClearBought={clearBought}
        onArchive={async () => {
          // Personal: hides the list from my home only.
          try { await archiveList(listId, true); } catch (err) { console.error("[archiveList]", err); }
          onNavigate("lists");
        }}
        onSettings={() => setShowSettings(true)}
      />

      <ShareSheet
        open={showShare}
        onClose={() => setShowShare(false)}
        list={list}
        items={storeItems}
        listLang={shelfLang}
        userLang={userLang}
        isOwner={isOwner}
        onRequireApproval={(v) => changeList({ require_approval: v })}
      />

      <ListSettingsSheet
        open={showSettings}
        onClose={() => setShowSettings(false)}
        list={list}
        lang={lang}
        userCountry={user?.country ?? ""}
        isOwner={isOwner}
        onChange={changeList}
        onDeleteOrLeave={async () => {
          try { if (user) await exitList(listId, user.id); } catch { /* realtime will sync */ }
          setShowSettings(false);
          onNavigate("lists");
        }}
      />

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
