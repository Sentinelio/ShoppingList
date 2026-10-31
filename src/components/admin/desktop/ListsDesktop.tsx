import { useMemo, useState } from "react";
import DataTable, { type Column } from "./DataTable";
import { TopBar, TableSearch, FilterSelect, SidePanel, Pill } from "./DesktopShell";
import { getCountries } from "../../../data/countries";
import { timeAgo, timeValue, type PeopleData, type PMember, type PList } from "../../../lib/adminPeople";

const flagOfCountry = (code?: string) => (code ? getCountries().find(c => c.code === code)?.flag ?? "🌍" : "—");
const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export type BulkField = "require_approval" | "who_can_approve" | "who_can_remove";

const POLICY_LABEL: Record<string, string> = {
  "": "Stay until moved", keep: "Stay until moved", next_trip: "Back on next trip", next_day: "Back the next day",
};

export default function ListsDesktop({ data, openId, onOpen, onDelete, onBulkUpdate }: {
  data: PeopleData;
  openId: string | null;
  onOpen: (listId: string | null) => void;
  onDelete: (listId: string) => Promise<void>;
  onBulkUpdate: (field: BulkField, value: boolean | string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [showAccess, setShowAccess] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const userById = useMemo(() => Object.fromEntries(data.users.map(u => [u.id, u])), [data.users]);
  const membersOf = useMemo(() => {
    const m: Record<string, PMember[]> = {};
    for (const mm of data.members) (m[mm.list_id] ??= []).push(mm);
    return m;
  }, [data.members]);
  const active = (l: PList) => (membersOf[l.id] ?? []).filter(m => m.status === "active").length;
  const stats = (l: PList) => data.itemsByList[l.id] ?? { total: 0, pending: 0, checked: 0, unavailable: 0, lastAdded: null };
  const lastUsed = (l: PList) => [l.last_checked_at, stats(l).lastAdded].filter(Boolean).sort().pop() ?? null;

  const rows = useMemo(() => {
    const q = norm(query.trim());
    return data.lists.filter(l => (!q || norm(`${l.name} ${l.code}`).includes(q)) && (!country || l.country === country));
  }, [data.lists, query, country]);
  const countries = [...new Set(data.lists.map(l => l.country).filter((c): c is string => !!c))].sort();

  const columns: Column<PList>[] = [
    { key: "name", header: "Name", sortValue: l => l.name.toLowerCase(), render: l => (
      <span className="flex items-center gap-2">
        <span className="text-[18px] leading-none">{l.country ? flagOfCountry(l.country) : "🛒"}</span>
        <span className="font-semibold text-text truncate">{l.name}</span>
      </span>
    ) },
    { key: "code", header: "Code", sortValue: l => l.code, render: l => <code className="text-text-soft text-[12px]">{l.code}</code> },
    { key: "members", header: "Members", align: "right", sortValue: active, render: active },
    { key: "items", header: "Items", align: "right", sortValue: l => stats(l).total, render: l => stats(l).total },
    { key: "pending", header: "To buy", align: "right", sortValue: l => stats(l).pending, render: l => stats(l).pending },
    { key: "used", header: "Last used", sortValue: l => timeValue(lastUsed(l)), render: l => <span className="text-text-soft">{timeAgo(lastUsed(l))}</span> },
    { key: "approval", header: "Joining", sortValue: l => (l.require_approval ? 1 : 0), render: l => l.require_approval ? <Pill tone="accent">approval</Pill> : <Pill>open</Pill> },
  ];

  const open = openId ? data.lists.find(l => l.id === openId) ?? null : null;
  const first = data.lists[0];
  const panelOpen = !!open || showAccess;

  return (
    <div className={panelOpen ? "pr-[400px]" : undefined}>
      <TopBar title="Lists" subtitle={rows.length === data.lists.length ? `${data.lists.length} lists` : `${rows.length} of ${data.lists.length} lists`}>
        <TableSearch value={query} onChange={setQuery} placeholder="Search name or code" />
        <FilterSelect label="Country" value={country} onChange={setCountry}
          options={[{ value: "", label: "All countries" }, ...countries.map(c => ({ value: c, label: `${flagOfCountry(c)} ${c}` }))]} />
        <button type="button" onClick={() => { onOpen(null); setShowAccess(true); }}
          className="h-9 px-3 rounded-lg bg-card border border-border-light text-[13px] font-semibold text-text cursor-pointer hover:bg-text/5">
          ⚙️ Access for all lists
        </button>
      </TopBar>
      <DataTable columns={columns} rows={rows} rowKey={l => l.id} activeKey={openId}
        onRowClick={l => { setShowAccess(false); setConfirmDelete(null); onOpen(l.id); }}
        initialSort={{ key: "used", dir: "desc" }} empty="No lists match." />

      {showAccess && !open && (
        <SidePanel title="Access for all lists" subtitle={`Applies to the ${data.lists.length} lists`} onClose={() => setShowAccess(false)}>
          <label className="flex items-center justify-between gap-3 py-3 border-b border-border">
            <span>
              <span className="block text-[13px] font-semibold text-text">Require approval</span>
              <span className="block text-[12px] text-text-muted">Off: anyone with the code joins straight away</span>
            </span>
            <input type="checkbox" checked={first?.require_approval ?? true} onChange={e => onBulkUpdate("require_approval", e.target.checked)}
              className="w-5 h-5 cursor-pointer accent-[var(--color-accent)]" />
          </label>
          {([["who_can_approve", "Who can approve", "Who accepts new members"], ["who_can_remove", "Who can remove", "Who can take members out"]] as const).map(([field, title, hint]) => (
            <label key={field} className="flex items-center justify-between gap-3 py-3 border-b border-border">
              <span>
                <span className="block text-[13px] font-semibold text-text">{title}</span>
                <span className="block text-[12px] text-text-muted">{hint}</span>
              </span>
              <select value={first?.[field] ?? "owner"} onChange={e => onBulkUpdate(field, e.target.value)}
                className="h-9 px-2 rounded-lg bg-bg border border-border-light text-[13px] text-text cursor-pointer">
                <option value="owner">Only the creator</option>
                <option value="any_member">Any member</option>
              </select>
            </label>
          ))}
          <p className="text-[11px] text-text-muted mt-3">Shows the first list's value; changing it sets every list.</p>
        </SidePanel>
      )}

      {open && (
        <SidePanel title={`${open.country ? flagOfCountry(open.country) : "🛒"} ${open.name}`} subtitle={`Code ${open.code} · created ${new Date(open.created_at).toLocaleDateString()}`} onClose={() => onOpen(null)}>
          <div className="grid grid-cols-4 gap-2 mb-5 text-center">
            {[["Items", stats(open).total], ["To buy", stats(open).pending], ["Bought", stats(open).checked], ["Out", stats(open).unavailable]].map(([k, v]) => (
              <div key={k} className="bg-bg rounded-lg py-2">
                <div className="text-[18px] font-bold text-text">{v}</div>
                <div className="text-[11px] text-text-muted">{k}</div>
              </div>
            ))}
          </div>
          <dl className="grid grid-cols-[130px_1fr] gap-y-2 text-[13px] mb-5">
            <dt className="text-text-muted">Created by</dt><dd className="text-text">{userById[open.created_by]?.name ?? "—"}</dd>
            <dt className="text-text-muted">Country</dt><dd className="text-text">{open.country ? `${flagOfCountry(open.country)} ${open.country}` : "Not set (each member's own)"}</dd>
            <dt className="text-text-muted">Last used</dt><dd className="text-text">{timeAgo(lastUsed(open))}</dd>
            <dt className="text-text-muted">Joining</dt><dd className="text-text">{open.require_approval ? "Needs approval" : "Open with the code"}</dd>
            <dt className="text-text-muted">Who approves</dt><dd className="text-text">{open.who_can_approve === "any_member" ? "Any member" : "Only the creator"}</dd>
            <dt className="text-text-muted">"Out of stock"</dt><dd className="text-text">{POLICY_LABEL[open.unavailable_policy ?? ""] ?? open.unavailable_policy}</dd>
          </dl>
          <h4 className="text-[12px] font-bold uppercase tracking-wider text-text-muted mb-2">Members ({(membersOf[open.id] ?? []).length})</h4>
          <div className="flex flex-col gap-1.5 mb-6">
            {(membersOf[open.id] ?? []).map(m => (
              <div key={m.user_id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg">
                <span className="flex-1 min-w-0 truncate text-[13px] text-text">{userById[m.user_id]?.name ?? m.user_id}</span>
                {m.role === "owner" && <Pill tone="accent">owner</Pill>}
                {m.status !== "active" && <Pill>{m.status}</Pill>}
              </div>
            ))}
          </div>
          <button type="button"
            onClick={async () => {
              if (confirmDelete !== open.id) { setConfirmDelete(open.id); return; }
              await onDelete(open.id);
              onOpen(null);
            }}
            className="w-full h-10 rounded-lg text-[13px] font-semibold cursor-pointer"
            style={confirmDelete === open.id ? { background: "var(--color-danger-strong)", color: "#fff" } : { background: "var(--color-danger-soft)", color: "var(--color-danger-ink)" }}>
            {confirmDelete === open.id ? "Confirm: delete list and its items" : "Delete list"}
          </button>
        </SidePanel>
      )}
    </div>
  );
}
