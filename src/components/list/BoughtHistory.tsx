import { useMemo, useState } from "react";
import { t } from "../../data/i18n";
import { primaryName, secondaryName } from "../../lib/names";
import { formatQtyUnit } from "../../data/i18n";
import { productKeyOf, type Purchase } from "../../hooks/usePurchases";
import { IconChevronDown } from "../ui/icons";

interface Props {
  purchases: Purchase[];
  listLang: string;
  userLang: string;
  lang: string;
  /** product_keys already waiting in the list (no "add again" for them). */
  pendingKeys: Set<string>;
  /** Items still in the list (today's bought ones show there, not here). */
  listedItemIds: Set<string>;
  onAddAgain: (p: Purchase) => void;
}

const dayKey = (iso: string) => {
  const d = new Date(iso.replace(" ", "T"));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Under "Bought": what was bought on earlier days (the list clears its
// bought items; the purchase log keeps them), one folded block per day,
// each product with "add again".
export default function BoughtHistory({ purchases, listLang, userLang, lang, pendingKeys, listedItemIds, onAddAgain }: Props) {
  // Fixed for the life of the screen (impure clock reads stay out of render).
  const [{ today, yesterday }] = useState(() => ({
    today: dayKey(new Date().toISOString()),
    yesterday: dayKey(new Date(Date.now() - 86400000).toISOString()),
  }));
  const days = useMemo(() => {
    const map = new Map<string, Purchase[]>();
    for (const p of purchases) {
      const k = dayKey(p.bought_at);
      // Today's purchases show in the list itself, unless already cleared.
      if (k === today && listedItemIds.has(p.item_id)) continue;
      (map.get(k) ?? map.set(k, []).get(k)!).push(p);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [purchases, today, listedItemIds]);
  const [open, setOpen] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  if (!days.length) return null;

  const fmt = new Intl.DateTimeFormat(lang, { weekday: "long", day: "numeric", month: "long" });
  const title = (k: string) => {
    if (k === today) return new Intl.RelativeTimeFormat(lang, { numeric: "auto" }).format(0, "day");
    if (k === yesterday) return new Intl.RelativeTimeFormat(lang, { numeric: "auto" }).format(-1, "day");
    const [y, m, d] = k.split("-").map(Number);
    return fmt.format(new Date(y, m - 1, d));
  };

  return (
    <section className="mt-5">
      <div className="px-1 mb-2 text-[13px] font-bold uppercase tracking-wide text-text-muted">{t(lang, "boughtHistory")}</div>
      <div className="flex flex-col gap-2">
        {days.map(([k, rows], i) => {
          const isOpen = open === k || (open === null && i === 0);
          return (
            <div key={k} className="rounded-[14px] bg-card overflow-hidden">
              <button type="button" onClick={() => setOpen(isOpen ? "" : k)} aria-expanded={isOpen}
                className="w-full min-h-[48px] flex items-center gap-2 px-4 cursor-pointer">
                <span className="flex-1 text-left text-[14px] font-semibold text-text first-letter:uppercase">{title(k)}</span>
                <span className="text-[12px] text-text-muted tabular-nums">{rows.length}</span>
                <IconChevronDown size={18} className={`text-text-muted transition-transform ${isOpen ? "" : "-rotate-90"}`} />
              </button>
              {isOpen && (
                <div className="divide-y divide-border border-t border-border">
                  {rows.map(p => {
                    const named = { original: p.original, translations: p.translations };
                    const mine = secondaryName(named, listLang, userLang);
                    const qty = formatQtyUnit(p.qty, p.unit, lang);
                    const inList = pendingKeys.has(productKeyOf(p)) || added.has(p.product_key);
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-2 min-h-[52px]">
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] font-semibold truncate" style={{ color: "var(--color-primary-name)" }}>{primaryName(named, listLang)}</div>
                          <div className="text-[12px] truncate text-text-muted">
                            {[mine, qty, p.expand?.user_id?.name].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        {inList ? (
                          <span className="text-[12px] text-success font-semibold shrink-0">✓ {t(lang, "inList")}</span>
                        ) : (
                          <button type="button" onClick={() => { setAdded(s => new Set(s).add(p.product_key)); onAddAgain(p); }}
                            aria-label={t(lang, "addAgain")} title={t(lang, "addAgain")}
                            className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-[18px] cursor-pointer active:bg-text/10"
                            style={{ color: "var(--color-accent)", background: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }}>↺</button>
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
    </section>
  );
}
