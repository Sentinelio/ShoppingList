import { useMemo, useState, type ReactNode } from "react";

// Sortable table for the desktop admin: click a header to sort, 50 rows a
// page, optional row selection (checkboxes) and row click (side panel).

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Value to sort by; columns without it aren't sortable. */
  sortValue?: (row: T) => string | number;
  width?: number | string;
  align?: "left" | "right" | "center";
}

const PAGE = 50;

export default function DataTable<T>({
  columns, rows, rowKey, onRowClick, activeKey, initialSort, empty = "Nothing here.",
  selectable = false, selected, onSelectedChange,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  activeKey?: string | null;
  initialSort?: { key: string; dir: "asc" | "desc" };
  empty?: string;
  selectable?: boolean;
  selected?: Set<string>;
  onSelectedChange?: (next: Set<string>) => void;
}) {
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const col = sort && columns.find(c => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    const dir = sort!.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = get(a), y = get(b);
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * dir;
    });
  }, [rows, columns, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const current = Math.min(page, pages - 1);
  const visible = sorted.slice(current * PAGE, current * PAGE + PAGE);
  const allVisibleSelected = selectable && visible.length > 0 && visible.every(r => selected?.has(rowKey(r)));

  const toggleSort = (c: Column<T>) => {
    if (!c.sortValue) return;
    setSort(s => (s?.key === c.key ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: "asc" }));
    setPage(0);
  };
  const toggleRow = (k: string) => {
    if (!selected || !onSelectedChange) return;
    const next = new Set(selected);
    if (next.has(k)) next.delete(k); else next.add(k);
    onSelectedChange(next);
  };
  const toggleAll = () => {
    if (!selected || !onSelectedChange) return;
    const next = new Set(selected);
    for (const r of visible) { if (allVisibleSelected) next.delete(rowKey(r)); else next.add(rowKey(r)); }
    onSelectedChange(next);
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-text-muted border-b border-border-light">
              {selectable && (
                <th className="w-10 px-3 py-2.5">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select page" className="cursor-pointer accent-[var(--color-accent)]" />
                </th>
              )}
              {columns.map(c => {
                const active = sort?.key === c.key;
                return (
                  <th key={c.key} style={{ width: c.width, textAlign: c.align ?? "left" }}
                    className={`px-3 py-2.5 font-semibold whitespace-nowrap select-none ${c.sortValue ? "cursor-pointer hover:text-text" : ""}`}
                    onClick={() => toggleSort(c)}
                    aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}>
                    {c.header}{active ? (sort!.dir === "asc" ? " ▲" : " ▼") : ""}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={columns.length + (selectable ? 1 : 0)} className="px-3 py-10 text-center text-text-muted">{empty}</td></tr>
            )}
            {visible.map(r => {
              const k = rowKey(r);
              const isActive = activeKey === k;
              return (
                <tr key={k} onClick={() => onRowClick?.(r)}
                  className={`border-b border-border last:border-b-0 ${onRowClick ? "cursor-pointer hover:bg-text/5" : ""}`}
                  style={isActive ? { background: "var(--color-accent-soft)" } : undefined}>
                  {selectable && (
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={!!selected?.has(k)} onChange={() => toggleRow(k)} aria-label="Select row" className="cursor-pointer accent-[var(--color-accent)]" />
                    </td>
                  )}
                  {columns.map(c => (
                    <td key={c.key} className="px-3 py-2 align-middle" style={{ textAlign: c.align ?? "left" }}>{c.render(r)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border-light text-[12px] text-text-soft">
          <span>{current * PAGE + 1}–{Math.min(sorted.length, (current + 1) * PAGE)} of {sorted.length}</span>
          <span className="flex gap-1">
            <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="px-2.5 py-1 rounded-lg bg-bg cursor-pointer disabled:opacity-40">‹ Prev</button>
            <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="px-2.5 py-1 rounded-lg bg-bg cursor-pointer disabled:opacity-40">Next ›</button>
          </span>
        </div>
      )}
    </div>
  );
}
