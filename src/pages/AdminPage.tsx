import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase, IS_DEMO } from "../lib/supabase";
import { LANGS } from "../data/langs";
import { ALL_LANGUAGES } from "../data/allLanguages";
import { getEnabledLangs, enableLang, disableLang, getStoredUITranslations, saveUITranslations } from "../lib/langConfig";
import { strings } from "../data/i18n";
import { COUNTRIES } from "../data/countries";
import { CATEGORIES, CATEGORY_ORDER } from "../data/categories";
import { LOCAL_DICTIONARY } from "../data/localDictionary";
import { STORE_TYPES } from "../data/storeTypes";
import {
  getAllStoreTypesWithCategories,
  addCustomStoreType,
  addCustomCategory,
  removeCustomStoreType,
  removeCustomCategory,
  type StoreTypeWithCategories,
} from "../lib/customStoreConfig";
import { SEED_CATEGORIES, TOTAL_SEED_PRODUCTS } from "../data/seedCategories";

type Tab = "dictionary" | "categories" | "languages" | "users" | "lists" | "stats" | "builder" | "roadmap";

interface DictRow {
  key: string;
  translations: Record<string, string>;
  category: string;
  created_at: string;
}

interface UserRow {
  id: string;
  name: string;
  lang: string;
  country: string;
  created_at: string;
}

interface ListRow {
  id: string;
  name: string;
  code: string;
  created_by: string;
  created_at: string;
}

interface AdminPageProps {
  onBack: () => void;
}

export default function AdminPage(_: AdminPageProps) {
  const [tab, setTab] = useState<Tab>("stats");
  // Builder state
  const [building, setBuilding] = useState(false);
  const [builtIds, setBuiltIds] = useState<string[]>([]);
  const [currentBuild, setCurrentBuild] = useState<string | null>(null);
  const [buildLog, setBuildLog] = useState<string[]>([]);
  const buildAbort = useRef(false);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<string | null>(null);
  const [confirmDeleteList, setConfirmDeleteList] = useState<string | null>(null);
  const [confirmClearDict, setConfirmClearDict] = useState<"all" | "filtered" | null>(null);
  const [collapsedStores, setCollapsedStores] = useState<Set<string>>(new Set());
  const [storeCatVersion, setStoreCatVersion] = useState(0); // bumps to force re-read of localStorage
  const [addingStore, setAddingStore] = useState(false);
  const [addingCatFor, setAddingCatFor] = useState<string | null>(null);
  const [newStoreForm, setNewStoreForm] = useState({ id: "", emoji: "🛒", en: "", es: "", pl: "" });
  const [newCatForm, setNewCatForm] = useState({ id: "", emoji: "📦", color: "#8b949e", en: "", es: "", pl: "" });

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
  const [catFilter, setCatFilter] = useState("");
  const [editingEntry, setEditingEntry] = useState<DictRow | null>(null);
  const [newEntry, setNewEntry] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newCat, setNewCat] = useState("other");
  const [newTranslations, setNewTranslations] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const [, forceUpdate] = useState(0);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const deleteUser = async (userId: string) => {
    if (IS_DEMO) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      showToast("User deleted (demo)");
      return;
    }
    const { error } = await supabase.from("users").delete().eq("id", userId);
    if (error) { showToast(`Error: ${error.message}`); return; }
    setUsers(prev => prev.filter(u => u.id !== userId));
    showToast("User deleted");
  };

  const deleteListFromAdmin = async (listId: string) => {
    if (IS_DEMO) {
      setLists(prev => prev.filter(l => l.id !== listId));
      showToast("List deleted (demo)");
      return;
    }
    const { error } = await supabase.from("lists").delete().eq("id", listId);
    if (error) { showToast(`Error: ${error.message}`); return; }
    setLists(prev => prev.filter(l => l.id !== listId));
    showToast("List deleted");
  };

  const clearDictionary = async (onlyCategory?: string) => {
    if (IS_DEMO) {
      showToast("Demo mode — local dictionary only");
      return;
    }
    const q = supabase.from("dictionary").delete();
    const { error } = await (onlyCategory
      ? q.eq("category", onlyCategory)
      : q.neq("key", ""));
    if (error) { showToast(`Error: ${error.message}`); return; }
    showToast(onlyCategory ? `Cleared category '${onlyCategory}'` : "Dictionary cleared");
    fetchDictionary();
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
      const { data } = await supabase.from("dictionary").select("*").order("created_at", { ascending: false }).limit(500);
      if (data) setDictRows(data as DictRow[]);
    }
    setLoading(false);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    if (!IS_DEMO) {
      const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false });
      if (data) setUsers(data as UserRow[]);
    }
    setLoading(false);
  }, []);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    if (!IS_DEMO) {
      const { data } = await supabase.from("lists").select("*").order("created_at", { ascending: false });
      if (data) setLists(data as ListRow[]);
      // Fetch member counts
      const { data: members } = await supabase.from("list_members").select("list_id, status");
      if (members) {
        const counts: Record<string, number> = {};
        (members as any[]).forEach(m => { if (m.status === "active") counts[m.list_id] = (counts[m.list_id] || 0) + 1; });
        setListMembers(counts);
      }
      // Fetch item counts
      const { data: items } = await supabase.from("items").select("list_id");
      if (items) {
        const counts: Record<string, number> = {};
        (items as any[]).forEach(i => { counts[i.list_id] = (counts[i.list_id] || 0) + 1; });
        setListItems(counts);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "dictionary") fetchDictionary();
    if (tab === "users") fetchUsers();
    if (tab === "lists") fetchLists();
    if (tab === "stats") { fetchDictionary(); fetchUsers(); fetchLists(); }
  }, [tab, fetchDictionary, fetchUsers, fetchLists]);

  // Save dictionary entry
  const saveEntry = async (key: string, translations: Record<string, string>, category: string) => {
    if (IS_DEMO) { showToast("Demo mode — can't save"); return; }
    await supabase.from("dictionary").upsert({ key: key.toLowerCase().trim(), translations, category });
    showToast("Saved!");
    fetchDictionary();
    setEditingEntry(null);
    setNewEntry(false);
  };

  const deleteEntry = async (key: string) => {
    if (IS_DEMO) return;
    await supabase.from("dictionary").delete().eq("key", key);
    showToast("Deleted");
    fetchDictionary();
  };

  // Filter dictionary
  const filteredDict = dictRows.filter(row => {
    const matchSearch = !search || row.key.includes(search.toLowerCase()) ||
      Object.values(row.translations).some(v => v.toLowerCase().includes(search.toLowerCase()));
    const matchCat = !catFilter || row.category === catFilter;
    return matchSearch && matchCat;
  });

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "stats", label: "Stats", icon: "📊" },
    { key: "dictionary", label: "Dictionary", icon: "📖" },
    { key: "categories", label: "Categories", icon: "🏷️" },
    { key: "languages", label: "Languages", icon: "🌍" },
    { key: "users", label: "Users", icon: "👥" },
    { key: "lists", label: "Lists", icon: "📝" },
    { key: "builder", label: "Builder", icon: "🧠" },
    { key: "roadmap", label: "Roadmap", icon: "🗺️" },
  ];

  const allLangs = [...new Set([
    ...LANGS.map(l => l.code),
    ...dictRows.flatMap(d => Object.keys(d.translations)),
  ])].sort();

  return (
    <div className="min-h-screen bg-bg text-text" style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <header className="sticky top-0 z-20 bg-bg border-b border-border-light px-4 py-3 flex items-center gap-3">
        <h1 className="text-lg font-bold">🛠️ Admin Panel</h1>
        <span className="text-text-muted text-xs ml-auto">{IS_DEMO ? "Demo Mode" : "Supabase"}</span>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 overflow-x-auto border-b border-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              tab === t.key ? "bg-accent text-white" : "bg-card text-text-soft active:bg-accent/20"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-card border border-accent/30 text-accent px-4 py-2 rounded-xl text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}

      <div className="px-4 py-4">
        {loading && <div className="text-center py-8 text-text-muted animate-pulse">Loading...</div>}

        {/* ── Stats ── */}
        {tab === "stats" && !loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Dictionary entries", value: dictRows.length, icon: "📖", color: "#f0883e" },
                { label: "Local dictionary", value: LOCAL_DICTIONARY.length, icon: "💾", color: "#3dd68c" },
                { label: "Users", value: users.length, icon: "👥", color: "#6c8aff" },
                { label: "Lists", value: lists.length, icon: "📝", color: "#c76dff" },
                { label: "Languages", value: LANGS.length, icon: "🌍", color: "#34d6c0" },
                { label: "Countries", value: COUNTRIES.length, icon: "🗺️", color: "#ffb03d" },
                { label: "Categories", value: CATEGORY_ORDER.length, icon: "🏷️", color: "#f472b6" },
                { label: "Product emojis", value: "110+", icon: "🎨", color: "#e8c364" },
              ].map((s, i) => (
                <div key={i} className="bg-card rounded-xl p-4 border border-border">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-text-muted text-xs mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Category breakdown */}
            <div className="bg-card rounded-xl p-4 border border-border">
              <h3 className="text-sm font-bold mb-3">Dictionary by category</h3>
              {CATEGORY_ORDER.map(cat => {
                const count = dictRows.filter(d => d.category === cat).length;
                const localCount = LOCAL_DICTIONARY.filter(d => d.cat === cat).length;
                const total = count + localCount;
                if (total === 0) return null;
                const c = CATEGORIES[cat];
                return (
                  <div key={cat} className="flex items-center gap-2 py-1">
                    <span className="text-sm w-5">{c?.emoji}</span>
                    <span className="text-xs text-text-soft flex-1">{c?.en || cat}</span>
                    <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (total / Math.max(1, dictRows.length + LOCAL_DICTIONARY.length)) * 100 * 3)}%`, background: c?.color || "#888" }} />
                    </div>
                    <span className="text-xs text-text-muted w-10 text-right">{total}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Dictionary ── */}
        {tab === "dictionary" && !loading && (
          <div>
            {/* Search + filter + add */}
            <div className="flex gap-2 mb-3">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                className="flex-1 bg-card border border-border-light rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
              <select
                value={catFilter}
                onChange={e => setCatFilter(e.target.value)}
                className="bg-card border border-border-light rounded-lg px-2 py-2 text-xs text-text outline-none appearance-none cursor-pointer"
              >
                <option value="">All</option>
                {CATEGORY_ORDER.map(c => (
                  <option key={c} value={c}>{CATEGORIES[c]?.emoji} {CATEGORIES[c]?.en}</option>
                ))}
              </select>
              <button
                onClick={() => { setNewEntry(true); setNewKey(""); setNewCat("other"); setNewTranslations({}); }}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer"
                style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}
              >
                + Add
              </button>
            </div>

            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="text-text-muted text-xs">{filteredDict.length} entries</div>
              <div className="flex gap-1.5">
                {/* Clear filtered (by category) */}
                {catFilter && (
                  <button
                    onClick={() => {
                      if (confirmClearDict === "filtered") {
                        clearDictionary(catFilter);
                        setConfirmClearDict(null);
                      } else {
                        setConfirmClearDict("filtered");
                        setTimeout(() => setConfirmClearDict(prev => prev === "filtered" ? null : prev), 3000);
                      }
                    }}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer"
                    style={{
                      background: confirmClearDict === "filtered" ? "#b71c1c" : "rgba(255,92,92,0.08)",
                      color: confirmClearDict === "filtered" ? "#fff" : "#ff5c5c",
                      border: confirmClearDict === "filtered" ? "1px solid #b71c1c" : "1px solid rgba(255,92,92,0.15)",
                    }}
                  >
                    {confirmClearDict === "filtered" ? "⚠️ Confirm" : `🗑️ Clear ${catFilter}`}
                  </button>
                )}
                {/* Clear all */}
                <button
                  onClick={() => {
                    if (confirmClearDict === "all") {
                      clearDictionary();
                      setConfirmClearDict(null);
                    } else {
                      setConfirmClearDict("all");
                      setTimeout(() => setConfirmClearDict(prev => prev === "all" ? null : prev), 3000);
                    }
                  }}
                  className="px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer"
                  style={{
                    background: confirmClearDict === "all" ? "#b71c1c" : "rgba(255,92,92,0.08)",
                    color: confirmClearDict === "all" ? "#fff" : "#ff5c5c",
                    border: confirmClearDict === "all" ? "1px solid #b71c1c" : "1px solid rgba(255,92,92,0.15)",
                  }}
                >
                  {confirmClearDict === "all" ? "⚠️ Confirm all" : "🗑️ Clear all"}
                </button>
              </div>
            </div>

            {/* New entry form */}
            {newEntry && (
              <div className="bg-card rounded-xl p-4 border border-accent/30 mb-3">
                <h4 className="text-sm font-bold mb-2">New dictionary entry</h4>
                <div className="flex gap-2 mb-2">
                  <input
                    value={newKey}
                    onChange={e => setNewKey(e.target.value)}
                    placeholder="Product key (e.g. toothbrush)"
                    className="flex-1 bg-bg border border-border-light rounded-lg px-3 py-2 text-sm text-text outline-none"
                  />
                  <select
                    value={newCat}
                    onChange={e => setNewCat(e.target.value)}
                    className="bg-bg border border-border-light rounded-lg px-2 py-2 text-xs text-text outline-none appearance-none cursor-pointer"
                  >
                    {CATEGORY_ORDER.map(c => (
                      <option key={c} value={c}>{CATEGORIES[c]?.emoji} {c}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {allLangs.slice(0, 14).map(lc => (
                    <div key={lc} className="flex items-center gap-1">
                      <span className="text-xs text-text-muted w-6">{lc}</span>
                      <input
                        value={newTranslations[lc] || ""}
                        onChange={e => setNewTranslations(p => ({ ...p, [lc]: e.target.value }))}
                        placeholder={lc}
                        className="flex-1 bg-bg border border-border-light rounded px-2 py-1 text-xs text-text outline-none"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setNewEntry(false)} className="px-3 py-1.5 rounded-lg text-xs text-text-soft border border-border-light cursor-pointer">Cancel</button>
                  <button
                    onClick={() => { if (newKey.trim()) saveEntry(newKey, newTranslations, newCat); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Dictionary table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-1 text-text-muted font-semibold">Key</th>
                    <th className="text-left py-2 px-1 text-text-muted font-semibold">Cat</th>
                    {allLangs.slice(0, 8).map(lc => (
                      <th key={lc} className="text-left py-2 px-1 text-text-muted font-semibold">{lc}</th>
                    ))}
                    <th className="text-right py-2 px-1 text-text-muted font-semibold w-16">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDict.slice(0, 100).map(row => (
                    <tr key={row.key} className="border-b border-border hover:bg-card/50">
                      <td className="py-1.5 px-1 font-medium text-accent">{row.key}</td>
                      <td className="py-1.5 px-1">
                        <span className="text-sm">{CATEGORIES[row.category]?.emoji || "🛒"}</span>
                      </td>
                      {allLangs.slice(0, 8).map(lc => (
                        <td key={lc} className="py-1.5 px-1 text-text-soft">
                          {row.translations[lc] || <span className="text-text-muted">—</span>}
                        </td>
                      ))}
                      <td className="py-1.5 px-1 text-right">
                        <button
                          onClick={() => setEditingEntry(row)}
                          className="text-accent cursor-pointer mr-2"
                        >✏️</button>
                        <button
                          onClick={() => { if (confirm("Delete?")) deleteEntry(row.key); }}
                          className="text-danger cursor-pointer"
                        >🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredDict.length > 100 && (
                <div className="text-text-muted text-xs text-center py-2">Showing 100 of {filteredDict.length}</div>
              )}
            </div>

            {/* Edit modal */}
            {editingEntry && (
              <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setEditingEntry(null)}>
                <div className="bg-card rounded-t-2xl p-5 pb-7 w-full max-w-[500px] max-h-[80vh] overflow-auto border-t border-border-light" onClick={e => e.stopPropagation()}>
                  <h3 className="text-base font-bold mb-3">Edit: {editingEntry.key}</h3>
                  <div className="mb-3">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Category</label>
                    <select
                      value={editingEntry.category}
                      onChange={e => setEditingEntry({ ...editingEntry, category: e.target.value })}
                      className="w-full bg-bg border border-border-light rounded-lg px-3 py-2 text-sm text-text outline-none appearance-none cursor-pointer"
                    >
                      {CATEGORY_ORDER.map(c => (
                        <option key={c} value={c}>{CATEGORIES[c]?.emoji} {c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 mb-4">
                    {allLangs.map(lc => {
                      const flag = LANGS.find(l => l.code === lc)?.flag || "";
                      return (
                        <div key={lc} className="flex items-center gap-2">
                          <span className="text-sm w-6">{flag}</span>
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
        )}

        {/* ── Categories ── */}
        {tab === "categories" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-text-muted text-xs">{storeTypesWithCats.length} store types · {storeTypesWithCats.reduce((a, s) => a + s.categories.length, 0)} categories</p>
              <button
                onClick={() => { setAddingStore(true); setNewStoreForm({ id: "", emoji: "🛒", en: "", es: "", pl: "" }); }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white cursor-pointer"
                style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}
              >
                + Store type
              </button>
            </div>

            {/* Add store type form */}
            {addingStore && (
              <div className="bg-card rounded-xl p-3 border border-accent/30 mb-3 space-y-2">
                <div className="text-xs font-bold mb-1">New store type</div>
                <div className="flex gap-2">
                  <input value={newStoreForm.emoji} onChange={e => setNewStoreForm(p => ({ ...p, emoji: e.target.value }))} placeholder="🛒" className="w-14 bg-bg border border-border-light rounded-lg px-2 py-2 text-sm text-text outline-none text-center" />
                  <input value={newStoreForm.id} onChange={e => setNewStoreForm(p => ({ ...p, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))} placeholder="id (e.g. bookstore)" className="flex-1 bg-bg border border-border-light rounded-lg px-2 py-2 text-sm text-text outline-none font-mono" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input value={newStoreForm.en} onChange={e => setNewStoreForm(p => ({ ...p, en: e.target.value }))} placeholder="English" className="bg-bg border border-border-light rounded-lg px-2 py-2 text-xs text-text outline-none" />
                  <input value={newStoreForm.es} onChange={e => setNewStoreForm(p => ({ ...p, es: e.target.value }))} placeholder="Español" className="bg-bg border border-border-light rounded-lg px-2 py-2 text-xs text-text outline-none" />
                  <input value={newStoreForm.pl} onChange={e => setNewStoreForm(p => ({ ...p, pl: e.target.value }))} placeholder="Polski" className="bg-bg border border-border-light rounded-lg px-2 py-2 text-xs text-text outline-none" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!newStoreForm.id.trim() || !newStoreForm.en.trim()) return;
                      addCustomStoreType({
                        id: newStoreForm.id.trim(),
                        emoji: newStoreForm.emoji.trim() || "🛒",
                        en: newStoreForm.en.trim(),
                        es: newStoreForm.es.trim() || newStoreForm.en.trim(),
                        pl: newStoreForm.pl.trim() || newStoreForm.en.trim(),
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
              {storeTypesWithCats.map((st: StoreTypeWithCategories) => {
                const isCollapsed = collapsedStores.has(st.id);
                return (
                  <div key={st.id} className="bg-card rounded-xl border border-border overflow-hidden">
                    {/* Store type header */}
                    <div className="flex items-center gap-2 p-3">
                      <button
                        onClick={() => setCollapsedStores(prev => {
                          const next = new Set(prev);
                          if (next.has(st.id)) next.delete(st.id); else next.add(st.id);
                          return next;
                        })}
                        className="flex items-center gap-2 flex-1 cursor-pointer text-left"
                      >
                        <span className="text-[10px] text-text-muted" style={{ transform: isCollapsed ? "" : "rotate(90deg)", transition: "transform 0.15s", display: "inline-block" }}>▶</span>
                        <span className="text-xl">{st.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate">{st.en}</div>
                          <div className="text-text-muted text-[10px] truncate">{st.es} · {st.pl}</div>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-bg text-text-muted">{st.categories.length}</span>
                      </button>
                      <button
                        onClick={() => { setAddingCatFor(st.id); setNewCatForm({ id: "", emoji: "📦", color: "#8b949e", en: "", es: "", pl: "" }); }}
                        className="px-2 py-1 rounded-lg text-[10px] font-semibold text-accent cursor-pointer"
                        style={{ background: "rgba(240,136,62,0.1)", border: "1px solid rgba(240,136,62,0.2)" }}
                      >+ Cat</button>
                      {st.custom && (
                        <button
                          onClick={() => { removeCustomStoreType(st.id); setStoreCatVersion(v => v + 1); showToast("Store type removed"); }}
                          className="w-6 h-6 rounded-lg text-[11px] cursor-pointer flex items-center justify-center"
                          style={{ background: "rgba(255,92,92,0.08)", color: "#ff5c5c", border: "1px solid rgba(255,92,92,0.15)" }}
                        >✕</button>
                      )}
                    </div>

                    {/* Add category form */}
                    {addingCatFor === st.id && (
                      <div className="px-3 pb-3 space-y-2 border-t border-border pt-3">
                        <div className="text-[10px] font-bold text-text-muted">New category in {st.en}</div>
                        <div className="flex gap-2">
                          <input value={newCatForm.emoji} onChange={e => setNewCatForm(p => ({ ...p, emoji: e.target.value }))} placeholder="📦" className="w-12 bg-bg border border-border-light rounded-lg px-1 py-2 text-sm text-text outline-none text-center" />
                          <input value={newCatForm.color} onChange={e => setNewCatForm(p => ({ ...p, color: e.target.value }))} placeholder="#8b949e" className="w-20 bg-bg border border-border-light rounded-lg px-2 py-2 text-xs text-text outline-none font-mono" />
                          <input value={newCatForm.id} onChange={e => setNewCatForm(p => ({ ...p, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))} placeholder="id" className="flex-1 bg-bg border border-border-light rounded-lg px-2 py-2 text-xs text-text outline-none font-mono" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input value={newCatForm.en} onChange={e => setNewCatForm(p => ({ ...p, en: e.target.value }))} placeholder="English" className="bg-bg border border-border-light rounded-lg px-2 py-2 text-xs text-text outline-none" />
                          <input value={newCatForm.es} onChange={e => setNewCatForm(p => ({ ...p, es: e.target.value }))} placeholder="Español" className="bg-bg border border-border-light rounded-lg px-2 py-2 text-xs text-text outline-none" />
                          <input value={newCatForm.pl} onChange={e => setNewCatForm(p => ({ ...p, pl: e.target.value }))} placeholder="Polski" className="bg-bg border border-border-light rounded-lg px-2 py-2 text-xs text-text outline-none" />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (!newCatForm.id.trim() || !newCatForm.en.trim()) return;
                              addCustomCategory({
                                id: newCatForm.id.trim(),
                                emoji: newCatForm.emoji.trim() || "📦",
                                color: newCatForm.color.trim() || "#8b949e",
                                en: newCatForm.en.trim(),
                                es: newCatForm.es.trim() || newCatForm.en.trim(),
                                pl: newCatForm.pl.trim() || newCatForm.en.trim(),
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
                      <div className="border-t border-border">
                        {st.categories.map(c => {
                          const dictCount = dictRows.filter(d => d.category === c.id).length;
                          const localCount = LOCAL_DICTIONARY.filter(d => d.cat === c.id).length;
                          const total = dictCount + localCount;
                          return (
                            <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-b-0">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: `${c.color}20` }}>
                                {c.emoji}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-text truncate">{c.en}</div>
                                <div className="text-text-muted text-[10px] truncate">{c.es} · {c.pl} · <span className="font-mono">{c.id}</span></div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-bold" style={{ color: c.color }}>{total}</div>
                                <div className="text-[9px] text-text-muted">products</div>
                              </div>
                              {c.custom && (
                                <button
                                  onClick={() => { removeCustomCategory(c.id); setStoreCatVersion(v => v + 1); showToast("Category removed"); }}
                                  className="w-6 h-6 rounded-lg text-[10px] cursor-pointer flex items-center justify-center shrink-0"
                                  style={{ background: "rgba(255,92,92,0.08)", color: "#ff5c5c", border: "1px solid rgba(255,92,92,0.15)" }}
                                >✕</button>
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
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
            try {
              const res = await fetch(`${supabaseUrl}/functions/v1/translate-ui`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}`, "apikey": supabaseKey },
                body: JSON.stringify({ strings: strings.en, targetLang: langCode, targetLangName: langName }),
              });
              const data = await res.json();
              if (res.ok && data.translations) {
                saveUITranslations(langCode, data.translations);
                showToast(`✅ ${langName} UI ready! (${Object.keys(data.translations).length} strings)`);
              } else {
                showToast(`❌ ${data.error || "Failed"}`);
              }
            } catch (err) {
              showToast(`❌ ${err}`);
            }
          };

          const generateAllMissing = async () => {
            const missing = enabled.filter(c => !hardcodedUI.includes(c) && !storedUI[c]);
            if (missing.length === 0) { showToast("All languages have UI translations!"); return; }
            for (const code of missing) {
              await generateUI(code);
              await new Promise(r => setTimeout(r, 1500));
            }
          };

          return (
          <div>
            {/* Enabled Languages */}
            <h3 className="text-sm font-bold mb-3">Active Languages ({enabledLangs.length})</h3>
            <p className="text-text-muted text-[10px] mb-3">These languages are available in the app. Toggle to enable/disable.</p>

            {/* Generate all missing UI */}
            {enabled.some(c => !hardcodedUI.includes(c) && !storedUI[c]) && (
              <button
                onClick={generateAllMissing}
                className="w-full mb-4 py-3 rounded-xl font-semibold text-sm text-white cursor-pointer"
                style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}
              >
                🌍 Generate UI translations for all languages
              </button>
            )}

            <div className="space-y-3 mb-6">
              {enabledLangs.map(lang => {
                const isCore = lang.code === "en";
                const hasUI = hardcodedUI.includes(lang.code) || !!storedUI[lang.code];
                const uiKeyCount = hardcodedUI.includes(lang.code)
                  ? Object.keys(strings.en).length
                  : (storedUI[lang.code] ? Object.keys(storedUI[lang.code]).length : 0);
                const dictCoverage = dictRows.filter(d => d.translations[lang.code]).length;
                const localCoverage = LOCAL_DICTIONARY.filter(d => (d as unknown as Record<string, unknown>)[lang.code]).length;
                return (
                  <div key={lang.code} className="bg-card rounded-xl border border-border overflow-hidden">
                    {/* Language header */}
                    <div className="flex items-center gap-3 p-3">
                      <span className="text-2xl">{lang.flag}</span>
                      <div className="flex-1">
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
                          <span className="text-[9px] text-text-muted">{dictCoverage + localCoverage} dict</span>
                        </div>
                      </div>
                      {!isCore && (
                        <button
                          onClick={() => { disableLang(lang.code); forceUpdate(n => n + 1); }}
                          className="px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer"
                          style={{ background: "rgba(255,92,92,0.08)", color: "#ff5c5c", border: "1px solid rgba(255,92,92,0.15)" }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {/* Countries */}
                    <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                      {lang.countries.map(c => (
                        <span key={c.code} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-bg border border-border-light">
                          <span>{c.flag}</span> {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Available Languages */}
            <h3 className="text-sm font-bold mb-2">Add Language ({availableLangs.length} available)</h3>
            <p className="text-text-muted text-[10px] mb-3">Enable a language to add its countries to the app</p>

            <div className="space-y-1.5">
              {availableLangs.map(lang => (
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
                    onClick={() => { enableLang(lang.code); forceUpdate(n => n + 1); }}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #f09848, #e07028)", color: "white" }}
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          </div>
          );
        })()}

        {/* ── Users ── */}
        {tab === "users" && !loading && (
          <div>
            {IS_DEMO ? (
              <p className="text-text-muted text-sm py-8 text-center">Connect Supabase to see users</p>
            ) : (
              <>
                <p className="text-text-muted text-xs mb-3">{users.length} registered users</p>
                <div className="space-y-2">
                  {users.map(u => {
                    const flag = COUNTRIES.find(c => c.code === u.country)?.flag || "🌍";
                    const langFlag = LANGS.find(l => l.code === u.lang)?.flag || "";
                    const isConfirming = confirmDeleteUser === u.id;
                    return (
                      <div key={u.id} className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{u.name}</div>
                          <div className="text-text-muted text-xs truncate">{langFlag} {u.lang} · {flag} {u.country}</div>
                          <div className="text-text-muted text-[10px]">{new Date(u.created_at).toLocaleDateString()}</div>
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
              </>
            )}
          </div>
        )}

        {/* ── Lists ── */}
        {tab === "lists" && !loading && (
          <div>
            {IS_DEMO ? (
              <p className="text-text-muted text-sm py-8 text-center">Connect Supabase to see lists</p>
            ) : (
              <>
                <p className="text-text-muted text-xs mb-3">{lists.length} lists</p>
                <div className="space-y-2">
                  {lists.map(l => {
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
              </>
            )}
          </div>
        )}
        {/* ── Builder ── */}
        {tab === "builder" && (
          <div>
            <div className="bg-card rounded-xl p-4 border border-border mb-4">
              <h3 className="text-sm font-bold mb-1">🧠 Dictionary Builder</h3>
              <p className="text-text-muted text-xs mb-3">
                Generate ~{TOTAL_SEED_PRODUCTS} product translations across {STORE_TYPES.length} store types using Claude AI.
                Each category is generated in a separate API call.
              </p>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${(builtIds.length / SEED_CATEGORIES.length) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-text-muted shrink-0">
                  {builtIds.length}/{SEED_CATEGORIES.length} categories
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (IS_DEMO) { showToast("Connect Supabase first"); return; }
                    setBuilding(true);
                    buildAbort.current = false;
                    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
                    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
                    const remaining = SEED_CATEGORIES.filter(c => !builtIds.includes(c.id));
                    for (const cat of remaining) {
                      if (buildAbort.current) break;
                      setCurrentBuild(cat.id);
                      setBuildLog(prev => [...prev, `Building: ${cat.name} (${cat.count} products)...`]);
                      try {
                        const res = await fetch(`${supabaseUrl}/functions/v1/seed-dictionary`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${supabaseKey}`,
                            "apikey": supabaseKey,
                          },
                          body: JSON.stringify({
                            count: cat.count,
                            prompt: cat.prompt,
                            category: cat.category,
                            storeType: cat.storeType,
                          }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setBuildLog(prev => [...prev, `  ✅ ${cat.name}: ${data.inserted} products inserted`]);
                          setBuiltIds(prev => [...prev, cat.id]);
                        } else {
                          setBuildLog(prev => [...prev, `  ❌ ${cat.name}: ${data.error}`]);
                        }
                      } catch (err) {
                        setBuildLog(prev => [...prev, `  ❌ ${cat.name}: ${err}`]);
                      }
                      // Small delay to avoid rate limiting
                      await new Promise(r => setTimeout(r, 1500));
                    }
                    setBuilding(false);
                    setCurrentBuild(null);
                    fetchDictionary();
                  }}
                  disabled={building}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm text-white cursor-pointer disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}
                >
                  {building ? `⏳ Building ${currentBuild ?? ""}...` : builtIds.length >= SEED_CATEGORIES.length ? "✅ Complete" : "🚀 Build Dictionary"}
                </button>
                {building && (
                  <button
                    onClick={() => { buildAbort.current = true; }}
                    className="px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer"
                    style={{ background: "rgba(255,92,92,0.1)", color: "#ff5c5c", border: "1px solid rgba(255,92,92,0.2)" }}
                  >
                    Stop
                  </button>
                )}
              </div>
            </div>

            {/* Store types overview */}
            <h3 className="text-sm font-bold mb-2">Store Types ({STORE_TYPES.length})</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {STORE_TYPES.map(st => {
                const cats = SEED_CATEGORIES.filter(c => c.storeType === st.id);
                const totalProducts = cats.reduce((a, c) => a + c.count, 0);
                const builtCount = cats.filter(c => builtIds.includes(c.id)).length;
                return (
                  <div key={st.id} className="bg-card rounded-xl p-3 border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{st.emoji}</span>
                      <span className="text-xs font-bold">{st.en}</span>
                    </div>
                    <div className="text-text-muted text-[10px]">
                      {cats.length} categories · {totalProducts} products · {builtCount}/{cats.length} built
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden mt-1.5">
                      <div className="h-full rounded-full" style={{ width: `${cats.length > 0 ? (builtCount / cats.length) * 100 : 0}%`, background: builtCount === cats.length ? "#3dd68c" : "#f0883e" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Categories detail */}
            <h3 className="text-sm font-bold mb-2">All Categories ({SEED_CATEGORIES.length})</h3>
            <div className="space-y-1.5 mb-4">
              {SEED_CATEGORIES.map(cat => {
                const st = STORE_TYPES.find(s => s.id === cat.storeType);
                const built = builtIds.includes(cat.id);
                return (
                  <div key={cat.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${built ? "bg-card/50 opacity-60" : "bg-card"} border border-border`}>
                    <span>{st?.emoji || "🛒"}</span>
                    <span className="font-medium flex-1">{cat.name}</span>
                    <span className="text-text-muted">{cat.count} products</span>
                    <span className={built ? "text-[#3dd68c]" : "text-text-muted"}>{built ? "✅" : "○"}</span>
                  </div>
                );
              })}
            </div>

            {/* Build log */}
            {buildLog.length > 0 && (
              <div className="bg-card rounded-xl p-3 border border-border">
                <h4 className="text-xs font-bold text-text-muted mb-2">Build Log</h4>
                <div className="max-h-48 overflow-y-auto text-[11px] font-mono text-text-soft space-y-0.5">
                  {buildLog.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {/* ── Roadmap ── */}
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
              {title:"✅ MVP",color:"#3dd68c",items:[[true,"Listas compartidas multilingües"],[true,"Traducción automática vía Claude API"],[true,"Tu idioma + idioma del estante"],[true,"Invitación por código + aprobación"],[true,"Swipe-to-delete 2 pasos"],[true,"122 iconos emoji multilingüe"],[true,"Diccionario local 100+ productos"],[true,"Cantidades y unidades"],[true,"Duplicados cross-idioma + merge"],[true,"Modo Mostrar en tienda + frases"],[true,"Grid 3 columnas + categorías"],[true,"i18n en/es/pl"],[true,"Admin panel completo"],[true,"Dictionary Builder multitienda"],[true,"70 idiomas con auto-import países"],[true,"UI dinámica por idioma"]]},
              {title:"🔴 Siguiente",color:"#ff5c5c",items:[[false,"Diccionario 1.500+ productos (12 tipos tienda)"],[false,"Autocompletado productos anteriores"],[false,"Vaciar completados"],[false,"Modo compra (estante GRANDE)"],[false,"Export WhatsApp bilingüe"],[false,"Bulk add desde WhatsApp"],[false,"Buscar en lista"],[false,"Diccionario fuzzy (plurales, typos)"]]},
              {title:"🟡 v2.1",color:"#e8c364",items:[[false,"Input por voz multilingüe"],[false,"Asignar items a personas"],[false,"Sugerencias predictivas"],[false,"Categorías no-alimentarias"],[false,"Listas por tipo de tienda"],[false,"Mover/copiar items entre listas"],[false,"Modo emergencia (traducción instant)"],[false,"Web Share API"],[false,"PWA completa"]]},
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
      </div>
    </div>
  );
}
