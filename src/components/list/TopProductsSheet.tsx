import { useMemo, useState } from "react";
import Sheet from "../ui/Sheet";
import { t } from "../../data/i18n";
import { primaryName, secondaryName } from "../../lib/names";
import { usePurchases, tallyByProduct, type Purchase } from "../../hooks/usePurchases";

interface Props {
  open: boolean;
  onClose: () => void;
  listId: string;
  userId: string;
  listLang: string;
  userLang: string;
  lang: string;
  pendingKeys: Set<string>;
  onAdd: (p: Purchase) => void;
}

// "Most bought": the top 100 products of this list, or of all my lists,
// with how often they are bought; one tap puts one back in the list.
export default function TopProductsSheet({ open, onClose, listId, userId, listLang, userLang, lang, pendingKeys, onAdd }: Props) {
  const [scope, setScope] = useState<"list" | "all">("list");
  const { purchases, loading } = usePurchases({ listId: scope === "list" ? listId : undefined, userId, enabled: open });
  const top = useMemo(() => tallyByProduct(purchases).slice(0, 100), [purchases]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const chip = (on: boolean) => `flex-1 h-10 rounded-full text-[14px] font-semibold cursor-pointer ${on ? "text-white" : "text-text-soft bg-bg"}`;

  return (
    <Sheet open={open} onClose={onClose} title={`⭐ ${t(lang, "mostBought")}`} closeLabel={t(lang, "close")}>
      <div className="flex gap-2 mb-3">
        <button type="button" className={chip(scope === "list")} style={scope === "list" ? { background: "var(--color-accent)" } : undefined} onClick={() => setScope("list")}>{t(lang, "thisList")}</button>
        <button type="button" className={chip(scope === "all")} style={scope === "all" ? { background: "var(--color-accent)" } : undefined} onClick={() => setScope("all")}>{t(lang, "allMyLists")}</button>
      </div>
      {!loading && top.length === 0 && <p className="text-[14px] text-text-soft py-6 text-center">{t(lang, "noPurchasesYet")}</p>}
      <div className="rounded-[14px] bg-bg divide-y divide-border overflow-hidden">
        {top.map((row, i) => {
          const named = { original: row.last.original, translations: row.last.translations };
          const mine = secondaryName(named, listLang, userLang);
          const inList = pendingKeys.has(row.key) || added.has(row.key);
          const facts = [(row.count === 1 ? t(lang, "timesBoughtOne") : t(lang, "timesBought").replace("{n}", String(row.count))), row.everyDays ? t(lang, "everyNDays").replace("{n}", String(row.everyDays)) : ""].filter(Boolean).join(" · ");
          return (
            <div key={row.key} className="flex items-center gap-3 px-3 py-2 min-h-[56px]">
              <span className="w-7 text-right text-[13px] font-bold tabular-nums text-text-muted shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold truncate" style={{ color: "var(--color-primary-name)" }}>{primaryName(named, listLang)}</div>
                <div className="text-[12px] truncate text-text-muted">{[mine, facts].filter(Boolean).join(" · ")}</div>
              </div>
              {inList ? (
                <span className="text-[12px] text-success font-semibold shrink-0">✓ {t(lang, "inList")}</span>
              ) : (
                <button type="button" onClick={() => { setAdded(s => new Set(s).add(row.key)); onAdd(row.last); }}
                  aria-label={t(lang, "addAgain")} title={t(lang, "addAgain")}
                  className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-[20px] font-bold cursor-pointer active:bg-text/10"
                  style={{ color: "var(--color-accent)", background: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }}>+</button>
              )}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
