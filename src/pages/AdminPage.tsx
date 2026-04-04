import { useState, useEffect, useCallback } from "react";
import { supabase, IS_DEMO } from "../lib/supabase";
import { LANGS } from "../data/langs";
import { COUNTRIES } from "../data/countries";
import { CATEGORIES, CATEGORY_ORDER } from "../data/categories";
import { LOCAL_DICTIONARY } from "../data/localDictionary";

type Tab = "dictionary" | "categories" | "languages" | "users" | "lists" | "stats";

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

export default function AdminPage({ onBack }: AdminPageProps) {
  const [tab, setTab] = useState<Tab>("stats");
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

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

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
  ];

  const allLangs = [...new Set([
    ...LANGS.map(l => l.code),
    ...dictRows.flatMap(d => Object.keys(d.translations)),
  ])].sort();

  return (
    <div className="min-h-screen bg-bg text-text" style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <header className="sticky top-0 z-20 bg-bg border-b border-border-light px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-text-soft text-lg cursor-pointer active:text-text">←</button>
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

            <div className="text-text-muted text-xs mb-2">{filteredDict.length} entries</div>

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
          <div className="space-y-2">
            <p className="text-text-muted text-xs mb-3">Current categories used for product classification</p>
            {CATEGORY_ORDER.map(cat => {
              const c = CATEGORIES[cat];
              if (!c) return null;
              const dictCount = dictRows.filter(d => d.category === cat).length;
              const localCount = LOCAL_DICTIONARY.filter(d => d.cat === cat).length;
              return (
                <div key={cat} className="bg-card rounded-xl p-4 border border-border flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${c.color}20` }}>
                    {c.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{c.en}</div>
                    <div className="text-text-muted text-xs">{c.es} · {c.pl}</div>
                    <div className="text-text-muted text-[10px] mt-0.5">Key: {cat} · Color: {c.color}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold" style={{ color: c.color }}>{dictCount + localCount}</div>
                    <div className="text-[10px] text-text-muted">products</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Languages ── */}
        {tab === "languages" && (
          <div>
            <p className="text-text-muted text-xs mb-3">Supported UI languages and translation targets</p>
            <div className="space-y-2 mb-6">
              <h3 className="text-sm font-bold text-text-soft">UI Languages (i18n)</h3>
              {[
                { code: "en", name: "English", flag: "🇬🇧", status: "complete" },
                { code: "es", name: "Español", flag: "🇪🇸", status: "complete" },
                { code: "pl", name: "Polski", flag: "🇵🇱", status: "complete" },
              ].map(l => (
                <div key={l.code} className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
                  <span className="text-2xl">{l.flag}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{l.name}</div>
                    <div className="text-text-muted text-xs">{l.code}</div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(61,214,140,0.1)", color: "#3dd68c" }}>
                    ✓ Complete
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-text-soft">Translation Languages</h3>
              {LANGS.map(l => {
                const dictCoverage = dictRows.filter(d => d.translations[l.code]).length;
                const localCoverage = LOCAL_DICTIONARY.filter(d => (d as any)[l.code]).length;
                const total = dictCoverage + localCoverage;
                return (
                  <div key={l.code} className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
                    <span className="text-2xl">{l.flag}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{l.name}</div>
                      <div className="text-text-muted text-xs">{l.code} · {total} translations</div>
                    </div>
                    <div className="w-20 h-2 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(100, (total / Math.max(1, dictRows.length + LOCAL_DICTIONARY.length)) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 space-y-2">
              <h3 className="text-sm font-bold text-text-soft">Countries</h3>
              <div className="grid grid-cols-2 gap-2">
                {COUNTRIES.map(c => (
                  <div key={c.code} className="bg-card rounded-lg p-2 border border-border flex items-center gap-2">
                    <span className="text-lg">{c.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{c.name}</div>
                      <div className="text-[10px] text-text-muted">Shelf: {c.lang}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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
                    return (
                      <div key={u.id} className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{u.name}</div>
                          <div className="text-text-muted text-xs">{langFlag} {u.lang} · {flag} {u.country}</div>
                        </div>
                        <div className="text-text-muted text-[10px]">
                          {new Date(u.created_at).toLocaleDateString()}
                        </div>
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
                  {lists.map(l => (
                    <div key={l.id} className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-lg">📝</div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{l.name}</div>
                        <div className="text-text-muted text-xs font-mono">{l.code}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-accent font-semibold">{listItems[l.id] || 0} items</div>
                        <div className="text-[10px] text-text-muted">{listMembers[l.id] || 0} members</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
