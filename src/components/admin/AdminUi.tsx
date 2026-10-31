import { useState, type ReactNode } from "react";
import { PAGE_SIZE } from "../../hooks/useShowMore";
import { IconBack, IconSearch } from "../ui/icons";

// Small building blocks shared by the admin screens: a section header with
// back, a search box, collapsible blocks and "show more" paging, so long
// lists never render hundreds of rows at once.

export function SectionHeader({ title, subtitle, onBack, right }: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1 mb-3 -ml-2">
      <button type="button" onClick={onBack} aria-label="Back to admin home"
        className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-text-soft cursor-pointer active:bg-text/5">
        <IconBack />
      </button>
      <div className="flex-1 min-w-0">
        <h2 className="text-[18px] font-bold text-text truncate leading-tight">{title}</h2>
        {subtitle && <div className="text-[11px] text-text-muted truncate">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="sticky top-[52px] z-10 flex items-center gap-2 h-11 px-3 mb-3 rounded-xl bg-card border border-border-light text-text-muted">
      <IconSearch size={18} />
      <input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent outline-none text-[14px] text-text placeholder:text-text-muted" />
      {value && (
        <button type="button" onClick={() => onChange("")} className="text-[12px] font-semibold text-text-soft cursor-pointer">Clear</button>
      )}
    </label>
  );
}

export function Chips<T extends string>({ options, value, onChange }: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1.5 mb-3 overflow-x-auto">
      {options.map(o => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={value === o.id}
          className="h-8 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap cursor-pointer"
          style={{
            background: value === o.id ? "var(--color-accent-soft)" : "var(--color-card)",
            color: value === o.id ? "var(--color-accent-ink)" : "var(--color-text-soft)",
          }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Collapsible({ title, summary, defaultOpen = false, children }: {
  title: ReactNode;
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card rounded-xl border border-border mb-3 overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 min-h-[48px] text-left cursor-pointer">
        <span className="text-[9px] text-text-muted shrink-0" style={{ transform: open ? "rotate(90deg)" : "", transition: "transform 0.15s", display: "inline-block" }}>▶</span>
        <span className="flex-1 min-w-0 text-[13px] font-bold text-text truncate">{title}</span>
        {summary && <span className="shrink-0 text-[11px] text-text-muted">{summary}</span>}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

export function ShowMore({ remaining, onMore }: { remaining: number; onMore: () => void }) {
  if (remaining <= 0) return null;
  return (
    <button type="button" onClick={onMore}
      className="w-full mt-2 h-11 rounded-xl bg-card border border-border-light text-[13px] font-semibold text-text-soft cursor-pointer active:bg-text/5">
      Show {Math.min(remaining, PAGE_SIZE)} more · {remaining} left
    </button>
  );
}

export interface HomeEntry<K extends string> {
  key: K;
  icon: string;
  label: string;
  summary: string;
  alert?: string;
}

export function AdminHome<K extends string>({ groups, onOpen }: {
  groups: { title: string; entries: HomeEntry<K>[] }[];
  onOpen: (key: K) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {groups.map(g => (
        <section key={g.title}>
          <h2 className="px-1 mb-2 text-[11px] font-bold uppercase tracking-wider text-text-muted">{g.title}</h2>
          <div className="rounded-[14px] bg-card divide-y divide-border overflow-hidden">
            {g.entries.map(e => (
              <button key={e.key} type="button" onClick={() => onOpen(e.key)}
                className="w-full flex items-center gap-3 px-3 min-h-[60px] py-2 text-left cursor-pointer active:bg-text/5">
                <span className="w-10 h-10 shrink-0 rounded-xl bg-bg flex items-center justify-center text-[20px]">{e.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold text-text truncate">{e.label}</span>
                  <span className="block text-[12px] text-text-muted truncate">{e.summary}</span>
                  {e.alert && (
                    <span className="inline-block mt-1 max-w-full truncate px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{ background: "var(--color-accent-soft)", color: "var(--color-accent-ink)" }}>{e.alert}</span>
                  )}
                </span>
                <span className="shrink-0 text-text-muted text-[18px]" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
