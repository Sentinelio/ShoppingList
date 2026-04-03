import { useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useListDetail } from "../hooks/useList";
import { toggleItem, updateItem, deleteItem } from "../hooks/useItems";
import { t, type Lang } from "../data/i18n";
import { CATEGORY_ORDER, getCategoryName, getCategoryEmoji } from "../data/categories";
import { getCountryFlag } from "../data/countries";
import type { Item } from "../lib/supabase";
import ItemCard from "../components/items/ItemCard";
import AddItemBar from "../components/items/AddItemBar";
import ItemDetail from "../components/items/ItemDetail";
import StoreMode from "../components/store/StoreMode";

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
  const lang = (userLang === "en" || userLang === "es" || userLang === "pl" ? userLang : "en") as Lang;

  const { list, members: _members, items, loading, refresh: _refresh } = useListDetail(listId);

  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [storeItem, setStoreItem] = useState<Item | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showChecked, setShowChecked] = useState(false);
  const [pendingIds] = useState<Set<string>>(new Set());
  const [failedIds] = useState<Set<string>>(new Set());

  // Split items into unchecked and checked
  const uncheckedItems = useMemo(() => items.filter((i) => !i.checked), [items]);
  const checkedItems = useMemo(() => items.filter((i) => i.checked), [items]);

  // Group unchecked items by category
  const categoryGroups = useMemo<CategoryGroup[]>(() => {
    const grouped: Record<string, Item[]> = {};

    for (const item of uncheckedItems) {
      const cat = item.category || "other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
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
    try {
      await toggleItem(itemId, checked);
    } catch {
      // realtime will sync
    }
  };

  const handleUpdate = async (
    itemId: string,
    updates: Partial<Pick<Item, "qty" | "unit" | "note">>,
  ) => {
    try {
      await updateItem(itemId, updates);
    } catch {
      // realtime will sync
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteItem(itemId);
    } catch {
      // realtime will sync
    }
  };

  // Build member avatars
  const memberAvatars = useMemo(() => {
    const seen = new Set<string>();
    const avatars: { name: string; color: string }[] = [];

    for (const item of items) {
      if (item.added_by && !seen.has(item.added_by)) {
        seen.add(item.added_by);
        avatars.push({
          name: item.added_by_name || "?",
          color: "#8b949e",
        });
      }
    }

    return avatars.slice(0, 5);
  }, [items]);

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
            onClick={setEditingItem}
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

        {/* List name + flag */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-text truncate">
              {list?.name ?? t(lang, "addProduct")}
            </h1>
            {countryFlag && <span className="text-base shrink-0">{countryFlag}</span>}
          </div>
        </div>

        {/* Member avatars */}
        {memberAvatars.length > 0 && (
          <div className="flex -space-x-2 shrink-0">
            {memberAvatars.map((m, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-bg"
                style={{ backgroundColor: m.color }}
                title={m.name}
              >
                {m.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        )}

        {/* Settings button */}
        <button
          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-text-soft active:bg-card transition-colors cursor-pointer"
          aria-label={t(lang, "settings")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
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
                <button
                  onClick={() => setShowChecked(!showChecked)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-bg sticky top-0 z-10 cursor-pointer active:bg-card transition-colors"
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
        onClose={() => setEditingItem(null)}
        userLang={userLang}
        shelfLang={shelfLang}
        countryFlag={countryFlag}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onShowStore={setStoreItem}
      />
    </div>
  );
}
