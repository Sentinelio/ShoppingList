import { useMemo, useState } from "react";
import DataTable, { type Column } from "./DataTable";
import { TopBar, TableSearch, FilterSelect, SidePanel, Pill } from "./DesktopShell";
import { ALL_LANGUAGES } from "../../../data/allLanguages";
import { getCountries } from "../../../data/countries";
import { timeAgo, timeValue, type PeopleData, type PMember, type PUser } from "../../../lib/adminPeople";

const flagOfCountry = (code: string) => getCountries().find(c => c.code === code)?.flag ?? "🌍";
const flagOfLang = (code: string) => ALL_LANGUAGES.find(l => l.code === code)?.flag ?? "";
const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function UsersDesktop({ data, onDelete, onOpenList }: {
  data: PeopleData;
  onDelete: (userId: string) => Promise<void>;
  onOpenList: (listId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [lang, setLang] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const listsOf = useMemo(() => {
    const m: Record<string, PMember[]> = {};
    for (const mm of data.members) (m[mm.user_id] ??= []).push(mm);
    return m;
  }, [data.members]);
  const listById = useMemo(() => Object.fromEntries(data.lists.map(l => [l.id, l])), [data.lists]);
  const activeLists = (u: PUser) => (listsOf[u.id] ?? []).filter(m => m.status === "active").length;

  const rows = useMemo(() => {
    const q = norm(query.trim());
    return data.users.filter(u =>
      (!q || norm(`${u.name} ${u.lang} ${u.country}`).includes(q))
      && (!country || u.country === country)
      && (!lang || u.lang === lang));
  }, [data.users, query, country, lang]);

  const countries = [...new Set(data.users.map(u => u.country).filter(Boolean))].sort();
  const langs = [...new Set(data.users.map(u => u.lang).filter(Boolean))].sort();
  const weekAgo = Date.now() - 7 * 864e5;

  const columns: Column<PUser>[] = [
    { key: "name", header: "Name", sortValue: u => u.name.toLowerCase(), render: u => (
      <span className="flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[12px] font-bold text-white" style={{ background: u.avatar_color || "var(--color-accent)" }}>
          {(u.name || "?")[0].toUpperCase()}
        </span>
        <span className="font-semibold text-text truncate">{u.name}</span>
        {u.is_admin && <Pill tone="info">admin</Pill>}
        {timeValue(u.created_at) > weekAgo && <Pill tone="accent">new</Pill>}
      </span>
    ) },
    { key: "lang", header: "Language", sortValue: u => u.lang, render: u => <span>{flagOfLang(u.lang)} {u.lang}</span> },
    { key: "country", header: "Country", sortValue: u => u.country, render: u => <span>{flagOfCountry(u.country)} {u.country}</span> },
    { key: "lists", header: "Lists", align: "right", sortValue: u => activeLists(u), render: u => activeLists(u) },
    { key: "joined", header: "Joined", sortValue: u => timeValue(u.created_at), render: u => <span className="text-text-soft">{new Date(u.created_at).toLocaleDateString()}</span> },
    { key: "seen", header: "Last seen", sortValue: u => timeValue(u.last_seen_at), render: u => <span className="text-text-soft">{timeAgo(u.last_seen_at)}</span> },
  ];

  const open = openId ? data.users.find(u => u.id === openId) ?? null : null;
  const openMemberships = open ? listsOf[open.id] ?? [] : [];

  return (
    <div className={open ? "pr-[400px]" : undefined}>
      <TopBar title="Users" subtitle={rows.length === data.users.length ? `${data.users.length} users` : `${rows.length} of ${data.users.length} users`}>
        <TableSearch value={query} onChange={setQuery} placeholder="Search name, language or country" />
        <FilterSelect label="Country" value={country} onChange={setCountry}
          options={[{ value: "", label: "All countries" }, ...countries.map(c => ({ value: c, label: `${flagOfCountry(c)} ${c}` }))]} />
        <FilterSelect label="Language" value={lang} onChange={setLang}
          options={[{ value: "", label: "All languages" }, ...langs.map(l => ({ value: l, label: `${flagOfLang(l)} ${l}` }))]} />
      </TopBar>
      <DataTable columns={columns} rows={rows} rowKey={u => u.id} activeKey={openId}
        onRowClick={u => { setOpenId(u.id); setConfirmDelete(false); }}
        initialSort={{ key: "seen", dir: "desc" }} empty="No users match." />

      {open && (
        <SidePanel title={open.name} subtitle={`${flagOfLang(open.lang)} ${open.lang} · ${flagOfCountry(open.country)} ${open.country}`} onClose={() => setOpenId(null)}>
          <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-[13px] mb-5">
            <dt className="text-text-muted">Joined</dt><dd className="text-text">{new Date(open.created_at).toLocaleString()}</dd>
            <dt className="text-text-muted">Last seen</dt><dd className="text-text">{timeAgo(open.last_seen_at)}</dd>
            <dt className="text-text-muted">Admin</dt><dd className="text-text">{open.is_admin ? "Yes" : "No"}</dd>
          </dl>
          <h4 className="text-[12px] font-bold uppercase tracking-wider text-text-muted mb-2">Lists ({openMemberships.length})</h4>
          {openMemberships.length === 0 && <p className="text-[13px] text-text-muted mb-4">Not in any list.</p>}
          <div className="flex flex-col gap-1.5 mb-6">
            {openMemberships.map(m => {
              const l = listById[m.list_id];
              return (
                <button key={m.list_id} type="button" onClick={() => onOpenList(m.list_id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg text-left cursor-pointer hover:bg-text/5">
                  <span className="flex-1 min-w-0 truncate text-[13px] text-text">{l?.name ?? m.list_id}</span>
                  {m.role === "owner" && <Pill tone="accent">owner</Pill>}
                  {m.status !== "active" && <Pill>{m.status}</Pill>}
                </button>
              );
            })}
          </div>
          <button type="button"
            onClick={async () => {
              if (!confirmDelete) { setConfirmDelete(true); return; }
              await onDelete(open.id);
              setOpenId(null);
            }}
            className="w-full h-10 rounded-lg text-[13px] font-semibold cursor-pointer"
            style={confirmDelete ? { background: "var(--color-danger-strong)", color: "#fff" } : { background: "var(--color-danger-soft)", color: "var(--color-danger-ink)" }}>
            {confirmDelete ? "Confirm: delete this user" : "Delete user"}
          </button>
          {confirmDelete && <p className="text-[11px] text-text-muted mt-2">Lists they created go to another active member; lists with nobody else are deleted.</p>}
        </SidePanel>
      )}
    </div>
  );
}
