import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { pb, IS_DEMO, callRoute, upsertByKey } from "../lib/pocketbase";
import { LANGS } from "../data/langs";
import { ALL_LANGUAGES } from "../data/allLanguages";
import { getEnabledLangs, enableLang, disableLang, getStoredUITranslations, saveUITranslations } from "../lib/langConfig";
import { strings } from "../data/i18n";
import { getCountries } from "../data/countries";
import { CATEGORIES, CATEGORY_ORDER } from "../data/categories";
import { LOCAL_DICTIONARY } from "../data/localDictionary";
import {
  getAllStoreTypesWithCategories,
  addCustomStoreType,
  addCustomCategory,
  removeCustomStoreType,
  removeCustomCategory,
  type StoreTypeWithCategories,
} from "../lib/customStoreConfig";
import { SEED_CATEGORIES } from "../data/seedCategories";
import { CHANGELOG, type ChangeType } from "../data/changelog";
import { PALETTES, THEME_VIEWS, VIEW_LABELS, getPalette, type ThemeView } from "../data/themes";
import { setThemeId, resetThemes, useThemeSelection } from "../lib/themeStore";
import ThemePreview from "../components/admin/ThemePreview";
import { ConnectionBadge, AdminErrorBanner } from "../components/admin/AdminStatus";
import { reportAdminError, describeError } from "../lib/adminErrors";
import { AdminHome, SectionHeader, SearchBox, Chips, Collapsible, ShowMore, type HomeEntry } from "../components/admin/AdminUi";
import { useShowMore } from "../hooks/useShowMore";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { DesktopShell, TopBar, type NavGroup } from "../components/admin/desktop/DesktopShell";
import UsersDesktop from "../components/admin/desktop/UsersDesktop";
import ListsDesktop, { type BulkField } from "../components/admin/desktop/ListsDesktop";
import { loadPeople, matchUsers, EMPTY_PEOPLE, type PeopleData } from "../lib/adminPeople";
import GenerateDialog, { type GenerateMode, type GenerateTarget, type GenerateResult } from "../components/admin/GenerateDialog";
import {
  ensureStorePhrasesLoaded,
  upsertStorePhrase,
  deleteStorePhrase,
  fillPhrasesForLang,
  countMissingForLang,
  reorderStorePhrases,
  type StorePhrase,
} from "../lib/storePhrasesStore";
import { useStorePhrases } from "../hooks/useStorePhrases";

type Tab = "catalog" | "languages" | "users" | "lists" | "stats" | "roadmap" | "changelog" | "themes" | "phrases";
type Section = Tab | "home";

const SECTION_TITLES: Record<Tab, string> = {
  stats: "Stats", catalog: "Catalog", phrases: "Phrases", languages: "Languages",
  users: "Users", lists: "Lists", themes: "Themes", changelog: "Versions & status", roadmap: "Roadmap",
};

// #admin → home, #admin/users → that section (so the phone's back works).
function sectionFromHash(): Section {
  const m = window.location.hash.match(/^#admin\/(\w+)/);
  return m && m[1] in SECTION_TITLES ? (m[1] as Tab) : "home";
}

interface DictRow {
  id?: string;
  key: string;
  translations: Record<string, string>;
  category: string;
  is_brand?: boolean;
  created_at: string;
}

interface UserRow {
  id: string;
  name: string;
  lang: string;
  country: string;
  created_at: string;
  last_seen_at: string | null;
  tag?: string;
}

interface ListRow {
  id: string;
  name: string;
  code: string;
  created_by: string;
  created_at: string;
  require_approval: boolean;
  who_can_approve: string;
  who_can_remove: string;
}

// ── Drag-and-drop phrase list ─────────────────────────────────────────────
// Pointer-event based reorder so it works on mouse AND touch without any
// third-party DnD library. The handle has touch-action:none to prevent the
// page from scrolling while the user is dragging a row.

interface PhraseDraggableListProps {
  phrases: StorePhrase[];
  maxUses: number;
  enabled: string[];
  dragKey: string | null;
  dragOverIdx: number | null;
  confirmDeleteKey: string | null;
  onStartDrag: (key: string) => void;
  onDragOver: (idx: number) => void;
  onEndDrag: (targetIdx: number | null) => void;
  onEdit: (p: StorePhrase) => void;
  onToggleConfirmDelete: (key: string) => void;
}

function PhraseDraggableList({
  phrases,
  maxUses,
  enabled,
  dragKey,
  dragOverIdx,
  confirmDeleteKey,
  onStartDrag,
  onDragOver,
  onEndDrag,
  onEdit,
  onToggleConfirmDelete,
}: PhraseDraggableListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Convert a pointer Y coordinate to a target index by finding the row
  // whose vertical midpoint the pointer has just crossed.
  const computeTargetIdx = (clientY: number): number | null => {
    const list = listRef.current;
    if (!list) return null;
    let idx = 0;
    for (const p of phrases) {
      const el = itemRefs.current[p.key];
      if (!el) { idx++; continue; }
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (clientY < mid) return idx;
      idx++;
    }
    return phrases.length - 1;
  };

  const handlePointerDown = (e: React.PointerEvent, key: string) => {
    // Only left-click / primary touch.
    if (e.button !== 0 && e.pointerType !== "touch") return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onStartDrag(key);
    const idx = phrases.findIndex(p => p.key === key);
    onDragOver(idx);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragKey) return;
    const target = computeTargetIdx(e.clientY);
    if (target != null && target !== dragOverIdx) onDragOver(target);
  };

  const handlePointerEnd = (e: React.PointerEvent) => {
    if (!dragKey) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { /* ignore */ }
    onEndDrag(dragOverIdx);
  };

  return (
    <div ref={listRef} className="space-y-2">
      {phrases.map((p, i) => {
        const uses = p.usage_count ?? 0;
        const pct = maxUses === 0 ? 0 : Math.round((uses / maxUses) * 100);
        const isConfirming = confirmDeleteKey === p.key;
        const isDragging = dragKey === p.key;
        const isDropTarget = dragKey !== null && dragOverIdx === i && dragKey !== p.key;
        return (
          <div
            key={p.key}
            ref={el => { itemRefs.current[p.key] = el; }}
            className="rounded-xl border p-3 transition-all"
            style={{
              background: isDragging ? "rgba(240,136,62,0.12)" : "var(--color-card, #161b24)",
              borderColor: isDragging
                ? "var(--color-accent, #f0883e)"
                : isDropTarget
                  ? "var(--color-accent, #f0883e)"
                  : "var(--color-border, rgba(255,255,255,0.06))",
              borderStyle: isDropTarget ? "dashed" : "solid",
              borderWidth: isDragging || isDropTarget ? 2 : 1,
              opacity: isDragging ? 0.85 : 1,
              boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.4)" : undefined,
              transform: isDragging ? "scale(1.01)" : undefined,
            }}
          >
            <div className="flex items-start gap-2">
              {/* Drag handle */}
              <div
                role="button"
                aria-label="Drag to reorder"
                tabIndex={0}
                onPointerDown={(e) => handlePointerDown(e, p.key)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                className="shrink-0 flex items-center justify-center text-text-muted select-none"
                style={{
                  width: 24,
                  height: 32,
                  cursor: isDragging ? "grabbing" : "grab",
                  touchAction: "none",
                  fontSize: 14,
                  lineHeight: 1,
                }}
                title="Drag to reorder"
              >
                ⋮⋮
              </div>
              <span className="text-2xl shrink-0" aria-hidden="true">{p.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-text truncate">
                  {p.translations.en ?? p.key}
                </div>
                <div className="text-[10px] text-text-muted truncate mt-0.5">
                  {Object.entries(p.translations)
                    .filter(([l]) => l !== "en" && !l.startsWith("_") && enabled.includes(l))
                    .slice(0, 4)
                    .map(([l, v]) => `${l}:${v}`)
                    .join(" · ")}
                </div>
              </div>
              <button
                onClick={() => onEdit(p)}
                className="text-accent text-xs cursor-pointer px-1 shrink-0"
                aria-label="Edit phrase"
              >✏️</button>
              <button
                onClick={() => onToggleConfirmDelete(p.key)}
                className="text-xs cursor-pointer whitespace-nowrap shrink-0"
                style={{
                  color: isConfirming ? "#fff" : "#ff5c5c",
                  background: isConfirming ? "#b71c1c" : undefined,
                  borderRadius: 4,
                  padding: "2px 6px",
                }}
              >{isConfirming ? "⚠️" : "🗑️"}</button>
            </div>
            {/* Usage bar */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: "linear-gradient(90deg, #f09848, #e8c364)",
                  }}
                />
              </div>
              <div className="text-[10px] text-text-muted font-mono tabular-nums w-16 text-right">
                {uses} {uses === 1 ? "use" : "uses"}
              </div>
            </div>
            {p.last_used_at && (
              <div className="text-[9px] text-text-muted mt-1">
                last: {new Date(p.last_used_at).toLocaleString()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Admin Phrases: CRUD + usage stats + per-language coverage ─────────────

function PhrasesAdminSection() {
  const phrases = useStorePhrases();
  const [editing, setEditing] = useState<StorePhrase | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [fillingLang, setFillingLang] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  // Drag-and-drop reorder: dragKey + current target index while the user
  // is dragging. On drop we persist the new sort_order via reorderStorePhrases.
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const enabled = getEnabledLangs();

  useEffect(() => { void ensureStorePhrasesLoaded(); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const totalUses = phrases.reduce((n, p) => n + (p.usage_count ?? 0), 0);
  const maxUses = Math.max(1, ...phrases.map(p => p.usage_count ?? 0));
  // Default order = manual sort_order. An optimistic localOrder overlay is
  // used during an in-flight drag-and-drop persist so the UI doesn't flicker.
  const baseSorted = [...phrases].sort((a, b) => a.sort_order - b.sort_order);
  const sorted = localOrder
    ? (localOrder.map(k => baseSorted.find(p => p.key === k)).filter((p): p is StorePhrase => !!p))
    : baseSorted;
  const mostUsed = [...phrases].sort((a, b) => (b.usage_count ?? 0) - (a.usage_count ?? 0))[0];

  const handleDelete = async (key: string) => {
    try {
      await deleteStorePhrase(key);
      showToast(`Deleted '${key}'`);
    } catch (err) {
      reportAdminError(`Delete phrase '${key}'`, err);
    }
  };

  const handleFillLang = async (lang: string) => {
    setFillingLang(lang);
    try {
      const { filled } = await fillPhrasesForLang(lang);
      showToast(filled > 0 ? `✅ Filled ${filled} ${lang} phrases` : `All phrases already have ${lang}`);
    } catch (err) {
      reportAdminError(`Translate phrases to ${lang}`, err);
    }
    setFillingLang(null);
  };

  return (
    <div>
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-card border border-accent/30 text-accent px-4 py-2 rounded-xl text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}

      {/* Header + add button */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-bold">💬 Store-mode phrases</h3>
          <p className="text-[10px] text-text-muted">
            Shown as taps in the Show-in-store view. Translated to every enabled language.
          </p>
        </div>
        <button
          onClick={() => { setEditing({ key: "", emoji: "💬", sort_order: (phrases.length + 1) * 10, translations: {} }); setAdding(true); }}
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white cursor-pointer"
          style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}
        >
          + New phrase
        </button>
      </div>

      {/* Language coverage panel */}
      <div className="bg-card rounded-xl p-3 border border-border mb-3">
        <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">
          Language coverage ({phrases.length} phrases × {enabled.length} langs)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {enabled.map(code => {
            const missing = countMissingForLang(code, phrases);
            const isFilling = fillingLang === code;
            const complete = missing === 0;
            return (
              <button
                key={code}
                onClick={() => !complete && handleFillLang(code)}
                disabled={complete || !!fillingLang || IS_DEMO}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg cursor-pointer disabled:cursor-default"
                style={{
                  background: complete ? "rgba(61,214,140,0.1)" : "rgba(255,176,61,0.1)",
                  color: complete ? "#3dd68c" : "#ffb03d",
                  border: complete ? "1px solid rgba(61,214,140,0.2)" : "1px solid rgba(255,176,61,0.2)",
                }}
                title={complete ? `All ${phrases.length} phrases translated` : `${missing} missing — click to fill`}
              >
                {code} {complete ? "✓" : isFilling ? "⏳" : `${phrases.length - missing}/${phrases.length}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Usage stats summary */}
      {totalUses > 0 && (
        <div className="bg-card rounded-xl p-3 border border-border mb-3">
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">
            Usage
          </div>
          <div className="text-[11px] text-text-soft">
            <span className="font-bold text-text">{totalUses}</span> total taps across all shoppers ·
            most used: <span className="font-bold text-accent">{sorted[0]?.emoji} {sorted[0]?.translations.en}</span>
          </div>
        </div>
      )}

      {/* Phrase list with drag-and-drop reorder */}
      <div className="text-[10px] text-text-muted mb-1.5 px-1">
        Drag the <span aria-hidden="true">⋮⋮</span> handle on the left to reorder.
      </div>
      <PhraseDraggableList
        phrases={sorted}
        maxUses={maxUses}
        enabled={enabled}
        dragKey={dragKey}
        dragOverIdx={dragOverIdx}
        confirmDeleteKey={confirmDeleteKey}
        onStartDrag={(key) => setDragKey(key)}
        onDragOver={(idx) => setDragOverIdx(idx)}
        onEndDrag={async (targetIdx) => {
          const currentIdx = sorted.findIndex(p => p.key === dragKey);
          setDragKey(null);
          setDragOverIdx(null);
          if (currentIdx < 0 || targetIdx == null || targetIdx === currentIdx) return;
          // Build the new ordering: pull the dragged item out, insert at target.
          const newKeys = sorted.map(p => p.key);
          const [moved] = newKeys.splice(currentIdx, 1);
          newKeys.splice(targetIdx, 0, moved);
          setLocalOrder(newKeys);
          try {
            await reorderStorePhrases(newKeys);
            showToast("Order updated");
          } catch (err) {
            reportAdminError("Reordenar frases", err);
          }
          setLocalOrder(null);
        }}
        onEdit={(p) => setEditing(p)}
        onToggleConfirmDelete={(key) => {
          if (confirmDeleteKey === key) {
            handleDelete(key);
            setConfirmDeleteKey(null);
          } else {
            setConfirmDeleteKey(key);
            setTimeout(
              () => setConfirmDeleteKey(prev => prev === key ? null : prev),
              3000,
            );
          }
        }}
      />
      {mostUsed && mostUsed.usage_count! > 0 && (
        <div className="text-[10px] text-text-muted mt-3 px-1">
          Most used on this device: <span className="text-accent font-semibold">{mostUsed.emoji} {mostUsed.translations.en}</span>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <PhraseEditModal
          phrase={editing}
          enabledLangs={enabled}
          isNew={adding}
          onClose={() => { setEditing(null); setAdding(false); }}
          onSaved={(msg) => { showToast(msg); setEditing(null); setAdding(false); }}
        />
      )}
    </div>
  );
}

// Curated emoji set for store-mode phrases — communication, questions,
// money, navigation, politeness, shopping.
const PHRASE_EMOJIS: string[] = [
  "💬", "🗣️", "❓", "❔", "❗", "❕",
  "🔍", "🔎", "📍", "🗺️", "🧭", "👉",
  "💰", "💵", "💸", "🏷️", "💳", "🧾",
  "🙏", "👋", "🤝", "🙋", "🫴", "👌",
  "✅", "❌", "🔄", "🛑", "⚠️", "ℹ️",
  "🛒", "🛍️", "📦", "🎁", "🧺", "🏪",
  "⏰", "🕐", "📅", "⌛", "🕒", "📆",
  "🌍", "💡", "📝", "🎯", "✨", "🌟",
  "🟢", "🔴", "🟡", "🟠", "🟣", "🔵",
  "😊", "🤔", "😇", "🤷", "😅", "🙇",
];

function PhraseEditModal({
  phrase,
  enabledLangs,
  isNew,
  onClose,
  onSaved,
}: {
  phrase: StorePhrase;
  enabledLangs: string[];
  isNew: boolean;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [key, setKey] = useState(phrase.key);
  const [emoji, setEmoji] = useState(phrase.emoji);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({ ...phrase.translations });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!key.trim() || !translations.en?.trim()) return;
    setSaving(true);
    try {
      await upsertStorePhrase({
        ...phrase,
        key: key.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_"),
        emoji: emoji.trim() || "💬",
        translations,
      });
      onSaved(isNew ? `Phrase '${key}' added` : `Phrase '${key}' updated`);
    } catch (err) {
      reportAdminError(`Save phrase '${key}'`, err);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-card rounded-t-2xl p-5 pb-7 w-full max-w-[500px] max-h-[85vh] overflow-auto border-t border-border-light"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-bold mb-3">
          {isNew ? "New phrase" : `Edit: ${phrase.key}`}
        </h3>

        <div className="flex gap-2 mb-2 items-stretch relative">
          {/* Emoji picker trigger — shows the currently selected emoji and
              opens a curated grid on click. */}
          <button
            type="button"
            onClick={() => setEmojiPickerOpen(v => !v)}
            className="shrink-0 flex items-center justify-center rounded-lg bg-bg border text-2xl cursor-pointer active:scale-95 transition-all"
            style={{
              width: 56,
              borderColor: emojiPickerOpen
                ? "var(--color-accent, #f0883e)"
                : "var(--color-border-light, rgba(255,255,255,0.10))",
            }}
            aria-label="Pick emoji"
          >
            {emoji || "💬"}
          </button>
          <input
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="key (e.g. thanks)"
            disabled={!isNew}
            className="flex-1 bg-bg border border-border-light rounded-lg px-3 py-2 text-sm text-text outline-none disabled:opacity-50"
          />
        </div>

        {/* Emoji picker grid */}
        {emojiPickerOpen && (
          <div className="mb-3 bg-bg border border-border-light rounded-xl p-2">
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}
            >
              {PHRASE_EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { setEmoji(e); setEmojiPickerOpen(false); }}
                  className="flex items-center justify-center rounded-lg cursor-pointer active:scale-90 transition-all"
                  style={{
                    height: 40,
                    fontSize: 22,
                    background: emoji === e ? "rgba(240,136,62,0.2)" : "transparent",
                    border: emoji === e ? "1px solid rgba(240,136,62,0.5)" : "1px solid transparent",
                  }}
                  aria-label={`Select ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
            {/* Custom emoji fallback for anything outside the curated set */}
            <div className="mt-2 pt-2 border-t border-border-light flex items-center gap-2">
              <span className="text-[10px] text-text-muted shrink-0">Custom:</span>
              <input
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                placeholder="paste any emoji"
                className="flex-1 bg-card border border-border-light rounded-lg px-2 py-1.5 text-lg text-center outline-none"
                maxLength={4}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          {enabledLangs.map(lang => (
            <div key={lang} className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-text-muted uppercase w-8 tabular-nums">{lang}</span>
              <input
                value={translations[lang] ?? ""}
                onChange={e => setTranslations(prev => ({ ...prev, [lang]: e.target.value }))}
                placeholder={lang === "en" ? "Required (source)" : "optional"}
                className="flex-1 bg-bg border border-border-light rounded-lg px-3 py-2 text-sm text-text outline-none"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            disabled={!key.trim() || !translations.en?.trim() || saving}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm text-text-muted border border-border-light cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// PocketBase has no bulk delete: fetch the ids, then delete in small batches.
// Returns an error message, or null on success.
async function deleteDictionaryRows(ids: string[]): Promise<string | null> {
  try {
    for (let i = 0; i < ids.length; i += 8) {
      await Promise.all(ids.slice(i, i + 8).map(id => pb.collection("dictionary").delete(id)));
    }
    return null;
  } catch (err) {
    console.error("[admin] delete dictionary rows failed", err);
    return describeError(err);
  }
}

async function deleteDictionaryWhere(filter: string): Promise<string | null> {
  try {
    const rows = await pb.collection("dictionary").getFullList<{ id: string }>({ filter, fields: "id", batch: 1000 });
    return deleteDictionaryRows(rows.map(r => r.id));
  } catch (err) {
    console.error("[admin] list dictionary rows failed", err);
    return describeError(err);
  }
}

export default function AdminPage() {
  const { user } = useAuth();
  const lang = user?.lang ?? "en";
  const [tab, setTabState] = useState<Section>(sectionFromHash);
  useEffect(() => {
    const onHash = () => { setTabState(sectionFromHash()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const setTab = (next: Section) => { window.location.hash = next === "home" ? "#admin" : `#admin/${next}`; };
  const [usersQuery, setUsersQuery] = useState("");
  const [usersSort, setUsersSort] = useState<"seen" | "recent" | "name">("seen");
  const [listsQuery, setListsQuery] = useState("");
  const [addLangQuery, setAddLangQuery] = useState("");
  const [showAllLog, setShowAllLog] = useState(false);
  // Desktop (≥1024 px): sidebar layout and table screens.
  const isDesktop = useIsDesktop();
  const [people, setPeople] = useState<PeopleData>(EMPTY_PEOPLE);
  const [openListId, setOpenListId] = useState<string | null>(null);
  const refreshPeople = useCallback(() => { void loadPeople().then(setPeople); }, []);
  useEffect(() => {
    if (isDesktop && (tab === "users" || tab === "lists")) refreshPeople();
  }, [isDesktop, tab, refreshPeople]);
  const [themeSubView, setThemeSubView] = useState<ThemeView>("lists");
  const selectedThemes = useThemeSelection().themes;
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<string | null>(null);
  const [confirmDeleteList, setConfirmDeleteList] = useState<string | null>(null);
  const [collapsedStores, setCollapsedStores] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("babelcart_admin_collapsed_stores");
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch { /* ignore */ }
    return new Set();
  });
  const toggleStoreCollapse = (id: string) => {
    setCollapsedStores(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem("babelcart_admin_collapsed_stores", JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [buildingCategory, setBuildingCategory] = useState<string | null>(null);
  const [generating, setGenerating] = useState<{ mode: GenerateMode; targets: GenerateTarget[] } | null>(null);
  const [storeCatVersion, setStoreCatVersion] = useState(0); // bumps to force re-read of localStorage
  const [addingStore, setAddingStore] = useState(false);
  const [addingCatFor, setAddingCatFor] = useState<string | null>(null);
  const [newStoreForm, setNewStoreForm] = useState({ emoji: "🛒", name: "" });
  const [newCatForm, setNewCatForm] = useState({ emoji: "📦", color: "#8b949e", name: "" });
  const [confirmClearCat, setConfirmClearCat] = useState<string | null>(null);
  const [confirmClearStore, setConfirmClearStore] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [bulkRunning, setBulkRunning] = useState<string | null>(null); // label of current bulk op
  const [openStoreMenu, setOpenStoreMenu] = useState<string | null>(null);
  const [openCatMenu, setOpenCatMenu] = useState<string | null>(null);
  const [confirmDeleteStore, setConfirmDeleteStore] = useState<string | null>(null);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null);
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<string | null>(null);
  const [confirmDisableLang, setConfirmDisableLang] = useState<string | null>(null);

  const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `item_${Date.now()}`;

  const storeTypesWithCats = useMemo(() => {
    void storeCatVersion; // dependency
    return getAllStoreTypesWithCategories();
  }, [storeCatVersion]);
  const [rmCollapsed, setRmCollapsed] = useState<Record<string, boolean>>({});
  const [dictRows, setDictRows] = useState<DictRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [listMembers, setListMembers] = useState<Record<string, number>>({});
  const [listItems, setListItems] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter] = useState("");
  // Catalog filters: entries missing a language, one store type.
  const [catMissingLang, setCatMissingLang] = useState("");
  const [catStore, setCatStore] = useState("");
  const [editingEntry, setEditingEntry] = useState<DictRow | null>(null);
  const [, setNewEntry] = useState(false);
  const [toast, setToast] = useState("");
  const [, forceUpdate] = useState(0);
  const [ciRuns, setCiRuns] = useState<Array<{ id: number; status: string; conclusion: string | null; name: string; head_sha: string; created_at: string; html_url: string }>>([]);
  const [ciLoading, setCiLoading] = useState(false);
  const fetchCI = useCallback(() => {
    setCiLoading(true);
    fetch("https://api.github.com/repos/Sentinelio/ShoppingList/actions/runs?per_page=8")
      .then(r => r.json())
      .then(d => { if (d.workflow_runs) setCiRuns(d.workflow_runs); })
      .catch(err => console.error("[admin] GitHub Actions status", err))
      .finally(() => setCiLoading(false));
  }, []);
  useEffect(() => { fetchCI(); }, [fetchCI]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  // (It used to push this browser's whole localStorage config to the server
  // on mount, which could overwrite newer settings saved from elsewhere.
  // Every setter now saves its own key.)

  const deleteUser = async (userId: string) => {
    if (IS_DEMO) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      showToast("User deleted (demo)");
      return;
    }
    // 1. Reassign lists created by this user to the next active member (instead of deleting)
    let ownedLists: Array<{ id: string }> = [];
    let reassigned = 0;
    let deleted = 0;
    try {
      ownedLists = await pb.collection("lists").getFullList<{ id: string }>({
        filter: pb.filter("created_by = {:userId}", { userId }),
        fields: "id",
      });
      for (const list of ownedLists) {
        // Find another active member to take ownership
        const otherMembers = await pb.collection("list_members").getList<{ id: string; user_id: string }>(1, 1, {
          filter: pb.filter("list_id = {:listId} && status = 'active' && user_id != {:userId}", { listId: list.id, userId }),
        });
        if (otherMembers.items.length > 0) {
          // Reassign list to next member and promote them to owner
          const newOwner = otherMembers.items[0];
          await pb.collection("lists").update(list.id, { created_by: newOwner.user_id });
          await pb.collection("list_members").update(newOwner.id, { role: "owner" });
          reassigned++;
        } else {
          // No other members — safe to delete the list
          await pb.collection("lists").delete(list.id);
          deleted++;
        }
      }
      // 2. Deleting the user cascades its list_members rows
      // 3. Finally delete the user
      await pb.collection("users").delete(userId);
    } catch (error) {
      reportAdminError("Delete user", error);
      fetchLists();
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
    if (deleted > 0) setLists(prev => prev.filter(l => !ownedLists.some(ol => ol.id === l.id) || reassigned > 0));
    const parts: string[] = ["User deleted"];
    if (reassigned > 0) parts.push(`${reassigned} list${reassigned > 1 ? "s" : ""} reassigned`);
    if (deleted > 0) parts.push(`${deleted} empty list${deleted > 1 ? "s" : ""} removed`);
    showToast(parts.join(" · "));
    fetchLists(); // refresh to show new ownership
  };

  const bulkUpdateLists = async (field: BulkField, value: boolean | string) => {
    setPeople(prev => ({ ...prev, lists: prev.lists.map(l => ({ ...l, [field]: value })) }));
    if (IS_DEMO) return;
    const ids = people.lists.map(l => l.id);
    const results = await Promise.allSettled(ids.map(id => pb.collection("lists").update(id, { [field]: value })));
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failed.length) reportAdminError(`${field}: ${failed.length} of ${ids.length} lists failed`, failed[0].reason);
    refreshPeople();
  };

  const deleteListFromAdmin = async (listId: string) => {
    if (IS_DEMO) {
      setLists(prev => prev.filter(l => l.id !== listId));
      showToast("List deleted (demo)");
      return;
    }
    try {
      await pb.collection("lists").delete(listId);
    } catch (error) {
      reportAdminError("Delete list", error);
      return;
    }
    setLists(prev => prev.filter(l => l.id !== listId));
    showToast("List deleted");
  };

  const clearDictionary = async (onlyCategory?: string) => {
    if (IS_DEMO) {
      showToast("Demo mode — local dictionary only");
      return;
    }
    const error = await deleteDictionaryWhere(
      onlyCategory ? pb.filter("category = {:c}", { c: onlyCategory }) : "",
    );
    if (error) { reportAdminError(onlyCategory ? `Clear category '${onlyCategory}'` : "Clear dictionary", new Error(error)); return; }
    showToast(onlyCategory ? `Cleared category '${onlyCategory}'` : "Dictionary cleared");
    fetchDictionary();
  };

  const clearCategories = async (ids: string[]) => {
    if (IS_DEMO) { showToast("Demo mode — local dictionary only"); return; }
    if (ids.length === 0) return;
    const error = await deleteDictionaryWhere(
      pb.filter(ids.map((_, i) => `category = {:c${i}}`).join(" || "), Object.fromEntries(ids.map((c, i) => [`c${i}`, c]))),
    );
    if (error) { reportAdminError("Clear categories", new Error(error)); return; }
    showToast(`Cleared ${ids.length} categories`);
    fetchDictionary();
  };

  // Delete dictionary entries whose `category` is no longer in CATEGORY_ORDER
  const cleanOrphanEntries = async () => {
    if (IS_DEMO) { showToast("Demo mode — nothing to clean"); return; }
    const valid = new Set(CATEGORY_ORDER);
    const orphans = dictRows.filter(d => !valid.has(d.category));
    if (orphans.length === 0) { showToast("No orphan entries found"); return; }
    const error = await deleteDictionaryRows(orphans.map(o => o.id).filter((id): id is string => !!id));
    if (error) { reportAdminError("Clean orphan entries", new Error(error)); return; }
    showToast(`🧹 Cleaned ${orphans.length} orphan entries`);
    fetchDictionary();
  };

  // Remove a specific language key from every dictionary entry's translations JSON
  const purgeLanguageFromDictionary = async (langCode: string) => {
    if (IS_DEMO) return { updated: 0 };
    let updated = 0;
    let failed = 0;
    let firstError: unknown = null;
    for (const row of dictRows) {
      if (!row.translations || !(langCode in row.translations)) continue;
      const next: Record<string, string> = { ...row.translations };
      delete next[langCode];
      try {
        await upsertByKey("dictionary", row.key, { translations: next });
        updated++;
      } catch (err) {
        failed++;
        firstError ??= err;
      }
    }
    if (failed) reportAdminError(`Quitar ${langCode} del diccionario (${failed} fallos)`, firstError);
    return { updated };
  };

  // Call the translate route for a single item and return its translation in a target language
  const translateOne = async (text: string, targetLang: string): Promise<string | null> => {
    try {
      const data = await callRoute<{ t?: Record<string, string> }>("translate", { text, langs: [targetLang] });
      if (data?.t?.[targetLang]) return String(data.t[targetLang]);
    } catch (err) {
      console.error(`[admin] translate '${text}' → ${targetLang} failed`, err);
      throw err;
    }
    return null;
  };

  // Fill missing translations for a specific language across the whole dictionary
  const fillLanguageTranslations = async (langCode: string) => {
    if (IS_DEMO) { showToast("Demo mode — nothing to fill"); return; }
    const missing = dictRows.filter(d => !d.translations || !d.translations[langCode]);
    if (missing.length === 0) { showToast(`All items already have ${langCode} translations`); return; }
    setBulkRunning(`fillLang:${langCode}`);
    let done = 0;
    let failed = 0;
    let firstError: unknown = null;
    const CONCURRENCY = 4;
    for (let i = 0; i < missing.length; i += CONCURRENCY) {
      const slice = missing.slice(i, i + CONCURRENCY);
      await Promise.all(slice.map(async row => {
        try {
          const translated = await translateOne(row.key, langCode);
          if (!translated) return;
          const next = { ...(row.translations || {}), [langCode]: translated };
          await upsertByKey("dictionary", row.key, { translations: next });
          done++;
        } catch (err) {
          failed++;
          firstError ??= err;
        }
      }));
      showToast(`Translating ${langCode}: ${done}/${missing.length}`);
    }
    setBulkRunning(null);
    if (failed) reportAdminError(`Translate dictionary to ${langCode}: ${failed} of ${missing.length} failed`, firstError);
    showToast(`✅ Filled ${done}/${missing.length} ${langCode} translations`);
    fetchDictionary();
  };

  // "Generate": opens a dialog that says how many entries, where and in which
  // languages before calling Claude (it used to start straight away).
  const openGenerate = (categoryIds: string[], mode: GenerateMode = "generic") => {
    if (IS_DEMO) { showToast("Connect the backend first"); return; }
    const targets: GenerateTarget[] = [];
    for (const id of categoryIds) {
      const seed = SEED_CATEGORIES.find(s => s.category === id);
      if (!seed) continue;
      const st = storeTypesWithCats.find(s => s.categories.some(c => c.id === id));
      const cat = st?.categories.find(c => c.id === id);
      const label = (o: object | undefined, fallback: string) => (o as Record<string, string> | undefined)?.[lang] || (o as Record<string, string> | undefined)?.en || fallback;
      targets.push({
        seed,
        catLabel: label(cat, seed.name),
        catEmoji: cat?.emoji ?? "📦",
        storeLabel: label(st, seed.storeType),
        storeEmoji: st?.emoji ?? "🏬",
        existing: dictRows.filter(d => d.category === id).length,
      });
    }
    if (targets.length === 0) { showToast("No seed configs found"); return; }
    setGenerating({ mode, targets });
  };

  const runGenerate = async (target: GenerateTarget, count: number, mode: GenerateMode): Promise<GenerateResult> => {
    const { seed } = target;
    setBuildingCategory(seed.category);
    try {
      const data = await callRoute<{ inserted?: number; generated?: number; created?: number; updated?: number; unchanged?: number; dry_run?: boolean }>("seed-dictionary", {
        count,
        // For brands we reuse the seed prompt only as a section label to
        // steer Claude toward the right product space (e.g. "drinks",
        // "snacks, cookies, chocolate").
        prompt: seed.prompt,
        category: seed.category,
        storeType: seed.storeType,
        mode,
        langs: getEnabledLangs(),
      });
      if (data.dry_run) return { created: 0, updated: 0, unchanged: 0, dryRun: true };
      const result = { created: data.created ?? data.inserted ?? 0, updated: data.updated ?? 0, unchanged: data.unchanged ?? 0 };
      if (!data.generated) throw new Error("Claude returned no entries (see the server log)");
      return result;
    } catch (err) {
      reportAdminError(`Generate ${target.catLabel}`, err);
      throw new Error(describeError(err));
    } finally {
      setBuildingCategory(null);
      fetchDictionary();
    }
  };

  // Fetch data based on tab
  const fetchDictionary = useCallback(async () => {
    setLoading(true);
    if (IS_DEMO) {
      setDictRows(LOCAL_DICTIONARY.map(d => ({
        key: d.en || "",
        translations: Object.fromEntries(Object.entries(d).filter(([k]) => k !== "cat")),
        category: d.cat,
        created_at: "",
      })));
    } else {
      const all = await pb.collection("dictionary")
        .getFullList<DictRow>({ sort: "-created_at", batch: 1000 })
        .catch((err) => { reportAdminError("Load dictionary", err); return [] as DictRow[]; });
      setDictRows(all);
    }
    setLoading(false);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    if (!IS_DEMO) {
      const data = await pb.collection("users").getFullList<UserRow>({ sort: "-created_at" })
        .catch((err) => { reportAdminError("Load users", err); return null; });
      if (data) setUsers(data);
    }
    setLoading(false);
  }, []);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    if (!IS_DEMO) {
      const data = await pb.collection("lists").getFullList<ListRow>({ sort: "-created_at" })
        .catch((err) => { reportAdminError("Load lists", err); return null; });
      if (data) setLists(data);
      // Fetch member counts
      const members = await pb.collection("list_members")
        .getFullList<{ list_id: string; status: string }>({ fields: "list_id,status" })
        .catch((err) => { reportAdminError("Load members", err); return null; });
      if (members) {
        const counts: Record<string, number> = {};
        members.forEach(m => {
          if (m.status === "active") counts[m.list_id] = (counts[m.list_id] || 0) + 1;
        });
        setListMembers(counts);
      }
      // Fetch item counts
      const items = await pb.collection("items")
        .getFullList<{ list_id: string }>({ fields: "list_id" })
        .catch((err) => { reportAdminError("Load items", err); return null; });
      if (items) {
        const counts: Record<string, number> = {};
        items.forEach(i => {
          counts[i.list_id] = (counts[i.list_id] || 0) + 1;
        });
        setListItems(counts);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "catalog" || tab === "languages") fetchDictionary();
    if (tab === "users") fetchUsers();
    if (tab === "lists") fetchLists();
    if (tab === "stats" || tab === "home") { fetchDictionary(); fetchUsers(); fetchLists(); }
  }, [tab, fetchDictionary, fetchUsers, fetchLists]);

  // Save dictionary entry
  const saveEntry = async (key: string, translations: Record<string, string>, category: string) => {
    if (IS_DEMO) { showToast("Demo mode — can't save"); return; }
    try {
      await upsertByKey("dictionary", key.toLowerCase().trim(), { translations, category });
    } catch (err) {
      reportAdminError(`Save '${key}'`, err);
      return;
    }
    showToast("Saved!");
    fetchDictionary();
    setEditingEntry(null);
    setNewEntry(false);
  };

  const deleteEntry = async (key: string) => {
    if (IS_DEMO) return;
    const row = dictRows.find(r => r.key === key);
    if (!row?.id) { reportAdminError(`Delete '${key}'`, new Error("Entry not found in the loaded dictionary")); return; }
    try {
      await pb.collection("dictionary").delete(row.id);
    } catch (err) {
      reportAdminError(`Delete '${key}'`, err);
      return;
    }
    showToast("Deleted");
    fetchDictionary();
  };

  // Filter dictionary
  const storeOfCategory = useMemo(() => {
    const m: Record<string, string> = {};
    for (const st of storeTypesWithCats) for (const c of st.categories) m[c.id] = st.id;
    return m;
  }, [storeTypesWithCats]);
  const filteredDict = useMemo(() => dictRows.filter(row => {
    const q = search.toLowerCase();
    const matchSearch = !search || row.key.includes(q) ||
      Object.values(row.translations).some(v => v.toLowerCase().includes(q));
    const matchCat = !catFilter || row.category === catFilter;
    const matchMissing = !catMissingLang || !row.translations?.[catMissingLang];
    const matchStore = !catStore || storeOfCategory[row.category] === catStore;
    return matchSearch && matchCat && matchMissing && matchStore;
  }), [dictRows, search, catFilter, catMissingLang, catStore, storeOfCategory]);
  // Flat results (instead of the store/category tree) while searching or filtering by language.
  const catalogFlat = !!search || !!catMissingLang;
  const dictPage = useShowMore(filteredDict, `${search}|${catMissingLang}|${catStore}`);

  // Admin home: sections grouped, each with a one-line summary and an
  // alert when something needs attention.
  const enabledForHome = getEnabledLangs();
  const missingLangRows = dictRows.filter(r => enabledForHome.some(c => !r.translations?.[c])).length;
  const weekAgo = Date.now() - 7 * 864e5;
  const newUsers = users.filter(u => new Date(u.created_at).getTime() > weekAgo).length;
  const lastRun = ciRuns[0];
  const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const usersFiltered = useMemo(() => {
    const rows = matchUsers(users, usersQuery);
    const time = (v?: string | null) => (v ? new Date(v).getTime() : 0);
    return [...rows].sort((a, b) =>
      usersSort === "name" ? a.name.localeCompare(b.name)
        : usersSort === "recent" ? time(b.created_at) - time(a.created_at)
        : time(b.last_seen_at) - time(a.last_seen_at));
  }, [users, usersQuery, usersSort]);
  const usersPage = useShowMore(usersFiltered, `${usersQuery}|${usersSort}`);
  const listsFiltered = useMemo(() => {
    const q = norm(listsQuery.trim());
    return lists.filter(l => !q || norm(`${l.name} ${l.code}`).includes(q));
  }, [lists, listsQuery]);
  const listsPage = useShowMore(listsFiltered, listsQuery);

  const homeGroups: { title: string; entries: HomeEntry<Tab>[] }[] = [
    { title: "Content", entries: [
      { key: "catalog", icon: "📦", label: "Catalog", summary: `${dictRows.length} entries · ${storeTypesWithCats.length} store types`,
        alert: missingLangRows ? `${missingLangRows} missing a language` : undefined },
      { key: "phrases", icon: "💬", label: "Phrases", summary: "Phrases to show shop staff" },
      { key: "languages", icon: "🌍", label: "Languages", summary: `${enabledForHome.length} enabled · ${enabledForHome.join(", ")}` },
    ] },
    { title: "People", entries: [
      { key: "users", icon: "👥", label: "Users", summary: `${users.length} users`, alert: newUsers ? `${newUsers} new this week` : undefined },
      { key: "lists", icon: "📝", label: "Lists", summary: `${lists.length} lists · ${Object.values(listItems).reduce((a, b) => a + b, 0)} items` },
    ] },
    { title: "Appearance", entries: [
      { key: "themes", icon: "🎨", label: "Themes", summary: THEME_VIEWS.map(v => `${VIEW_LABELS[v]}: ${getPalette(selectedThemes[v]).name}`).join(" · ") },
    ] },
    { title: "System", entries: [
      { key: "stats", icon: "📊", label: "Stats", summary: "Catalog by store, category and language; users by country" },
      { key: "changelog", icon: "📰", label: "Versions & status", summary: `${CHANGELOG[0]?.version ?? ""} · ${CHANGELOG[0]?.title ?? ""}`,
        alert: lastRun?.conclusion === "failure" ? "Last deploy failed" : undefined },
      { key: "roadmap", icon: "🗺️", label: "Roadmap", summary: "Done and what comes next" },
    ] },
  ];
  const navGroups: NavGroup<Tab>[] = homeGroups.map(g => ({
    title: g.title,
    entries: g.entries.map(e => ({ key: e.key, icon: e.icon, label: e.label })),
  }));
  const wrapContent = (node: React.ReactNode) => isDesktop
    ? <DesktopShell groups={navGroups} current={tab} onOpen={setTab}>{node}</DesktopShell>
    : <div className="px-4 py-4">{node}</div>;


  return (
    <div className="min-h-screen bg-bg text-text" style={isDesktop ? undefined : { maxWidth: 960, margin: "0 auto" }}>
      {generating && (
        <GenerateDialog
          mode={generating.mode}
          targets={generating.targets}
          langs={getEnabledLangs()}
          run={(t, count) => runGenerate(t, count, generating.mode)}
          onClose={(ran) => {
            // One category: open it so the new entries are in view.
            if (ran && generating.targets.length === 1) setExpandedCategory(generating.targets[0].seed.category);
            setGenerating(null);
          }}
        />
      )}
      {/* Keyframes kept outside the header so they're not a 0-width flex item. */}
      <style>{`
        @keyframes admin-status-pulse {
          0%, 100% { box-shadow: 0 0 0 0 ${IS_DEMO ? "rgba(255,92,92,0.6)" : "rgba(61,214,140,0.6)"}; opacity: 1; }
          50%      { box-shadow: 0 0 0 6px ${IS_DEMO ? "rgba(255,92,92,0)" : "rgba(61,214,140,0)"}; opacity: 0.75; }
        }
      `}</style>

      {/* Header — bypass Tailwind utilities entirely to avoid any theme/flex
          class ambiguity and force title LEFT / status RIGHT on a single row. */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 16px",
          background: "var(--color-bg, #0d1017)",
          borderBottom: "1px solid var(--color-border-light, rgba(255,255,255,0.10))",
          width: "100%",
        }}
      >
        <h1
          style={{
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1,
            margin: 0,
            color: "var(--color-text, #e6e8ee)",
            flex: "0 0 auto",
            textAlign: "left",
          }}
        >
          🛠️ Admin Panel
        </h1>
        <ConnectionBadge />
      </header>

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-card border border-accent/30 text-accent px-4 py-2 rounded-xl text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}

      <AdminErrorBanner lang={lang} />

      {wrapContent(<>
        {tab === "home" ? (
          <AdminHome groups={homeGroups} onOpen={setTab} />
        ) : isDesktop ? (
          tab !== "users" && tab !== "lists" && <TopBar title={SECTION_TITLES[tab]} />
        ) : (
          <SectionHeader title={SECTION_TITLES[tab]} onBack={() => setTab("home")} />
        )}
        {loading && tab !== "home" && !(isDesktop && (tab === "users" || tab === "lists")) && <div className="text-center py-8 text-text-muted animate-pulse">Loading…</div>}

        {isDesktop && tab === "users" && (
          <UsersDesktop data={people}
            onDelete={async id => { await deleteUser(id); refreshPeople(); }}
            onOpenList={id => { setOpenListId(id); setTab("lists"); }} />
        )}
        {isDesktop && tab === "lists" && (
          <ListsDesktop data={people} openId={openListId} onOpen={setOpenListId}
            onDelete={async id => { await deleteListFromAdmin(id); refreshPeople(); }}
            onBulkUpdate={bulkUpdateLists} />
        )}

        {/* ── Stats ── */}
        {tab === "stats" && !loading && (() => {
          const enabledLangsList = getEnabledLangs();
          // In demo mode dictRows is sourced from LOCAL_DICTIONARY so we must not add it again.
          const totalDict = dictRows.length;
          // dict by store type
          const dictByStore = storeTypesWithCats.map(st => {
            const catIds = new Set(st.categories.map(c => c.id));
            const n = dictRows.filter(d => catIds.has(d.category)).length;
            return { st, n };
          }).sort((a, b) => b.n - a.n);
          // dict by language coverage
          const dictByLang = enabledLangsList.map(code => {
            const n = dictRows.filter(d => d.translations && d.translations[code]).length;
            const meta = ALL_LANGUAGES.find(l => l.code === code);
            return { code, name: meta?.name || code, flag: meta?.flag || "🌍", n };
          }).sort((a, b) => b.n - a.n);
          // users by country
          const usersByCountry: Record<string, number> = {};
          users.forEach(u => { usersByCountry[u.country] = (usersByCountry[u.country] || 0) + 1; });
          const usersByCountryList = Object.entries(usersByCountry).sort((a, b) => b[1] - a[1]);
          // users by language
          const usersByLang: Record<string, number> = {};
          users.forEach(u => { usersByLang[u.lang] = (usersByLang[u.lang] || 0) + 1; });
          const usersByLangList = Object.entries(usersByLang).sort((a, b) => b[1] - a[1]);
          // lists stats
          const totalListMembers = Object.values(listMembers).reduce((a, b) => a + b, 0);
          const totalListItems = Object.values(listItems).reduce((a, b) => a + b, 0);

          return (
            <div className="space-y-3">
              {/* Key figures */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Catalog entries", value: dictRows.length, to: "catalog" as Tab },
                  { label: "Users", value: users.length, to: "users" as Tab },
                  { label: "Lists", value: lists.length, to: "lists" as Tab },
                  { label: "Items in lists", value: totalListItems, to: "lists" as Tab },
                ].map(k => (
                  <button key={k.label} type="button" onClick={() => setTab(k.to)}
                    className="bg-card rounded-xl p-3 border border-border text-left cursor-pointer active:bg-text/5">
                    <div className="text-[24px] font-bold text-text leading-tight">{k.value}</div>
                    <div className="text-text-muted text-[11px]">{k.label}</div>
                  </button>
                ))}
              </div>

              {/* Things to look at: each opens the catalog already filtered */}
              {(() => {
                const alerts: { text: string; action: () => void }[] = [];
                for (const l of [...dictByLang].sort((a, b) => a.n - b.n)) {
                  const missing = totalDict - l.n;
                  if (missing > 0) alerts.push({
                    text: `${l.flag} ${missing} ${missing === 1 ? "entry" : "entries"} missing ${l.name}`,
                    action: () => { setSearch(""); setCatStore(""); setCatMissingLang(l.code); setTab("catalog"); },
                  });
                }
                const emptyStores = dictByStore.filter(d => d.n === 0);
                if (emptyStores.length) alerts.push({
                  text: `🏬 ${emptyStores.length} store types with no entries`,
                  action: () => { setSearch(""); setCatMissingLang(""); setCatStore(emptyStores[0].st.id); setTab("catalog"); },
                });
                if (!alerts.length) return (
                  <div className="rounded-xl p-3 text-[13px]" style={{ background: "color-mix(in srgb, var(--color-success) 10%, transparent)", color: "var(--color-success)" }}>
                    ✅ The whole catalog is in every enabled language.
                  </div>
                );
                return (
                  <div>
                    <h3 className="px-1 mb-2 text-[11px] font-bold uppercase tracking-wider text-text-muted">To review</h3>
                    <div className="rounded-[14px] bg-card divide-y divide-border overflow-hidden">
                      {alerts.map(a => (
                        <button key={a.text} type="button" onClick={a.action}
                          className="w-full flex items-center gap-2 px-3 min-h-[48px] text-left text-[13px] text-text cursor-pointer active:bg-text/5">
                          <span className="flex-1 min-w-0 truncate">{a.text}</span>
                          <span className="text-text-muted" aria-hidden="true">›</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Maintenance: orphan entries */}
              {(() => {
                const valid = new Set(CATEGORY_ORDER);
                const orphans = dictRows.filter(d => !valid.has(d.category));
                if (orphans.length === 0) return null;
                const confirming = confirmClearAll; // reuse same confirm state for simple 2-step
                return (
                  <div className="bg-card rounded-xl p-3 border border-border">
                    <h3 className="text-xs font-bold mb-2">🧹 Maintenance</h3>
                    <div className="text-[11px] text-text-muted mb-2">
                      Found <span className="text-danger font-semibold">{orphans.length}</span> dictionary entries pointing to categories that no longer exist.
                    </div>
                    <button
                      onClick={() => {
                        if (confirming) {
                          cleanOrphanEntries();
                          setConfirmClearAll(false);
                        } else {
                          setConfirmClearAll(true);
                          setTimeout(() => setConfirmClearAll(false), 3000);
                        }
                      }}
                      className="w-full py-2 rounded-lg text-[11px] font-semibold cursor-pointer"
                      style={{
                        background: confirming ? "#b71c1c" : "rgba(255,92,92,0.08)",
                        color: confirming ? "#fff" : "#ff5c5c",
                        border: confirming ? "1px solid #b71c1c" : "1px solid rgba(255,92,92,0.15)",
                      }}
                    >
                      {confirming ? `⚠️ Confirm delete ${orphans.length} orphans` : `🧹 Clean ${orphans.length} orphan entries`}
                    </button>
                  </div>
                );
              })()}

              <h3 className="px-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-text-muted">Details</h3>
              {/* Dictionary by store type */}
              <Collapsible title="🏪 Catalog by store type" summary={`${dictByStore.filter(d => d.n > 0).length} with entries`}>
                {dictByStore.map(({ st, n }) => (
                  <div key={st.id} className="flex items-center gap-2 py-1">
                    <span className="text-sm w-5">{st.emoji}</span>
                    <span className="text-[11px] text-text-soft flex-1 truncate">{(st as unknown as Record<string, string>)[lang] || st.en}</span>
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (n / Math.max(1, totalDict)) * 100)}%`, background: "#f0883e" }} />
                    </div>
                    <span className="text-[10px] text-text-muted w-10 text-right">{n}</span>
                  </div>
                ))}
              </Collapsible>

              {/* Dictionary by category */}
              <Collapsible title="🏷️ Catalog by category" summary={`${new Set(dictRows.map(d => d.category)).size} categories`}>
                <div>
                  {storeTypesWithCats.flatMap(st => st.categories.map(c => {
                    const total = dictRows.filter(d => d.category === c.id).length;
                    if (total === 0) return null;
                    return (
                      <div key={`${st.id}:${c.id}`} className="flex items-center gap-2 py-1">
                        <span className="text-[10px] w-4">{c.emoji}</span>
                        <span className="text-[10px] text-text-muted w-4">{st.emoji}</span>
                        <span className="text-[11px] text-text-soft flex-1 truncate">{(c as unknown as Record<string, string>)[lang] || c.en}</span>
                        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, (total / Math.max(1, totalDict)) * 100 * 3)}%`, background: c.color || "#888" }} />
                        </div>
                        <span className="text-[10px] text-text-muted w-10 text-right">{total}</span>
                      </div>
                    );
                  }))}
                </div>
              </Collapsible>

              {/* Dictionary by language */}
              <Collapsible title="🌍 Catalog languages" summary={`${dictByLang.filter(l => l.n === totalDict).length}/${dictByLang.length} complete`}>
                {dictByLang.map(l => (
                  <div key={l.code} className="flex items-center gap-2 py-1">
                    <span className="text-sm w-5">{l.flag}</span>
                    <span className="text-[11px] text-text-soft flex-1 truncate">{l.name} <span className="text-text-muted">{l.code}</span></span>
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (l.n / Math.max(1, totalDict)) * 100)}%`, background: "#34d6c0" }} />
                    </div>
                    <span className="text-[10px] text-text-muted w-16 text-right">{l.n} / {totalDict}</span>
                  </div>
                ))}
              </Collapsible>

              {/* Users by country / language */}
              {!IS_DEMO && users.length > 0 && (
                <>
                  <Collapsible title="🗺️ Users by country" summary={`${usersByCountryList.length} countries`}>
                    {usersByCountryList.slice(0, 20).map(([code, n]) => {
                      const c = getCountries().find(cc => cc.code === code);
                      return (
                        <div key={code} className="flex items-center gap-2 py-1">
                          <span className="text-sm w-5">{c?.flag || "🌍"}</span>
                          <span className="text-[11px] text-text-soft flex-1 truncate">{c?.name || code}</span>
                          <span className="text-[11px] text-text-muted">{n}</span>
                        </div>
                      );
                    })}
                  </Collapsible>
                  <Collapsible title="💬 Users by language" summary={`${usersByLangList.length} languages`}>
                    {usersByLangList.slice(0, 20).map(([code, n]) => {
                      const l = ALL_LANGUAGES.find(ll => ll.code === code);
                      return (
                        <div key={code} className="flex items-center gap-2 py-1">
                          <span className="text-sm w-5">{l?.flag || "🌍"}</span>
                          <span className="text-[11px] text-text-soft flex-1 truncate">{l?.name || code}</span>
                          <span className="text-[11px] text-text-muted">{n}</span>
                        </div>
                      );
                    })}
                  </Collapsible>
                  <Collapsible title="📝 Lists" summary={`${lists.length} lists`}>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div><div className="text-lg font-bold text-text">{lists.length}</div><div className="text-[10px] text-text-muted">Lists</div></div>
                      <div><div className="text-lg font-bold text-text">{totalListMembers}</div><div className="text-[10px] text-text-muted">Active members</div></div>
                      <div><div className="text-lg font-bold text-text">{totalListItems}</div><div className="text-[10px] text-text-muted">Items</div></div>
                    </div>
                  </Collapsible>
                </>
              )}
            </div>
          );
        })()}

        {/* ── Catalog (Stores + Categories + Dictionary + Builder unified) ── */}
        {tab === "catalog" && (
          <div>
            <SearchBox value={search} onChange={setSearch} placeholder="Search in any language" />
            <div className="flex gap-2 mb-3">
              <select value={catStore} onChange={e => setCatStore(e.target.value)} aria-label="Store type"
                className="flex-1 min-w-0 h-10 px-2 rounded-xl bg-card border border-border-light text-[13px] text-text cursor-pointer">
                <option value="">🏬 All store types</option>
                {storeTypesWithCats.map(st => (
                  <option key={st.id} value={st.id}>{st.emoji} {(st as unknown as Record<string, string>)[lang] || st.en}</option>
                ))}
              </select>
              <select value={catMissingLang} onChange={e => setCatMissingLang(e.target.value)} aria-label="Missing language"
                className="flex-1 min-w-0 h-10 px-2 rounded-xl bg-card border border-border-light text-[13px] text-text cursor-pointer">
                <option value="">🌍 All languages</option>
                {getEnabledLangs().map(code => {
                  const missing = dictRows.filter(r => !r.translations?.[code]).length;
                  return <option key={code} value={code}>Missing {code} ({missing})</option>;
                })}
              </select>
            </div>
            {catMissingLang && !IS_DEMO && filteredDict.length > 0 && (
              <button type="button" onClick={() => fillLanguageTranslations(catMissingLang)} disabled={!!bulkRunning}
                className="w-full mb-3 h-11 rounded-xl text-[13px] font-bold cursor-pointer disabled:opacity-40"
                style={{ background: "color-mix(in srgb, var(--color-success) 12%, transparent)", color: "var(--color-success)" }}>
                {bulkRunning === `fillLang:${catMissingLang}` ? "⏳ Translating…" : `🧠 Translate the missing ones to ${catMissingLang}`}
              </button>
            )}

            {/* Search / filter results (flat list) */}
            {catalogFlat && (
              <div className="mb-4">
                <div className="text-text-muted text-xs mb-2 px-1">{filteredDict.length} {filteredDict.length === 1 ? "entry" : "entries"}</div>
                <div className="space-y-1.5">
                  {dictPage.visible.map(row => {
                    const catData = CATEGORIES[row.category] ?? CATEGORIES.other;
                    return (
                      <div key={row.key} className="bg-card rounded-lg p-2 border border-border flex items-center gap-2">
                        <span className="text-base shrink-0">{catData.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate flex items-center gap-1">
                            {row.key}
                            {row.is_brand && (
                              <span className="text-[8px] font-bold px-1 py-0.5 rounded" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>
                                ® BRAND
                              </span>
                            )}
                          </div>
                          <div className="text-text-muted text-[10px] truncate">
                            {catMissingLang
                              ? `${getEnabledLangs().filter(c => !row.translations?.[c]).map(c => `no ${c}`).join(" · ")} · ${Object.entries(row.translations).slice(0, 2).map(([l, v]) => `${l}:${v}`).join(" · ")}`
                              : Object.entries(row.translations).slice(0, 3).map(([l, v]) => `${l}:${v}`).join(" · ")}
                          </div>
                        </div>
                        <button onClick={() => setEditingEntry(row)} className="text-accent text-xs cursor-pointer px-1">✏️</button>
                        <button
                          onClick={() => {
                            if (confirmDeleteEntry === row.key) {
                              deleteEntry(row.key);
                              setConfirmDeleteEntry(null);
                            } else {
                              setConfirmDeleteEntry(row.key);
                              setTimeout(() => setConfirmDeleteEntry(prev => prev === row.key ? null : prev), 3000);
                            }
                          }}
                          className="text-xs cursor-pointer px-1 whitespace-nowrap"
                          style={{ color: confirmDeleteEntry === row.key ? "#fff" : "#ff5c5c", background: confirmDeleteEntry === row.key ? "#b71c1c" : undefined, borderRadius: 4, padding: "2px 6px" }}
                        >{confirmDeleteEntry === row.key ? "⚠️" : "🗑️"}</button>
                      </div>
                    );
                  })}
                  <ShowMore remaining={dictPage.remaining} onMore={dictPage.more} />
                </div>
              </div>
            )}

            {/* Global actions: + Store type · Generate all · Clear all (1/3 each) */}
            {!catalogFlat && (
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => { setAddingStore(true); setNewStoreForm({ emoji: "🛒", name: "" }); }}
                  className="w-1/3 py-2 rounded-lg text-[11px] font-semibold text-white cursor-pointer"
                  style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}
                >
                  + Store type
                </button>
                <button
                  onClick={() => {
                    const allIds = storeTypesWithCats.filter(st => !catStore || st.id === catStore).flatMap(st => st.categories.map(c => c.id));
                    openGenerate(allIds);
                  }}
                  disabled={!!bulkRunning}
                  className="w-1/3 py-2 rounded-lg text-[11px] font-semibold cursor-pointer disabled:opacity-40"
                  style={{ background: "rgba(61,214,140,0.1)", color: "#3dd68c", border: "1px solid rgba(61,214,140,0.2)" }}
                >
                  {buildingCategory ? "⏳ Generating…" : catStore ? "🧠 Generate store" : "🧠 Generate all"}
                </button>
                <button
                  onClick={() => {
                    if (confirmClearAll) {
                      const allIds = storeTypesWithCats.filter(st => !catStore || st.id === catStore).flatMap(st => st.categories.map(c => c.id));
                      clearCategories(allIds);
                      setConfirmClearAll(false);
                    } else {
                      setConfirmClearAll(true);
                      setTimeout(() => setConfirmClearAll(false), 3000);
                    }
                  }}
                  disabled={!!bulkRunning}
                  className="w-1/3 py-2 rounded-lg text-[11px] font-semibold cursor-pointer disabled:opacity-40"
                  style={{
                    background: confirmClearAll ? "#b71c1c" : "rgba(255,92,92,0.08)",
                    color: confirmClearAll ? "#fff" : "#ff5c5c",
                    border: confirmClearAll ? "1px solid #b71c1c" : "1px solid rgba(255,92,92,0.15)",
                  }}
                >
                  {confirmClearAll ? "⚠️ Confirm clear" : catStore ? "🧹 Clear store" : "🧹 Clear all"}
                </button>
              </div>
            )}

            {/* Add store type form */}
            {addingStore && (
              <div className="bg-card rounded-xl p-3 border border-accent/30 mb-3 space-y-2">
                <div className="text-xs font-bold mb-1">New store type</div>
                <div className="flex gap-2">
                  <input
                    value={newStoreForm.emoji}
                    onChange={e => setNewStoreForm(p => ({ ...p, emoji: e.target.value }))}
                    placeholder="🛒"
                    className="w-14 bg-bg border border-border-light rounded-lg px-2 py-2 text-sm text-text outline-none text-center"
                  />
                  <input
                    value={newStoreForm.name}
                    onChange={e => setNewStoreForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Name (e.g. Bookstore)"
                    className="flex-1 bg-bg border border-border-light rounded-lg px-2 py-2 text-sm text-text outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!newStoreForm.name.trim()) return;
                      const id = slugify(newStoreForm.name);
                      const name = newStoreForm.name.trim();
                      addCustomStoreType({
                        id,
                        emoji: newStoreForm.emoji.trim() || "🛒",
                        en: name,
                        es: name,
                        pl: name,
                      });
                      setStoreCatVersion(v => v + 1);
                      setAddingStore(false);
                      showToast("Store type added");
                    }}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}
                  >Save</button>
                  <button onClick={() => setAddingStore(false)} className="px-3 py-2 rounded-lg text-xs text-text-muted border border-border-light cursor-pointer">Cancel</button>
                </div>
              </div>
            )}

            {/* Store types with categories */}
            <div className="space-y-2">
              {(catalogFlat ? [] : storeTypesWithCats.filter(st => !catStore || st.id === catStore)).map((st: StoreTypeWithCategories) => {
                const isCollapsed = collapsedStores.has(st.id) && st.id !== catStore;
                const storeCatIds = new Set(st.categories.map(c => c.id));
                const storeItemCount = dictRows.filter(d => storeCatIds.has(d.category)).length;
                return (
                  <div key={st.id} className="bg-card rounded-xl border border-border">
                    {/* Store type header */}
                    <div className="flex items-center gap-2 p-3">
                      <button
                        onClick={() => toggleStoreCollapse(st.id)}
                        className="flex items-center gap-2 flex-1 cursor-pointer text-left"
                      >
                        <span className="text-[10px] text-text-muted" style={{ transform: isCollapsed ? "" : "rotate(90deg)", transition: "transform 0.15s", display: "inline-block" }}>▶</span>
                        <span className="text-xl">{st.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate">{(st as unknown as Record<string, string>)[lang] || st.en}</div>
                          <div className="text-[10px] text-text-muted">{st.categories.length} cats · {storeItemCount} items</div>
                        </div>
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setOpenStoreMenu(prev => prev === st.id ? null : st.id)}
                          className="w-8 h-8 rounded-lg text-base cursor-pointer flex items-center justify-center text-text-muted"
                          style={{ background: openStoreMenu === st.id ? "rgba(240,136,62,0.15)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                          title="Actions"
                        >⋯</button>
                        {openStoreMenu === st.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => { setOpenStoreMenu(null); setConfirmClearStore(null); }} />
                            <div className="absolute right-0 top-9 z-20 bg-card border border-border-light rounded-xl shadow-lg py-1 min-w-[180px]">
                              <button
                                onClick={() => {
                                  setAddingCatFor(st.id);
                                  setNewCatForm({ emoji: "📦", color: "#8b949e", name: "" });
                                  setOpenStoreMenu(null);
                                }}
                                className="w-full text-left px-3 py-2 text-[12px] font-medium text-text cursor-pointer active:bg-accent/10 flex items-center gap-2"
                              >
                                <span>➕</span><span>Add category</span>
                              </button>
                              <button
                                disabled={!!bulkRunning || st.categories.length === 0}
                                onClick={() => {
                                  const ids = st.categories.map(c => c.id);
                                  openGenerate(ids, "generic");
                                  setOpenStoreMenu(null);
                                }}
                                className="w-full text-left px-3 py-2 text-[12px] font-medium cursor-pointer active:bg-accent/10 flex items-center gap-2 disabled:opacity-40"
                                style={{ color: "#3dd68c" }}
                              >
                                <span>🧠</span><span>Generate all items</span>
                              </button>
                              <button
                                disabled={!!bulkRunning || st.categories.length === 0}
                                onClick={() => {
                                  const ids = st.categories.map(c => c.id);
                                  openGenerate(ids, "brands");
                                  setOpenStoreMenu(null);
                                }}
                                className="w-full text-left px-3 py-2 text-[12px] font-medium cursor-pointer active:bg-accent/10 flex items-center gap-2 disabled:opacity-40"
                                style={{ color: "#a78bfa" }}
                                title="Generate popular brand names for every category in this store type"
                              >
                                <span>®️</span><span>Generate all brands</span>
                              </button>
                              <button
                                disabled={!!bulkRunning || st.categories.length === 0}
                                onClick={() => {
                                  if (confirmClearStore === st.id) {
                                    clearCategories(st.categories.map(c => c.id));
                                    setConfirmClearStore(null);
                                    setOpenStoreMenu(null);
                                  } else {
                                    setConfirmClearStore(st.id);
                                    setTimeout(() => setConfirmClearStore(prev => prev === st.id ? null : prev), 3000);
                                  }
                                }}
                                className="w-full text-left px-3 py-2 text-[12px] font-medium cursor-pointer active:bg-danger/10 flex items-center gap-2 disabled:opacity-40"
                                style={{ color: confirmClearStore === st.id ? "#fff" : "#ff5c5c", background: confirmClearStore === st.id ? "#b71c1c" : undefined }}
                              >
                                <span>🧹</span><span>{confirmClearStore === st.id ? "Confirm clear" : "Clear all"}</span>
                              </button>
                              {st.custom && (
                                <>
                                  <div className="h-px bg-border my-1" />
                                  <button
                                    onClick={() => {
                                      if (confirmDeleteStore === st.id) {
                                        removeCustomStoreType(st.id);
                                        setStoreCatVersion(v => v + 1);
                                        showToast("Store type removed");
                                        setConfirmDeleteStore(null);
                                        setOpenStoreMenu(null);
                                      } else {
                                        setConfirmDeleteStore(st.id);
                                        setTimeout(() => setConfirmDeleteStore(prev => prev === st.id ? null : prev), 3000);
                                      }
                                    }}
                                    className="w-full text-left px-3 py-2 text-[12px] font-medium cursor-pointer active:bg-danger/10 flex items-center gap-2"
                                    style={{
                                      color: confirmDeleteStore === st.id ? "#fff" : "#ff5c5c",
                                      background: confirmDeleteStore === st.id ? "#b71c1c" : undefined,
                                    }}
                                  >
                                    <span>🗑️</span><span>{confirmDeleteStore === st.id ? "Confirm delete" : "Delete store type"}</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Add category form */}
                    {addingCatFor === st.id && (
                      <div className="px-3 pb-3 space-y-2 border-t border-border pt-3">
                        <div className="text-[10px] font-bold text-text-muted">New category in {st.en}</div>
                        <div className="flex gap-2 items-center">
                          <input
                            value={newCatForm.emoji}
                            onChange={e => setNewCatForm(p => ({ ...p, emoji: e.target.value }))}
                            placeholder="📦"
                            className="w-12 bg-bg border border-border-light rounded-lg px-1 py-2 text-sm text-text outline-none text-center"
                          />
                          <label className="relative cursor-pointer shrink-0">
                            <input
                              type="color"
                              value={newCatForm.color}
                              onChange={e => setNewCatForm(p => ({ ...p, color: e.target.value }))}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div
                              className="w-10 h-10 rounded-lg border border-border-light"
                              style={{ background: newCatForm.color }}
                            />
                          </label>
                          <input
                            value={newCatForm.name}
                            onChange={e => setNewCatForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="Name (e.g. Tools)"
                            className="flex-1 bg-bg border border-border-light rounded-lg px-2 py-2 text-sm text-text outline-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (!newCatForm.name.trim()) return;
                              const id = slugify(newCatForm.name);
                              const name = newCatForm.name.trim();
                              addCustomCategory({
                                id,
                                emoji: newCatForm.emoji.trim() || "📦",
                                color: newCatForm.color || "#8b949e",
                                en: name,
                                es: name,
                                pl: name,
                                storeType: st.id,
                              });
                              setStoreCatVersion(v => v + 1);
                              setAddingCatFor(null);
                              showToast("Category added");
                            }}
                            className="flex-1 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer"
                            style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}
                          >Save</button>
                          <button onClick={() => setAddingCatFor(null)} className="px-3 py-2 rounded-lg text-xs text-text-muted border border-border-light cursor-pointer">Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Categories list */}
                    {!isCollapsed && st.categories.length > 0 && (
                      <div className="border-t border-border ml-4 pl-2 my-1 rounded-lg" style={{ borderLeft: "2px solid rgba(240,136,62,0.25)", background: "rgba(255,255,255,0.015)" }}>
                        {st.categories.map(c => {
                          const dictItems = dictRows.filter(d => d.category === c.id);
                          const seed = SEED_CATEGORIES.find(s => s.category === c.id);
                          const isExpanded = expandedCategory === c.id;
                          const isBuilding = buildingCategory === c.id;
                          return (
                            <div key={c.id} className="border-b border-border last:border-b-0">
                              <div className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setExpandedCategory(isExpanded ? null : c.id)}
                                    className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer text-left"
                                  >
                                    <span className="text-[9px] text-text-muted shrink-0" style={{ transform: isExpanded ? "rotate(90deg)" : "", transition: "transform 0.15s", display: "inline-block" }}>▶</span>
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: `${c.color}20` }}>
                                      {c.emoji}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-semibold text-text truncate">{(c as unknown as Record<string, string>)[lang] || c.en}</div>
                                      <div className="text-[9px] text-text-muted">{dictItems.length} items{isBuilding ? " · generating..." : ""}</div>
                                    </div>
                                  </button>
                                  <div className="relative shrink-0">
                                    <button
                                      onClick={() => setOpenCatMenu(prev => prev === c.id ? null : c.id)}
                                      className="w-8 h-8 rounded-lg text-base cursor-pointer flex items-center justify-center text-text-muted"
                                      style={{ background: openCatMenu === c.id ? "rgba(240,136,62,0.15)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                                      title="Actions"
                                    >⋯</button>
                                    {openCatMenu === c.id && (
                                      <>
                                        <div className="fixed inset-0 z-10" onClick={() => { setOpenCatMenu(null); setConfirmClearCat(null); setConfirmDeleteCat(null); }} />
                                        <div className="absolute right-0 top-9 z-20 bg-card border border-border-light rounded-xl shadow-lg py-1 min-w-[180px]">
                                          <button
                                            disabled={isBuilding || !seed}
                                            onClick={() => { openGenerate([c.id], "generic"); setOpenCatMenu(null); }}
                                            className="w-full text-left px-3 py-2 text-[12px] font-medium cursor-pointer active:bg-accent/10 flex items-center gap-2 disabled:opacity-40"
                                            style={{ color: "#3dd68c" }}
                                          >
                                            <span>🧠</span><span>{isBuilding ? "Generating..." : seed ? "Generate items" : "No seed available"}</span>
                                          </button>
                                          <button
                                            disabled={isBuilding || !seed}
                                            onClick={() => { openGenerate([c.id], "brands"); setOpenCatMenu(null); }}
                                            className="w-full text-left px-3 py-2 text-[12px] font-medium cursor-pointer active:bg-accent/10 flex items-center gap-2 disabled:opacity-40"
                                            style={{ color: "#a78bfa" }}
                                            title="Generate popular brand names for this category"
                                          >
                                            <span>®️</span><span>Generate brands</span>
                                          </button>
                                          <button
                                            disabled={dictItems.length === 0}
                                            onClick={() => {
                                              if (confirmClearCat === c.id) {
                                                clearDictionary(c.id);
                                                setConfirmClearCat(null);
                                                setOpenCatMenu(null);
                                              } else {
                                                setConfirmClearCat(c.id);
                                                setTimeout(() => setConfirmClearCat(prev => prev === c.id ? null : prev), 3000);
                                              }
                                            }}
                                            className="w-full text-left px-3 py-2 text-[12px] font-medium cursor-pointer active:bg-danger/10 flex items-center gap-2 disabled:opacity-40"
                                            style={{
                                              color: confirmClearCat === c.id ? "#fff" : "#ffb03d",
                                              background: confirmClearCat === c.id ? "#b71c1c" : undefined,
                                            }}
                                          >
                                            <span>🧹</span><span>{confirmClearCat === c.id ? "Confirm clear" : "Clear items"}</span>
                                          </button>
                                          {c.custom && (
                                            <>
                                              <div className="h-px bg-border my-1" />
                                              <button
                                                onClick={() => {
                                                  if (confirmDeleteCat === c.id) {
                                                    removeCustomCategory(c.id);
                                                    setStoreCatVersion(v => v + 1);
                                                    setConfirmDeleteCat(null);
                                                    showToast("Category removed");
                                                    setOpenCatMenu(null);
                                                  } else {
                                                    setConfirmDeleteCat(c.id);
                                                    setTimeout(() => setConfirmDeleteCat(prev => prev === c.id ? null : prev), 3000);
                                                  }
                                                }}
                                                className="w-full text-left px-3 py-2 text-[12px] font-medium cursor-pointer active:bg-danger/10 flex items-center gap-2"
                                                style={{
                                                  color: confirmDeleteCat === c.id ? "#fff" : "#ff5c5c",
                                                  background: confirmDeleteCat === c.id ? "#b71c1c" : undefined,
                                                }}
                                              >
                                                <span>🗑️</span><span>{confirmDeleteCat === c.id ? "Confirm delete" : "Delete category"}</span>
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Products in this category */}
                              {isExpanded && (
                                <div className="bg-bg/50 border-t border-border">
                                  {dictItems.length === 0 ? (
                                    <div className="text-center text-text-muted text-[11px] py-4">
                                      No products yet{seed ? ". Click 🧠 to generate." : ""}
                                    </div>
                                  ) : (
                                    <div className="max-h-60 overflow-y-auto">
                                      {dictItems.slice(0, 50).map(row => (
                                        <div key={row.key} className="flex items-center gap-2 px-3 py-1.5 border-b border-border last:border-b-0">
                                          <div className="flex-1 min-w-0">
                                            <div className="text-[11px] font-medium truncate flex items-center gap-1">
                                              {row.key}
                                              {row.is_brand && (
                                                <span className="text-[7px] font-bold px-1 py-0.5 rounded" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>
                                                  ®
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-text-muted text-[9px] truncate">
                                              {Object.entries(row.translations).slice(0, 4).map(([l, v]) => `${l}:${v}`).join(" · ")}
                                            </div>
                                          </div>
                                          <button onClick={() => setEditingEntry(row)} className="text-accent text-[11px] cursor-pointer px-1 shrink-0">✏️</button>
                                          <button
                                            onClick={() => {
                                              if (confirmDeleteEntry === row.key) {
                                                deleteEntry(row.key);
                                                setConfirmDeleteEntry(null);
                                              } else {
                                                setConfirmDeleteEntry(row.key);
                                                setTimeout(() => setConfirmDeleteEntry(prev => prev === row.key ? null : prev), 3000);
                                              }
                                            }}
                                            className="text-[11px] cursor-pointer shrink-0 whitespace-nowrap"
                                            style={{ color: confirmDeleteEntry === row.key ? "#fff" : "#ff5c5c", background: confirmDeleteEntry === row.key ? "#b71c1c" : undefined, borderRadius: 4, padding: "2px 6px" }}
                                          >{confirmDeleteEntry === row.key ? "⚠️" : "🗑️"}</button>
                                        </div>
                                      ))}
                                      {dictItems.length > 50 && (
                                        <div className="text-text-muted text-[10px] text-center py-1.5">{dictItems.length - 50} more...</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Languages ── */}
        {tab === "languages" && (() => {
          const enabled = getEnabledLangs();
          const enabledLangs = ALL_LANGUAGES.filter(l => enabled.includes(l.code));
          const availableLangs = ALL_LANGUAGES.filter(l => !enabled.includes(l.code));
          const storedUI = getStoredUITranslations();
          const hardcodedUI = ["en", "es", "pl"];

          const generateUI = async (langCode: string) => {
            const langName = ALL_LANGUAGES.find(l => l.code === langCode)?.name ?? langCode;
            showToast(`Generating UI for ${langName}...`);
            try {
              const data = await callRoute<{ translations?: Record<string, string> }>("translate-ui", {
                strings: strings.en, targetLang: langCode, targetLangName: langName,
              });
              if (data.translations) {
                saveUITranslations(langCode, data.translations);
                showToast(`✅ ${langName} UI ready! (${Object.keys(data.translations).length} strings)`);
              } else {
                reportAdminError(`Generate UI in ${langName}`, new Error("The server returned no translations"));
              }
            } catch (err) {
              reportAdminError(`Generate UI in ${langName}`, err);
            }
          };

          return (
          <div>
            {/* Enabled Languages */}
            <h3 className="text-sm font-bold mb-1 px-1">Enabled ({enabledLangs.length})</h3>
            <p className="text-text-muted text-[11px] mb-3 px-1">Languages and countries users can pick in the app. ✕ disables one.</p>

            <div className="space-y-3 mb-6">
              {enabledLangs.map(lang => {
                const isCore = lang.code === "en";
                const hasUI = hardcodedUI.includes(lang.code) || !!storedUI[lang.code];
                const uiKeyCount = hardcodedUI.includes(lang.code)
                  ? Object.keys(strings.en).length
                  : (storedUI[lang.code] ? Object.keys(storedUI[lang.code]).length : 0);
                const dictCoverage = dictRows.filter(d => d.translations && d.translations[lang.code]).length;
                const missingCount = dictRows.length - dictCoverage;
                const isFillRunning = bulkRunning === `fillLang:${lang.code}`;
                return (
                  <div key={lang.code} className="bg-card rounded-xl border border-border overflow-hidden">
                    {/* Language header */}
                    <div className="flex items-center gap-3 p-3">
                      <span className="text-2xl">{lang.flag}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm">{lang.name} <span className="text-text-muted text-xs">{lang.code}</span></div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {hasUI ? (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "rgba(61,214,140,0.1)", color: "#3dd68c" }}>UI ✓ {uiKeyCount} strings</span>
                          ) : (
                            <button
                              onClick={() => generateUI(lang.code)}
                              className="text-[9px] font-semibold px-1.5 py-0.5 rounded cursor-pointer"
                              style={{ background: "rgba(240,136,62,0.1)", color: "#f0883e", border: "1px solid rgba(240,136,62,0.2)" }}
                            >
                              Generate UI →
                            </button>
                          )}
                          <span className="text-[9px] text-text-muted">{dictCoverage}/{dictRows.length} dict</span>
                          {missingCount > 0 && !IS_DEMO && (
                            <button
                              onClick={() => fillLanguageTranslations(lang.code)}
                              disabled={!!bulkRunning}
                              className="text-[9px] font-semibold px-1.5 py-0.5 rounded cursor-pointer disabled:opacity-40"
                              style={{ background: "rgba(61,214,140,0.1)", color: "#3dd68c", border: "1px solid rgba(61,214,140,0.2)" }}
                            >
                              {isFillRunning ? "⏳ Filling..." : `🧠 Fill ${missingCount}`}
                            </button>
                          )}
                        </div>
                      </div>
                      {!isCore && (() => {
                        const isConfirming = confirmDisableLang === lang.code;
                        return (
                          <button
                            onClick={async () => {
                              if (isConfirming) {
                                if (!IS_DEMO && dictCoverage > 0) {
                                  setBulkRunning(`purgeLang:${lang.code}`);
                                  showToast(`Removing ${dictCoverage} ${lang.code} translations...`);
                                  await purgeLanguageFromDictionary(lang.code);
                                  setBulkRunning(null);
                                }
                                disableLang(lang.code);
                                setConfirmDisableLang(null);
                                forceUpdate(n => n + 1);
                                fetchDictionary();
                                showToast(`${lang.name} disabled`);
                              } else {
                                setConfirmDisableLang(lang.code);
                                setTimeout(() => setConfirmDisableLang(prev => prev === lang.code ? null : prev), 4000);
                              }
                            }}
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer whitespace-nowrap shrink-0"
                            style={{
                              background: isConfirming ? "#b71c1c" : "rgba(255,92,92,0.08)",
                              color: isConfirming ? "#fff" : "#ff5c5c",
                              border: isConfirming ? "1px solid #b71c1c" : "1px solid rgba(255,92,92,0.15)",
                            }}
                            title={dictCoverage > 0 ? `Also deletes ${dictCoverage} ${lang.code} translations from the dictionary` : undefined}
                          >
                            {isConfirming ? (dictCoverage > 0 ? `⚠️ Drop ${dictCoverage}` : "⚠️ Confirm") : "✕"}
                          </button>
                        );
                      })()}
                    </div>
                    {/* Countries, folded: some languages have 20+ */}
                    <details className="px-3 pb-3 group">
                      <summary className="cursor-pointer text-[11px] text-text-soft select-none">
                        {lang.countries.length} {lang.countries.length === 1 ? "country" : "countries"}: {lang.countries.slice(0, 3).map(c => c.flag).join(" ")}{lang.countries.length > 3 ? " …" : ""}
                      </summary>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {lang.countries.map(c => (
                          <span key={c.code} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-bg border border-border-light">
                            <span>{c.flag}</span> {c.name}
                          </span>
                        ))}
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>

            {/* Available Languages: search first, the full list is 60+ rows */}
            <h3 className="text-sm font-bold mb-1 px-1">Add language</h3>
            <p className="text-text-muted text-[11px] mb-3 px-1">{availableLangs.length} languages available · adding one adds its countries</p>
            <SearchBox value={addLangQuery} onChange={setAddLangQuery} placeholder="Search language, code or country" />
            {(() => {
              const q = addLangQuery.trim().toLowerCase();
              const matches = availableLangs.filter(l => !q
                || l.name.toLowerCase().includes(q) || l.code === q
                || l.countries.some(c => c.name.toLowerCase().includes(q)));
              const shown = q ? matches : matches.slice(0, 8);
              return (
            <div className="space-y-1.5">
              {!q && matches.length > shown.length && (
                <p className="text-[11px] text-text-muted px-1">Showing 8 of {matches.length}. Search to find the rest.</p>
              )}
              {q && matches.length === 0 && <p className="text-[12px] text-text-muted px-1 py-4 text-center">No language matches.</p>}
              {shown.map(lang => (
                <div key={lang.code} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border">
                  <span className="text-xl">{lang.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{lang.name} <span className="text-text-muted text-xs">{lang.code}</span></div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {lang.countries.slice(0, 5).map(c => (
                        <span key={c.code} className="text-[10px] text-text-muted">{c.flag} {c.name}</span>
                      ))}
                      {lang.countries.length > 5 && <span className="text-[10px] text-text-muted">+{lang.countries.length - 5}</span>}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      enableLang(lang.code);
                      forceUpdate(n => n + 1);
                      // Auto-backfill store-mode phrases for the newly
                      // enabled language so the shopper sees them immediately.
                      if (!IS_DEMO) {
                        try {
                          const { filled } = await fillPhrasesForLang(lang.code);
                          if (filled > 0) showToast(`✅ Filled ${filled} ${lang.code} phrases`);
                        } catch (err) {
                          reportAdminError(`Translate phrases to ${lang.code}`, err);
                        }
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #f09848, #e07028)", color: "white" }}
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
              );
            })()}
          </div>
          );
        })()}

        {/* ── Users ── */}
        {tab === "users" && !isDesktop && !loading && (
          <div>
            {IS_DEMO ? (
              <p className="text-text-muted text-sm py-8 text-center">Connect Supabase to see users</p>
            ) : (
              <>
                <SearchBox value={usersQuery} onChange={setUsersQuery} placeholder="Search name, ID, language or country" />
                <Chips value={usersSort} onChange={setUsersSort} options={[
                  { id: "seen", label: "Recently seen" }, { id: "recent", label: "Newest" }, { id: "name", label: "Name" },
                ]} />
                <p className="text-text-muted text-xs mb-2 px-1">{usersFiltered.length === users.length ? `${users.length} users` : `${usersFiltered.length} of ${users.length} users`}</p>
                <div className="space-y-2">
                  {usersPage.visible.map(u => {
                    const flag = getCountries().find(c => c.code === u.country)?.flag || "🌍";
                    const langFlag = LANGS.find(l => l.code === u.lang)?.flag || "";
                    const isConfirming = confirmDeleteUser === u.id;
                    return (
                      <div key={u.id} className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{u.name}</div>
                          <div className="text-text-muted text-xs truncate"><code className="tracking-wider">{u.tag ?? "—"}</code> · {langFlag} {u.lang} · {flag} {u.country}</div>
                          <div className="text-text-muted text-[10px]">
                            Joined: {new Date(u.created_at).toLocaleDateString()}
                            {u.last_seen_at && <> · Seen: {(() => {
                              const diff = Date.now() - new Date(u.last_seen_at).getTime();
                              const mins = Math.floor(diff / 60000);
                              if (mins < 1) return "now";
                              if (mins < 60) return `${mins}m ago`;
                              const hours = Math.floor(mins / 60);
                              if (hours < 24) return `${hours}h ago`;
                              const days = Math.floor(hours / 24);
                              return `${days}d ago`;
                            })()}</>}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (isConfirming) {
                              deleteUser(u.id);
                              setConfirmDeleteUser(null);
                            } else {
                              setConfirmDeleteUser(u.id);
                              setTimeout(() => setConfirmDeleteUser(prev => prev === u.id ? null : prev), 3000);
                            }
                          }}
                          className="px-2 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer shrink-0"
                          style={{
                            background: isConfirming ? "#b71c1c" : "rgba(255,92,92,0.08)",
                            color: isConfirming ? "#fff" : "#ff5c5c",
                            border: isConfirming ? "1px solid #b71c1c" : "1px solid rgba(255,92,92,0.15)",
                          }}
                        >
                          {isConfirming ? "⚠️ Confirm" : "🗑️"}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <ShowMore remaining={usersPage.remaining} onMore={usersPage.more} />
              </>
            )}
          </div>
        )}

        {/* ── Lists ── */}
        {tab === "lists" && !isDesktop && !loading && (
          <div>
            {IS_DEMO ? (
              <p className="text-text-muted text-sm py-8 text-center">Connect Supabase to see lists</p>
            ) : (
              <>
                {/* Global approval settings — apply to ALL lists */}
                {(() => {
                  const globalApproval = lists.length > 0 ? lists[0].require_approval : true;
                  const globalWho = lists.length > 0 ? lists[0].who_can_approve : "owner";
                  return (
                    <Collapsible title="⚙️ Access for all lists" summary={globalApproval ? "approval on" : "approval off"}>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[12px] font-semibold text-text">Require approval</div>
                            <div className="text-[10px] text-text-muted">Off: anyone with the code joins straight away</div>
                          </div>
                          <button
                            onClick={async () => {
                              const next = !globalApproval;
                              setLists(prev => prev.map(x => ({ ...x, require_approval: next })));
                              if (!IS_DEMO) {
                                const ids = lists.map(l => l.id);
                                const results = await Promise.allSettled(ids.map(id => pb.collection("lists").update(id, { require_approval: next })));
                                const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
                                if (failed.length) { reportAdminError(`Require approval: ${failed.length} of ${ids.length} lists failed`, failed[0].reason); fetchLists(); }
                              }
                            }}
                            className="cursor-pointer shrink-0"
                            style={{
                              width: 40, height: 22, borderRadius: 11, position: "relative",
                              background: globalApproval ? "var(--color-accent, #f0883e)" : "rgba(255,255,255,0.12)",
                              border: "none", transition: "background 0.2s",
                            }}
                          >
                            <span style={{
                              position: "absolute", top: 3, left: globalApproval ? 20 : 3,
                              width: 16, height: 16, borderRadius: "50%", background: "#fff",
                              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                            }} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[12px] font-semibold text-text">Who can approve</div>
                            <div className="text-[10px] text-text-muted">Who accepts new members</div>
                          </div>
                          <select
                            value={globalWho}
                            onChange={async (e) => {
                              const next = e.target.value;
                              setLists(prev => prev.map(x => ({ ...x, who_can_approve: next })));
                              if (!IS_DEMO) {
                                const ids = lists.map(l => l.id);
                                const results = await Promise.allSettled(ids.map(id => pb.collection("lists").update(id, { who_can_approve: next })));
                                const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
                                if (failed.length) { reportAdminError(`Who can approve: ${failed.length} of ${ids.length} lists failed`, failed[0].reason); fetchLists(); }
                              }
                            }}
                            className="text-[11px] bg-bg border border-border rounded-lg px-2 py-1.5 text-text cursor-pointer shrink-0"
                            style={{ fontFamily: "inherit" }}
                          >
                            <option value="owner">Only the creator</option>
                            <option value="any_member">Any member</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[12px] font-semibold text-text">Who can remove</div>
                            <div className="text-[10px] text-text-muted">Who can take members out of a list</div>
                          </div>
                          <select
                            value={lists.length > 0 ? lists[0].who_can_remove : "owner"}
                            onChange={async (e) => {
                              const next = e.target.value;
                              setLists(prev => prev.map(x => ({ ...x, who_can_remove: next })));
                              if (!IS_DEMO) {
                                const ids = lists.map(l => l.id);
                                const results = await Promise.allSettled(ids.map(id => pb.collection("lists").update(id, { who_can_remove: next })));
                                const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
                                if (failed.length) { reportAdminError(`Who can remove: ${failed.length} of ${ids.length} lists failed`, failed[0].reason); fetchLists(); }
                              }
                            }}
                            className="text-[11px] bg-bg border border-border rounded-lg px-2 py-1.5 text-text cursor-pointer shrink-0"
                            style={{ fontFamily: "inherit" }}
                          >
                            <option value="owner">Only the creator</option>
                            <option value="any_member">Any member</option>
                          </select>
                        </div>
                      </div>
                    </Collapsible>
                  );
                })()}
                <SearchBox value={listsQuery} onChange={setListsQuery} placeholder="Search name or code" />
                <p className="text-text-muted text-xs mb-2 px-1">{listsFiltered.length === lists.length ? `${lists.length} lists` : `${listsFiltered.length} of ${lists.length} lists`}</p>
                <div className="space-y-2">
                  {listsPage.visible.map(l => {
                    const isConfirming = confirmDeleteList === l.id;
                    return (
                      <div key={l.id} className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-lg shrink-0">📝</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{l.name}</div>
                          <div className="text-text-muted text-xs font-mono">{l.code}</div>
                          <div className="text-[10px] text-text-muted mt-0.5">
                            {listItems[l.id] || 0} items · {listMembers[l.id] || 0} members
                            {l.created_at && ` · ${new Date(l.created_at).toLocaleDateString()}`}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (isConfirming) {
                              deleteListFromAdmin(l.id);
                              setConfirmDeleteList(null);
                            } else {
                              setConfirmDeleteList(l.id);
                              setTimeout(() => setConfirmDeleteList(prev => prev === l.id ? null : prev), 3000);
                            }
                          }}
                          className="px-2 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer shrink-0"
                          style={{
                            background: isConfirming ? "#b71c1c" : "rgba(255,92,92,0.08)",
                            color: isConfirming ? "#fff" : "#ff5c5c",
                            border: isConfirming ? "1px solid #b71c1c" : "1px solid rgba(255,92,92,0.15)",
                          }}
                        >
                          {isConfirming ? "⚠️ Confirm" : "🗑️"}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <ShowMore remaining={listsPage.remaining} onMore={listsPage.more} />
              </>
            )}
          </div>
        )}
        {tab === "roadmap" && (
          <div>
            <h3 className="text-lg font-bold mb-1">🗺️ BabelCart — Roadmap</h3>
            <p className="text-text-muted text-xs mb-3">Escribe en tu idioma. Compra en cualquier país.</p>
            <div className="rounded-xl p-3 mb-4 border border-border-light" style={{ background: "rgba(255,255,255,0.03)" }}>
              <button onClick={() => setRmCollapsed(p => ({ ...p, rules: !p.rules }))} className="flex items-center gap-2 w-full text-left cursor-pointer text-xs font-bold text-text">
                <span className="text-[9px]" style={{ transform: rmCollapsed.rules ? "" : "rotate(90deg)", transition: "transform 0.15s", display: "inline-block" }}>▶</span>
                🔒 REGLAS INQUEBRANTABLES <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-bg text-text-muted">7</span>
              </button>
              {!rmCollapsed.rules && <div className="mt-2.5 space-y-1.5">
                {[["🚫","Cero anuncios. Nunca."],["🔐","Cero venta de datos."],["📤","Export e import abiertos."],["⚡","Sin registro obligatorio."],["🌍","Multilingüe de verdad — es el core."],["🤝","Lo básico es gratis para siempre."],["👁️","Transparencia total. El roadmap está en la app."]].map(([i,t],j) => (
                  <div key={j} className="flex gap-2 text-xs text-text-soft"><span className="shrink-0">{i}</span><span>{t}</span></div>
                ))}
              </div>}
            </div>
            {[
              {title:"✅ MVP",color:"#3dd68c",items:[[true,"Listas compartidas multilingües"],[true,"Traducción automática vía Claude API"],[true,"Tu idioma + idioma del estante"],[true,"Invitación por código + aprobación"],[true,"Swipe-to-delete 2 pasos"],[true,"122 iconos emoji multilingüe"],[true,"Diccionario local 100+ productos"],[true,"Cantidades y unidades"],[true,"Duplicados cross-idioma + merge"],[true,"Modo Mostrar en tienda + frases (estante GRANDE)"],[true,"Grid 3 columnas + categorías"],[true,"i18n en/es/pl"],[true,"Admin panel completo"],[true,"Dictionary Builder multitienda"],[true,"70 idiomas con auto-import países"],[true,"UI dinámica por idioma"],[true,"Confirmación 2 pasos en todos los borrados (app + admin)"],[true,"Fotos en items — add/change/remove, fullscreen zoom"],[true,"Important items con pulse rojo suave"],[true,"Colapso persistente de categorías y tipos de tienda"],[true,"Vaciar completados (bulk delete checked)"],[true,"Categorías no-alimentarias (Pets, Ropa, Bricolaje, Auto, etc.)"],[true,"Listas por tipo de tienda — jerarquía store→categoría"],[true,"Admin: CRUD completo de store types y categorías custom"],[true,"Admin: Clear dictionary por categoría / store / global"],[true,"Admin: Generate items bulk por categoría / store / global"],[true,"Admin: menú ⋯ en store types y categorías (acciones agrupadas)"],[true,"Admin: Updates tab con build info, runtime state y changelog"],[true,"Admin: Stats completas por store, categoría, idioma y país"],[true,"Admin: indicador Demo/Supabase con pulse en header"],[true,"CI: auto-deploy a GitHub Pages en cada push"],[true,"Admin delete users + lists con confirmación"],[true,"Diccionario 1.500+ productos (27 store types, 138 categorías)"],[true,"Admin: Clean orphan entries (entradas huérfanas de categorías obsoletas)"],[true,"Admin: cascade delete de traducciones al quitar un idioma"],[true,"Admin: backfill de traducciones al añadir un idioma"],[true,"Fix Demo Mode en producción via .env.production"],[true,"Admin: contadores de categorías e items en headers de store types"],[true,"Autocompletado al añadir productos (sugerencias desde el diccionario)"],[true,"Buscar dentro de una lista (cross-idioma, insensible a acentos)"],[true,"Productos de marca (Coca-Cola, Nutella…) con detección automática + Generate brands"],[true,"21 layouts completos intercambiables para la vista de items (Aisle Walk, Chat, Timeline, Masonry, Terminal, etc.)"],[true,"Sistema de temas con 20 paletas × 3 vistas (Lists / Details / Store mode)"],[true,"Auditoría de código completa: bundle splitting, lazy AdminPage, ErrorBoundary, a11y, 0 lint errors"],[true,"Seguridad: Edge Functions requieren auth, CORS restringido, RLS migration 003 con cascade FKs + índices"]]},
              {title:"🔴 Siguiente",color:"#ff5c5c",items:[[false,"Export WhatsApp bilingüe"],[false,"Bulk add desde WhatsApp"],[false,"Diccionario fuzzy avanzado (plurales ES/PL, typos Levenshtein)"],[false,"Rediseños completos para Lists / Details / Store mode (equivalente a los 21 layouts de items)"]]},
              {title:"🟡 v2.1",color:"#e8c364",items:[[false,"Input por voz multilingüe"],[false,"Asignar items a personas"],[false,"Sugerencias predictivas"],[false,"Mover/copiar items entre listas"],[false,"Modo emergencia (traducción instant)"],[false,"Web Share API"],[false,"PWA completa"]]},
              {title:"🔵 v2.2",color:"#6c8aff",items:[[false,"Monetización Free + Pro €2/mes"],[false,"Cache orgánico de traducciones"],[false,"Diccionario 5.000+ productos"],[false,"Export/import CSV + JSON"],[false,"Google Play + App Store"],[false,"Admin: staging mode — aplicar cambios al instante o encolar para publicar juntos"],[false,"Admin: preview de la app antes de publicar cambios a todos los usuarios"],[false,"Admin: botón 'Apply changes' con toggle directo/batch"],[false,"Admin: auto-borrado de listas inactivas (umbral configurable: 30/60/90/180 días)"],[false,"Admin: cron de limpieza nocturno para eliminar listas sin actividad"],[false,"Admin: aviso a los miembros antes de borrar una lista por inactividad"]]},
              {title:"🟣 v3 — El sueño",color:"#c76dff",items:[[false,"Modo offline"],[false,"Real-time sync"],[false,"Push notifications"],[false,"Recetas → lista traducida"],[false,"Escaneo código de barras"],[false,"Reconocimiento de imagen"],[false,"Precios por tienda"],[false,"Etiquetas dietéticas"],[false,"Modo presupuesto"],[false,"Reparto de gastos"],[false,"BabelCart for Teams"],[false,"API del diccionario"],[false,"App nativa"]]},
            ].map((s,si) => {let c=0;return(
              <div key={si} className="mb-3">
                <button onClick={() => setRmCollapsed(p => ({...p,[`s${si}`]:!p[`s${si}`]}))} className="flex items-center gap-2 w-full text-left cursor-pointer mb-1">
                  <span className="text-[9px]" style={{transform:rmCollapsed[`s${si}`]?"":"rotate(90deg)",transition:"transform 0.15s",display:"inline-block"}}>▶</span>
                  <span className="text-xs font-bold" style={{color:s.color}}>{s.title}</span>
                  <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{color:s.color,background:`${s.color}15`}}>{s.items.length}</span>
                </button>
                {!rmCollapsed[`s${si}`] && s.items.map(([d,t],i) => {c++;return(
                  <div key={i} className="flex items-start gap-2 py-0.5 text-[13px]" style={{color:d?"#555d74":"#8b92a8"}}>
                    <span className="text-[10px] min-w-[22px] text-right text-text-muted opacity-40 mt-0.5">{c}</span>
                    <span className="text-[11px] mt-0.5 shrink-0">{d?"✅":"○"}</span>
                    <span style={{textDecoration:d?"line-through":"none"}}>{t as string}</span>
                  </div>
                );})}
              </div>
            );})}
          </div>
        )}

        {/* ── Changelog ── */}
        {tab === "changelog" && (() => {
          const buildDate = new Date(__BUILD_DATE__);
          const typeColor: Record<ChangeType, string> = {
            feat: "#3dd68c",
            fix: "#ff5c5c",
            refactor: "#6c8aff",
            style: "#c76dff",
            chore: "#8b949e",
            ci: "#e8c364",
            docs: "#4ac3d9",
          };
          const typeLabel: Record<ChangeType, string> = {
            feat: "FEAT", fix: "FIX", refactor: "REFACTOR", style: "STYLE", chore: "CHORE", ci: "CI", docs: "DOCS",
          };
          return (
            <div>
              {/* Build info */}
              <Collapsible title="Published version" summary={`${CHANGELOG.find(e => e.hash === __BUILD_HASH__)?.version ?? CHANGELOG[0]?.version ?? "v?"} · ${__BUILD_HASH__}`}>
                <div className="space-y-1.5 text-[12px]">
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted w-20 shrink-0">Version</span>
                    <span className="text-accent font-mono text-sm font-bold">
                      {CHANGELOG.find(e => e.hash === __BUILD_HASH__)?.version ?? CHANGELOG[0]?.version ?? "v?"}
                    </span>
                    <code className="text-text-muted font-mono text-[10px] bg-bg px-1.5 py-0.5 rounded">{__BUILD_HASH__}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted w-20 shrink-0">Branch</span>
                    <code className="text-text font-mono text-[11px] bg-bg px-1.5 py-0.5 rounded truncate">{__BUILD_BRANCH__}</code>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-text-muted w-20 shrink-0">Last commit</span>
                    <span className="text-text text-[11px] flex-1">{__BUILD_SUBJECT__}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted w-20 shrink-0">Built</span>
                    <span className="text-text text-[11px]">{buildDate.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted w-20 shrink-0">Mode</span>
                    <span className="text-text text-[11px]">{IS_DEMO ? "Demo (no backend)" : "PocketBase"}</span>
                  </div>
                </div>
              </Collapsible>

              {/* Runtime state */}
              <Collapsible title="State in this browser" summary={`${dictRows.length} entries · ${users.length} users`}>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-bg rounded-lg px-2 py-1.5">
                    <div className="text-text-muted text-[9px]">Dictionary</div>
                    <div className="text-text font-bold text-sm">{dictRows.length}</div>
                  </div>
                  <div className="bg-bg rounded-lg px-2 py-1.5">
                    <div className="text-text-muted text-[9px]">Store types</div>
                    <div className="text-text font-bold text-sm">{storeTypesWithCats.length}</div>
                  </div>
                  <div className="bg-bg rounded-lg px-2 py-1.5">
                    <div className="text-text-muted text-[9px]">Categories</div>
                    <div className="text-text font-bold text-sm">{storeTypesWithCats.reduce((n, st) => n + st.categories.length, 0)}</div>
                  </div>
                  <div className="bg-bg rounded-lg px-2 py-1.5">
                    <div className="text-text-muted text-[9px]">Users</div>
                    <div className="text-text font-bold text-sm">{users.length}</div>
                  </div>
                  <div className="bg-bg rounded-lg px-2 py-1.5">
                    <div className="text-text-muted text-[9px]">Lists</div>
                    <div className="text-text font-bold text-sm">{lists.length}</div>
                  </div>
                  <div className="bg-bg rounded-lg px-2 py-1.5">
                    <div className="text-text-muted text-[9px]">Languages</div>
                    <div className="text-text font-bold text-sm">{getEnabledLangs().length}</div>
                  </div>
                </div>
                <button
                  onClick={() => { fetchDictionary(); fetchUsers(); fetchLists(); forceUpdate(n => n + 1); showToast("Refreshed"); }}
                  className="mt-2 w-full py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer"
                  style={{ background: "rgba(240,136,62,0.1)", color: "#f0883e", border: "1px solid rgba(240,136,62,0.2)" }}
                >🔄 Refresh state</button>
              </Collapsible>

              {/* CI Builds status */}
              <Collapsible title="Deploys (GitHub Actions)"
                summary={ciRuns[0] ? (ciRuns[0].conclusion === "success" ? "✅ last OK" : ciRuns[0].conclusion === "failure" ? "❌ last failed" : "⏳ running") : undefined}>
                <div className="flex justify-end mb-1">
                  <button onClick={fetchCI} disabled={ciLoading} className="text-[11px] text-accent cursor-pointer font-semibold">
                    {ciLoading ? "..." : "🔄 Refresh"}
                  </button>
                </div>
                <div className="divide-y divide-border -mx-3">
                  {ciRuns.length === 0 && !ciLoading && (
                    <div className="px-3 py-4 text-center text-text-muted text-xs">No builds found</div>
                  )}
                  {ciRuns.map(run => (
                    <a key={run.id} href={run.html_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 no-underline" style={{ textDecoration: "none" }}>
                      <span style={{ fontSize: 14 }}>
                        {run.conclusion === "success" ? "✅" : run.conclusion === "failure" ? "❌" : run.status === "in_progress" ? "🔄" : "⏳"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold text-text truncate">{run.name}</div>
                        <div className="text-[9px] text-text-muted font-mono">{run.head_sha.slice(0, 7)} · {new Date(run.created_at).toLocaleString()}</div>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{
                        background: run.conclusion === "success" ? "rgba(61,214,140,0.1)" : run.conclusion === "failure" ? "rgba(255,92,92,0.1)" : "rgba(240,136,62,0.1)",
                        color: run.conclusion === "success" ? "#3dd68c" : run.conclusion === "failure" ? "#ff5c5c" : "#f0883e",
                      }}>
                        {run.conclusion ?? run.status}
                      </span>
                    </a>
                  ))}
                </div>
              </Collapsible>

              {/* Changelog list: latest 5, the rest on demand */}
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Latest changes</div>
                  <div className="text-[10px] text-text-muted">{CHANGELOG.length} versions</div>
                </div>
                <div className="divide-y divide-border">
                  {(showAllLog ? CHANGELOG : CHANGELOG.slice(0, 5)).map((e, i) => {
                    const color = typeColor[e.type];
                    const isCurrent = e.hash === __BUILD_HASH__;
                    return (
                      <div key={i} className="px-3 py-2.5">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className="text-[11px] font-bold font-mono text-accent"
                          >{e.version}</span>
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: `${color}20`, color }}
                          >{typeLabel[e.type]}</span>
                          <span className="text-[10px] text-text-muted">{e.date}{e.time ? ` · ${e.time}` : ""}</span>
                          <code className="text-[9px] font-mono text-text-muted opacity-60">{e.hash}</code>
                          {isCurrent && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded ml-auto" style={{ background: "rgba(61,214,140,0.15)", color: "#3dd68c" }}>LIVE</span>
                          )}
                        </div>
                        <div className="text-[12px] font-semibold text-text mb-0.5">{e.title}</div>
                        {e.details && e.details.length > 0 && (
                          <ul className="text-[11px] text-text-muted space-y-0.5 mt-1 ml-2">
                            {e.details.map((d, j) => (
                              <li key={j} className="flex gap-1.5"><span className="text-text-muted/60">•</span><span>{d}</span></li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {!showAllLog && CHANGELOG.length > 5 && (
                <button type="button" onClick={() => setShowAllLog(true)}
                  className="w-full mt-2 h-11 rounded-xl bg-card border border-border-light text-[13px] font-semibold text-text-soft cursor-pointer">
                  See the {CHANGELOG.length - 5} older versions
                </button>
              )}
            </div>
          );
        })()}

        {/* ── Phrases (store-mode helper sentences) ── */}
        {tab === "phrases" && (
          <PhrasesAdminSection />
        )}

        {/* ── Themes: one palette per screen ── */}
        {tab === "themes" && (
          <div>
            <div className="flex gap-1 mb-3 overflow-x-auto">
              {THEME_VIEWS.map(v => (
                <button
                  key={v}
                  onClick={() => setThemeSubView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    themeSubView === v ? "bg-accent text-on-accent" : "bg-card text-text-soft active:bg-accent/20"
                  }`}
                >
                  {VIEW_LABELS[v]}
                  <span className="block text-[9px] font-medium opacity-70">{getPalette(selectedThemes[v]).name}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 mb-2 px-1">
              <div className="text-[11px] text-text-muted">
                “{VIEW_LABELS[themeSubView]}” screen · {PALETTES.length} themes · applies at once in every open app
              </div>
              <button
                onClick={() => resetThemes()}
                className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer bg-card text-text-soft border border-border-light"
              >
                ↺ All to default
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PALETTES.map(p => {
                const isActive = p.id === selectedThemes[themeSubView];
                return (
                  // A div, not a <button>: the preview contains the app's real buttons.
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setThemeId(themeSubView, p.id)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setThemeId(themeSubView, p.id); } }}
                    aria-pressed={isActive}
                    aria-label={`${p.name} for ${VIEW_LABELS[themeSubView]}`}
                    className="text-left p-2 rounded-xl cursor-pointer transition-all active:scale-[0.98] bg-card"
                    style={{ border: isActive ? "2px solid var(--color-accent)" : "1px solid var(--color-border-light)" }}
                  >
                    <div className="flex justify-center mb-1.5">
                      <ThemePreview palette={p} view={themeSubView} />
                    </div>
                    <div className="flex items-center justify-between gap-1 px-0.5">
                      <div className="text-[12px] font-bold text-text truncate">{p.name}</div>
                      {isActive
                        ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "color-mix(in srgb, var(--color-success) 15%, transparent)", color: "var(--color-success)" }}>ACTIVE</span>
                        : <span className="text-[9px] text-text-muted">{p.mode === "light" ? "light" : "dark"}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </>)}

      {/* Dictionary edit modal (shared across tabs) */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setEditingEntry(null)}>
          <div className="bg-card rounded-t-2xl p-5 pb-7 w-full max-w-[500px] max-h-[85vh] overflow-auto border-t border-border-light" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold mb-3">Edit: {editingEntry.key}</h3>
            <div className="mb-3">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Category</label>
              <select
                value={editingEntry.category}
                onChange={e => setEditingEntry({ ...editingEntry, category: e.target.value })}
                className="w-full bg-bg border border-border-light rounded-lg px-3 py-2 text-sm text-text outline-none appearance-none cursor-pointer"
              >
                {CATEGORY_ORDER.map(c => (
                  <option key={c} value={c}>{CATEGORIES[c]?.emoji} {CATEGORIES[c]?.en}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 mb-4">
              {[...new Set([...LANGS.map(l => l.code), ...Object.keys(editingEntry.translations)])].map(lc => {
                const flagDef = LANGS.find(l => l.code === lc);
                return (
                  <div key={lc} className="flex items-center gap-2">
                    <span className="text-sm w-6">{flagDef?.flag || ""}</span>
                    <span className="text-xs text-text-muted w-6">{lc}</span>
                    <input
                      value={editingEntry.translations[lc] || ""}
                      onChange={e => setEditingEntry({
                        ...editingEntry,
                        translations: { ...editingEntry.translations, [lc]: e.target.value }
                      })}
                      className="flex-1 bg-bg border border-border-light rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingEntry(null)} className="flex-1 py-3 rounded-xl border border-border-light text-text-soft font-medium cursor-pointer">Cancel</button>
              <button
                onClick={() => saveEntry(editingEntry.key, editingEntry.translations, editingEntry.category)}
                className="flex-1 py-3 rounded-xl font-semibold text-white cursor-pointer"
                style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
