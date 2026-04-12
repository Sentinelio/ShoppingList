import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useListDetail, deleteList, approveMember, rejectMember, removeMember, renameList } from "../hooks/useList";
import { toggleItem, updateItem, deleteItem } from "../hooks/useItems";
import { logItemHistory, logAutoPurchase, removeRecentAutoPurchase } from "../lib/itemData";
import { setLocallyImportant } from "../lib/importantStore";
import { t } from "../data/i18n";
import { CATEGORY_ORDER, getCategoryName, getCategoryEmoji } from "../data/categories";
import { getCountryFlag } from "../data/countries";
import { getLangFlag, getLangName } from "../data/langs";
import { copyToClipboard } from "../lib/clipboard";
import type { Item } from "../lib/supabase";
import ItemCard from "../components/items/ItemCard";
import AddItemBar from "../components/items/AddItemBar";
import ItemDetail from "../components/items/ItemDetail";
import StoreMode from "../components/store/StoreMode";
import Modal from "../components/ui/Modal";
import Avatar from "../components/ui/Avatar";
import { useItemsLayoutId } from "../hooks/useTheme";
import { getItemsLayout } from "../layouts/items/layouts";

interface ListDetailPageProps {
  listId: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

interface CategoryGroup {
  key: string;
  emoji: string;
  name: string;
  items: Item[];
}

export default function ListDetailPage({ listId, onNavigate }: ListDetailPageProps) {
  const { user, shelfLang } = useAuth();
  const userLang = user?.lang ?? "en";
  const lang = userLang;

  const { list, members, setMembers, items, setItems, loading, refresh } = useListDetail(listId);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const editingItem = editingItemId ? items.find(i => i.id === editingItemId) ?? null : null;
  const [storeItem, setStoreItem] = useState<Item | null>(null);
  const collapsedKey = `babelcart_collapsed_${listId}`;
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showChecked, setShowChecked] = useState<boolean>(false);

  // Re-hydrate collapse state from localStorage whenever listId changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`babelcart_collapsed_${listId}`);
      setCollapsedCategories(raw ? new Set(JSON.parse(raw) as string[]) : new Set());
    } catch {
      setCollapsedCategories(new Set());
    }
    try {
      setShowChecked(localStorage.getItem(`babelcart_collapsed_${listId}_done`) === "1");
    } catch {
      setShowChecked(false);
    }
  }, [listId]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingIds] = useState<Set<string>>(new Set());
  const [failedIds] = useState<Set<string>>(new Set());
  const [showMembers, setShowMembers] = useState(false);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<string | null>(null);
  const [confirmRejectPending, setConfirmRejectPending] = useState<string | null>(null);
  const [showListSettings, setShowListSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Normalize strings for accent/case-insensitive matching (so "leche" also
  // finds "Lèche", "LECHE", etc.).
  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // When a search is active, keep only items whose name (in any language) or
  // original text contains the normalized query as a substring. This makes
  // searching "leche" match "leche entera", "leche desnatada", etc.
  const matchesQuery = useCallback(
    (item: Item) => {
      if (!searchQuery) return true;
      const q = normalize(searchQuery);
      if (!q) return true;
      if (normalize(item.original).includes(q)) return true;
      if (item.translations) {
        for (const value of Object.values(item.translations)) {
          if (typeof value === "string" && normalize(value).includes(q)) return true;
        }
      }
      if (item.note && normalize(item.note).includes(q)) return true;
      return false;
    },
    [searchQuery],
  );

  const filteredItems = useMemo(() => items.filter(matchesQuery), [items, matchesQuery]);

  const activeMembers = members.filter(m => m.status === "active");
  const pendingMembers = members.filter(m => m.status === "pending");

  // Split items into unchecked and checked
  // Sort: important first, then by created_at (preserves order for the rest)
  const sortByImportance = (arr: Item[]) =>
    [...arr].sort((a, b) => {
      if (!!b.important !== !!a.important) return b.important ? 1 : -1;
      return 0;
    });

  const uncheckedItems = useMemo(
    () => sortByImportance(filteredItems.filter((i) => !i.checked)),
    [filteredItems],
  );
  const checkedItems = useMemo(
    () => filteredItems.filter((i) => i.checked),
    [filteredItems],
  );

  // Group unchecked items by category
  const categoryGroups = useMemo<CategoryGroup[]>(() => {
    const grouped: Record<string, Item[]> = {};

    for (const item of uncheckedItems) {
      const cat = item.category || "other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }

    // Sort each category: important first
    for (const cat of Object.keys(grouped)) {
      grouped[cat] = sortByImportance(grouped[cat]);
    }

    return CATEGORY_ORDER.filter((cat) => grouped[cat] && grouped[cat].length > 0).map((cat) => ({
      key: cat,
      emoji: getCategoryEmoji(cat),
      name: getCategoryName(cat, userLang),
      items: grouped[cat],
    }));
  }, [uncheckedItems, userLang]);

  // Always show category headers so every item lives under its correct
  // category — even when there's only one category or a single item.
  const showCategoryHeaders = categoryGroups.length > 0;

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      try { localStorage.setItem(collapsedKey, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };

  const toggleShowChecked = () => {
    setShowChecked((prev) => {
      const next = !prev;
      try { localStorage.setItem(`${collapsedKey}_done`, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  };

  const handleToggle = useCallback(async (itemId: string, checked: boolean) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, checked } : i));
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
    updates: Partial<Pick<Item, "qty" | "unit" | "note" | "photo" | "important" | "original" | "translations" | "brand">>,
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

  const handleCardClick = useCallback((item: Item) => {
    setEditingItemId(item.id);
  }, []);

  const layoutId = useItemsLayoutId();
  const isClassicLayout = layoutId === "items-classic";
  const activeItemsLayout = getItemsLayout(layoutId);

  const countryFlag = list ? getCountryFlag(user?.country ?? "") : "";

  // Render a grid of ItemCards
  const renderItemGrid = (gridItems: Item[], checked?: boolean) => (
    <div className="grid grid-cols-3 gap-2.5 px-3">
      {gridItems.map((item) => (
        <div
          key={item.id}
          style={checked ? { opacity: 0.45 } : undefined}
        >
          <ItemCard
            item={item}
            userLang={userLang}
            shelfLang={shelfLang}
            isPending={pendingIds.has(item.id)}
            isFailed={failedIds.has(item.id)}
            onToggle={handleToggle}
            onClick={handleCardClick}
          />
        </div>
      ))}
    </div>
  );

  // Store mode
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

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header
        className="flex items-center gap-3 px-4 py-3 bg-bg border-b border-border-light"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        {/* Back arrow */}
        <button
          onClick={() => onNavigate("lists")}
          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-text-soft active:bg-card transition-colors cursor-pointer"
          aria-label={t(lang, "back")}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* List name (tappable to edit) */}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              autoFocus
              defaultValue={list?.name ?? ""}
              onBlur={async (e) => {
                const newName = e.target.value.trim();
                if (newName && newName !== list?.name) {
                  try { await renameList(listId, newName); refresh(); } catch { /* optimistic */ }
                }
                setEditingName(false);
              }}
              onKeyDown={async e => {
                if (e.key === "Enter") {
                  const newName = (e.target as HTMLInputElement).value.trim();
                  if (newName && newName !== list?.name) {
                    try { await renameList(listId, newName); refresh(); } catch { /* optimistic */ }
                  }
                  setEditingName(false);
                }
                if (e.key === "Escape") setEditingName(false);
              }}
              className="text-lg font-bold text-text bg-card border border-accent/30 rounded-lg px-2 py-1 outline-none w-full"
            />
          ) : (
            <h1 onClick={() => setEditingName(true)} className="text-lg font-bold text-text truncate cursor-pointer">
              {list?.name ?? "..."} {countryFlag}
            </h1>
          )}
        </div>

        {/* Members button */}
        <button
          onClick={() => setShowMembers(true)}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg cursor-pointer active:brightness-90 relative"
          style={{ background: "rgba(240,136,62,0.1)", border: "none" }}
        >
          <span className="text-sm">👥</span>
          <span className="text-xs font-semibold text-accent">{activeMembers.length}</span>
          {pendingMembers.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-danger flex items-center justify-center text-[10px] font-bold text-white border-2 border-bg px-1">
              {pendingMembers.length}
            </span>
          )}
        </button>

        {/* Settings button */}
        <button
          onClick={() => setShowListSettings(true)}
          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-card border border-border-light text-text-soft active:bg-accent/10 cursor-pointer"
        >
          ⚙️
        </button>
      </header>

      {/* Search bar — only useful once the list has enough items to scan */}
      {items.length >= 5 && (
        <div className="px-4 pt-3 pb-1 bg-bg">
          <div className="relative">
            <span
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none"
            >
              🔍
            </span>
            <input
              type="text"
              inputMode="search"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(lang, "searchInList")}
              aria-label={t(lang, "searchInList")}
              className="w-full bg-card border border-border-light rounded-xl pl-9 pr-9 py-2 text-sm text-text outline-none focus:border-accent placeholder:text-text-muted"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label={t(lang, "close")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-text-muted active:text-text cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="text-[11px] text-text-muted mt-1.5 px-1">
              {filteredItems.length === 0
                ? t(lang, "noSearchResults")
                : `${filteredItems.length} ${filteredItems.length === 1 ? t(lang, "result") : t(lang, "results")}`}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-text-muted animate-pulse">{t(lang, "translating")}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="text-6xl mb-4 opacity-30">&#128722;</div>
            <p className="text-text-soft font-medium text-lg mb-2">
              {t(lang, "noLists")}
            </p>
          </div>
        ) : !isClassicLayout ? (
          // Full-redesign layouts take over the entire items area. They handle
          // their own grouping, sections and visual styling — we just hand them
          // the filtered items + members.
          <div className="pt-3">
            <activeItemsLayout.Component
              items={filteredItems}
              members={activeMembers}
              userLang={userLang}
              shelfLang={shelfLang}
              onToggle={handleToggle}
              onClick={handleCardClick}
            />
          </div>
        ) : (
          <>
            {/* Category groups (unchecked items) */}
            {showCategoryHeaders ? (
              categoryGroups.map((group) => {
                const isCollapsed = collapsedCategories.has(group.key);
                return (
                  <div key={group.key} className="mb-2">
                    {/* Category header — thin row: emoji + name on the left,
                        count on the right, no big button shell. */}
                    <button
                      onClick={() => toggleCategory(group.key)}
                      className="w-full flex items-center gap-2 px-4 pt-3 pb-1.5 cursor-pointer active:opacity-70 transition-opacity"
                    >
                      <span className="text-[11px]" aria-hidden="true">{group.emoji}</span>
                      <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                        {group.name}
                      </span>
                      <div className="flex-1 h-px bg-border-light/50" />
                      <span className="text-[10px] text-text-muted tabular-nums">
                        {group.items.length}
                      </span>
                    </button>

                    {/* Items grid */}
                    {!isCollapsed && renderItemGrid(group.items)}
                  </div>
                );
              })
            ) : (
              /* No category headers -- flat grid */
              <div className="pt-3">
                {renderItemGrid(uncheckedItems)}
              </div>
            )}

            {/* Checked / Done section */}
            {checkedItems.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center sticky top-0 z-10 bg-bg">
                <button
                  onClick={toggleShowChecked}
                  className="flex-1 flex items-center gap-2 px-4 py-2.5 cursor-pointer active:bg-card transition-colors"
                >
                  <span className="text-base">&#9989;</span>
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                    {t(lang, "done")}
                  </span>
                  <span
                    className="text-text-muted rounded-full flex items-center justify-center"
                    style={{
                      fontSize: 10,
                      width: 20,
                      height: 20,
                      backgroundColor: "rgba(74, 222, 128, 0.15)",
                    }}
                  >
                    {checkedItems.length}
                  </span>
                  <div className="flex-1 h-px bg-border-light ml-2" />
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`text-text-muted transition-transform duration-200 ${
                      !showChecked ? "-rotate-90" : ""
                    }`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                </div>

                {showChecked && (
                  <div className="mt-1">
                    {renderItemGrid(checkedItems, true)}
                    {/* Delete all checked — placed BELOW the list for safety */}
                    <div className="flex justify-center py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirmClear) {
                            checkedItems.forEach(i => handleDelete(i.id));
                            setConfirmClear(false);
                            setShowChecked(false);
                          } else {
                            setConfirmClear(true);
                            setTimeout(() => setConfirmClear(false), 3000);
                          }
                        }}
                        className="px-4 py-2 rounded-lg text-[11px] font-semibold cursor-pointer transition-all"
                        style={{
                          background: confirmClear ? "#b71c1c" : "rgba(255,92,92,0.08)",
                          color: confirmClear ? "#fff" : "#ff5c5c",
                          border: confirmClear ? "1px solid #b71c1c" : "1px solid rgba(255,92,92,0.15)",
                        }}
                      >
                        {confirmClear ? "⚠️ Borrar todos?" : `🗑️ Borrar ${checkedItems.length} hechos`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add item bar */}
      {user && (
        <AddItemBar
          listId={listId}
          userLang={userLang}
          shelfLang={shelfLang}
          userId={user.id}
          userName={user.name}
          onItemAdded={(newItem) => {
            // Log creation event in history
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
        <button
          onClick={async () => {
            if (confirmLeave) {
              try { await deleteList(listId); } catch { /* realtime will sync */ }
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
    </div>
  );
}
