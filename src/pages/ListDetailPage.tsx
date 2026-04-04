import { useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useListDetail, deleteList, approveMember, rejectMember, renameList } from "../hooks/useList";
import { toggleItem, updateItem, deleteItem } from "../hooks/useItems";
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
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showChecked, setShowChecked] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingIds] = useState<Set<string>>(new Set());
  const [failedIds] = useState<Set<string>>(new Set());
  const [showMembers, setShowMembers] = useState(false);
  const [showListSettings, setShowListSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const activeMembers = members.filter(m => m.status === "active");
  const pendingMembers = members.filter(m => m.status === "pending");

  // Split items into unchecked and checked
  // Sort: important first, then by created_at (preserves order for the rest)
  const sortByImportance = (arr: Item[]) =>
    [...arr].sort((a, b) => {
      if (!!b.important !== !!a.important) return b.important ? 1 : -1;
      return 0;
    });

  const uncheckedItems = useMemo(() => sortByImportance(items.filter((i) => !i.checked)), [items]);
  const checkedItems = useMemo(() => items.filter((i) => i.checked), [items]);

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

  // Only show category headers if >1 category AND >3 total unchecked items
  const showCategoryHeaders = categoryGroups.length > 1 && uncheckedItems.length > 3;

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const handleToggle = async (itemId: string, checked: boolean) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, checked } : i));
    try { await toggleItem(itemId, checked); } catch { /* realtime will sync */ }
  };

  const handleUpdate = async (
    itemId: string,
    updates: Partial<Pick<Item, "qty" | "unit" | "note" | "photo" | "important">>,
  ) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...updates } : i));
    try { await updateItem(itemId, updates); } catch { /* realtime will sync */ }
  };

  const handleDelete = async (itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
    setEditingItemId(null);
    try { await deleteItem(itemId); } catch { /* realtime will sync */ }
  };

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
            onClick={(item) => setEditingItemId(item.id)}
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
          aria-label="Back"
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
        ) : (
          <>
            {/* Category groups (unchecked items) */}
            {showCategoryHeaders ? (
              categoryGroups.map((group) => {
                const isCollapsed = collapsedCategories.has(group.key);
                return (
                  <div key={group.key} className="mb-2">
                    {/* Category header */}
                    <button
                      onClick={() => toggleCategory(group.key)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 bg-bg sticky top-0 z-10 cursor-pointer active:bg-card transition-colors"
                    >
                      <span className="text-base">{group.emoji}</span>
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                        {group.name}
                      </span>
                      <span
                        className="text-text-muted rounded-full flex items-center justify-center"
                        style={{
                          fontSize: 10,
                          width: 20,
                          height: 20,
                          backgroundColor: "rgba(139, 146, 168, 0.15)",
                        }}
                      >
                        {group.items.length}
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
                          isCollapsed ? "-rotate-90" : ""
                        }`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
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
                  onClick={() => setShowChecked(!showChecked)}
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
                    className="shrink-0 px-3 py-1.5 mr-3 rounded-lg text-[11px] font-semibold cursor-pointer transition-all"
                    style={{
                      background: confirmClear ? "#b71c1c" : "rgba(255,92,92,0.08)",
                      color: confirmClear ? "#fff" : "#ff5c5c",
                      border: confirmClear ? "1px solid #b71c1c" : "1px solid rgba(255,92,92,0.15)",
                    }}
                  >
                    {confirmClear ? "⚠️ Confirm?" : "🗑️"}
                  </button>
                </div>

                {showChecked && (
                  <div className="mt-1">
                    {renderItemGrid(checkedItems, true)}
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
          items={items}
          onItemAdded={() => {
            // Items update via realtime
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
        {activeMembers.map((m, i) => (
          <div key={m.user_id} className="flex items-center gap-3 py-2.5 border-b border-border">
            <Avatar name={m.user_name || m.user_id.slice(0, 4)} index={i} size={32} />
            <div className="flex-1">
              <div className="font-semibold text-sm">{m.user_name || m.user_id.slice(0, 6)}</div>
              <div className="text-text-muted text-xs">
                {m.user_lang && <>{getLangFlag(m.user_lang)} {getLangName(m.user_lang)}</>}
                {m.user_country && <> · {getCountryFlag(m.user_country)}</>}
              </div>
            </div>
            {m.user_id === user?.id && (
              <span className="text-[10px] font-semibold text-accent px-2 py-1 rounded-lg" style={{ background: "rgba(240,136,62,0.1)" }}>You</span>
            )}
          </div>
        ))}
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
                <button
                  onClick={async () => {
                    // Optimistic: remove immediately
                    setMembers(prev => prev.filter(x => x.user_id !== m.user_id));
                    try { await rejectMember(listId, m.user_id); } catch { /* realtime will sync */ }
                    refresh();
                  }}
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{ background: "rgba(255,92,92,0.08)", color: "#ff5c5c", border: "1px solid rgba(255,92,92,0.2)" }}
                >
                  ✕
                </button>
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
          onClick={async () => { try { await deleteList(listId); } catch {} setShowListSettings(false); onNavigate("lists"); }}
          className="w-full mt-3 py-3 rounded-xl font-semibold text-sm cursor-pointer"
          style={{ background: "rgba(255,92,92,0.08)", color: "#ff5c5c", border: "1px solid rgba(255,92,92,0.15)" }}
        >
          🚪 {t(lang, "leave")}
        </button>
        <button onClick={() => setShowListSettings(false)} className="w-full mt-2 py-3 rounded-xl border border-border-light text-text-soft font-medium cursor-pointer active:bg-card">{t(lang, "close")}</button>
      </Modal>
    </div>
  );
}
