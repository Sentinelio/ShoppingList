import { useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useListDetail } from "../hooks/useList";
import { toggleItem, updateItem, deleteItem } from "../hooks/useItems";
import { t, type Lang } from "../data/i18n";
import { CATEGORY_ORDER, getCategoryName, getCategoryEmoji } from "../data/categories";
import { getCountryFlag } from "../data/countries";
import type { Item } from "../lib/supabase";
import ItemRow from "../components/items/ItemRow";
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
  const [purchasedCollapsed, setPurchasedCollapsed] = useState(true);

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

  // Build member avatars from members + user data
  // We use the members list and supabase user data; the list_members table
  // has user_id but not name/color. We'll fetch from items' added_by_name as a fallback.
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
              {list?.name ?? t(lang, "common.loading")}
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
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-text-muted animate-pulse">{t(lang, "common.loading")}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="text-6xl mb-4 opacity-30">&#128722;</div>
            <p className="text-text-soft font-medium text-lg mb-2">
              {t(lang, "items.empty")}
            </p>
          </div>
        ) : (
          <>
            {/* Category groups (unchecked items) */}
            {categoryGroups.map((group) => {
              const isCollapsed = collapsedCategories.has(group.key);
              return (
                <div key={group.key}>
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(group.key)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 bg-bg sticky top-0 z-10 cursor-pointer active:bg-card transition-colors"
                  >
                    <span className="text-base">{group.emoji}</span>
                    <span className="text-sm font-semibold text-text">{group.name}</span>
                    <span className="text-xs text-text-muted">({group.items.length})</span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`ml-auto text-text-muted transition-transform duration-200 ${
                        isCollapsed ? "-rotate-90" : ""
                      }`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Items */}
                  {!isCollapsed &&
                    group.items.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        userLang={userLang}
                        shelfLang={shelfLang}
                        onToggle={handleToggle}
                        onEdit={setEditingItem}
                        onDelete={handleDelete}
                        onShowStore={setStoreItem}
                      />
                    ))}
                </div>
              );
            })}

            {/* Purchased section */}
            {checkedItems.length > 0 && (
              <div>
                <button
                  onClick={() => setPurchasedCollapsed(!purchasedCollapsed)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-bg sticky top-0 z-10 cursor-pointer active:bg-card transition-colors"
                >
                  <span className="text-base">&#9989;</span>
                  <span className="text-sm font-semibold text-text-soft">
                    {t(lang, "items.checked")}
                  </span>
                  <span className="text-xs text-text-muted">({checkedItems.length})</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`ml-auto text-text-muted transition-transform duration-200 ${
                      purchasedCollapsed ? "-rotate-90" : ""
                    }`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {!purchasedCollapsed &&
                  checkedItems.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      userLang={userLang}
                      shelfLang={shelfLang}
                      onToggle={handleToggle}
                      onEdit={setEditingItem}
                      onDelete={handleDelete}
                      onShowStore={setStoreItem}
                    />
                  ))}
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
          onItemAdded={() => {
            // Items update via realtime; optionally refresh
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
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onShowStore={setStoreItem}
      />
    </div>
  );
}
