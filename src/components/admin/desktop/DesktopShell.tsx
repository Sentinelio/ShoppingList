import { useEffect, type ReactNode } from "react";
import { IconClose } from "../../ui/icons";

// Desktop admin frame: a fixed sidebar with the section groups, a top bar
// (title, search, actions) and the content area at full width.

export interface NavGroup<K extends string> {
  title: string;
  entries: { key: K; icon: string; label: string; badge?: string | number }[];
}

export function DesktopShell<K extends string>({ groups, current, onOpen, children }: {
  groups: NavGroup<K>[];
  current: K | "home";
  onOpen: (key: K) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-43px)]">
      <nav aria-label="Admin sections" className="w-[220px] shrink-0 border-r border-border-light px-3 py-4 sticky top-[43px] self-start h-[calc(100vh-43px)] overflow-y-auto">
        {groups.map(g => (
          <div key={g.title} className="mb-5">
            <div className="px-2 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted">{g.title}</div>
            {g.entries.map(e => {
              const active = e.key === current;
              return (
                <button key={e.key} type="button" onClick={() => onOpen(e.key)} aria-current={active ? "page" : undefined}
                  className="w-full flex items-center gap-2.5 px-2 h-9 rounded-lg text-[14px] text-left cursor-pointer hover:bg-text/5"
                  style={active ? { background: "var(--color-accent-soft)", color: "var(--color-accent-ink)", fontWeight: 600 } : { color: "var(--color-text-soft)" }}>
                  <span className="w-5 text-center">{e.icon}</span>
                  <span className="flex-1 truncate">{e.label}</span>
                  {e.badge !== undefined && e.badge !== 0 && <span className="text-[11px] text-text-muted">{e.badge}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <main className="flex-1 min-w-0 px-8 py-6">{children}</main>
    </div>
  );
}

export function TopBar({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="flex items-end gap-4 mb-5 flex-wrap">
      <div className="mr-auto">
        <h2 className="text-[22px] font-bold text-text leading-tight">{title}</h2>
        {subtitle && <div className="text-[13px] text-text-muted mt-0.5">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

export function TableSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="h-9 w-[280px] px-3 rounded-lg bg-card border border-border-light text-[13px] text-text outline-none focus:border-accent placeholder:text-text-muted" />
  );
}

export function FilterSelect({ value, onChange, options, label }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} aria-label={label}
      className="h-9 px-2 rounded-lg bg-card border border-border-light text-[13px] text-text cursor-pointer">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// Right-hand detail panel; Escape closes it.
export function SidePanel({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <aside className="fixed right-0 top-[43px] bottom-0 z-30 w-[400px] bg-card border-l border-border-light shadow-2xl flex flex-col" aria-label={title}>
      <div className="flex items-start gap-2 px-5 pt-4 pb-3 border-b border-border">
        <div className="flex-1 min-w-0">
          <h3 className="text-[17px] font-bold text-text truncate">{title}</h3>
          {subtitle && <div className="text-[12px] text-text-muted truncate">{subtitle}</div>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center text-text-soft cursor-pointer hover:bg-text/5">
          <IconClose size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
    </aside>
  );
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" | "success" | "danger" | "info" }) {
  const color = tone === "muted" ? "var(--color-text-soft)" : `var(--color-${tone})`;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>{children}</span>
  );
}
