import { useEffect, useMemo, useState } from "react";
import type { Item } from "../../lib/pocketbase";
import { t, formatQtyUnit } from "../../data/i18n";
import { primaryName, secondaryName, capitalize } from "../../lib/names";
import { useStorePhrases } from "../../hooks/useStorePhrases";
import { incrementPhraseUsage } from "../../lib/storePhrasesStore";
import ItemIcon from "../items/ItemIcon";
import { IconBack, IconChevronDown, IconChevronRight } from "../ui/icons";

interface StoreTabProps {
  /** Pending items, already in list order. */
  items: Item[];
  /** Item to open on (from "Mostrar en la tienda"). */
  startItemId: string | null;
  listLang: string;
  userLang: string;
}

// What the staff needs to find the right product: how many and in what
// (units, packs, kg…), the brand and my note. Labels and units in the
// country's language, with mine small next to them.
function StoreDetails({ item, listLang, userLang }: { item: Item; listLang: string; userLang: string }) {
  const label = (key: "quantity" | "brand" | "note") => {
    const theirs = t(listLang, key), mine = t(userLang, key);
    return theirs === mine ? theirs : `${theirs} · ${mine}`;
  };
  const qtyTheirs = formatQtyUnit(item.qty, item.unit, listLang);
  const qtyMine = formatQtyUnit(item.qty, item.unit, userLang);
  const rows: Array<{ key: string; label: string; value: string; sub?: string }> = [];
  if (qtyTheirs) rows.push({ key: "qty", label: label("quantity"), value: qtyTheirs, sub: qtyMine !== qtyTheirs ? qtyMine : undefined });
  if (item.brand?.trim()) rows.push({ key: "brand", label: label("brand"), value: item.brand.trim() });
  if (item.note?.trim()) rows.push({ key: "note", label: label("note"), value: item.note.trim() });
  if (!rows.length) return null;
  return (
    <div className="mt-5 w-full max-w-[420px] rounded-[14px] bg-card divide-y divide-border text-left overflow-hidden">
      {rows.map(r => (
        <div key={r.key} className="px-4 py-2.5">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">{r.label}</div>
          <div className={`${r.key === "note" ? "text-[18px] font-semibold" : "text-[24px] font-extrabold"} text-text leading-tight break-words`}>{r.value}</div>
          {r.sub && <div className="text-[13px] text-text-soft">{r.sub}</div>}
        </div>
      ))}
    </div>
  );
}

// 3.7 — one pending product at a time, big, in the list country's language,
// to show at the counter. Phrases for the staff fold at the bottom; the
// chosen one shows full width on top until tapped.
export default function StoreTab({ items, startItemId, listLang, userLang }: StoreTabProps) {
  const lang = userLang;
  const phrases = useStorePhrases();
  const [currentId, setCurrentId] = useState<string | null>(startItemId);
  const [showPhrases, setShowPhrases] = useState(false);
  const [phraseKey, setPhraseKey] = useState<string | null>(null);

  useEffect(() => {
    if (startItemId) setCurrentId(startItemId);
  }, [startItemId]);

  // Stay on the same product while the list changes; fall back to the first.
  const index = useMemo(() => {
    const i = items.findIndex(it => it.id === currentId);
    return i >= 0 ? i : 0;
  }, [items, currentId]);
  const item = items[index];
  const go = (delta: number) => {
    if (!items.length) return;
    setCurrentId(items[(index + delta + items.length) % items.length].id);
  };

  const phrase = phraseKey ? phrases.find(p => p.key === phraseKey) : null;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Read top to bottom by the staff: the question, right on top of the
          product it is about, its details, and the picture last. */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center-safe text-center px-5 py-4 *:shrink-0">
        {item ? (
          <>
            {phrase && (
              <button type="button" onClick={() => setPhraseKey(null)} aria-label={t(lang, "tapToClose")}
                className="w-full max-w-[420px] mb-3 px-4 py-3 rounded-[18px] text-center cursor-pointer"
                style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}>
                <div className="text-[26px] font-extrabold leading-tight">
                  {phrase.emoji} {phrase.translations[listLang] || phrase.translations.en || phrase.key}
                </div>
                {listLang !== userLang && phrase.translations[userLang] && (
                  <div className="text-[13px] mt-1 opacity-75">{phrase.translations[userLang]}</div>
                )}
              </button>
            )}
            <div className="text-[52px] font-extrabold leading-[1.05] break-words max-w-full"
              style={{ color: item.important ? "var(--color-important)" : "var(--color-primary-name)" }}>
              {primaryName(item, listLang)}
            </div>
            {secondaryName(item, listLang, userLang) && (
              <div className="mt-2 text-[17px]" style={{ color: "var(--color-secondary-name)" }}>
                {secondaryName(item, listLang, userLang)}
              </div>
            )}
            <StoreDetails item={item} listLang={listLang} userLang={userLang} />
            <div className="mt-5">
              <ItemIcon name={item.original} category={item.category} photo={item.photo} size={phrase ? 130 : 160} />
            </div>
          </>
        ) : (
          <div className="text-text-soft">
            <div className="text-5xl mb-3 opacity-40">🎉</div>
            {t(lang, "storeEmpty")}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="shrink-0 flex items-center justify-between px-3 pb-2">
          <button type="button" onClick={() => go(-1)} aria-label={t(lang, "previous")}
            className="w-14 h-14 rounded-full bg-card flex items-center justify-center text-text cursor-pointer active:bg-text/10">
            <IconBack size={26} />
          </button>
          <span className="text-[15px] font-semibold text-text-soft tabular-nums">
            {t(lang, "storeOf").replace("{n}", String(index + 1)).replace("{total}", String(items.length))}
          </span>
          <button type="button" onClick={() => go(1)} aria-label={t(lang, "next")}
            className="w-14 h-14 rounded-full bg-card flex items-center justify-center text-text cursor-pointer active:bg-text/10">
            <IconChevronRight size={26} />
          </button>
        </div>
      )}

      {/* Phrases for the staff (store_phrases), folded */}
      <div className="shrink-0 px-3 pb-2">
        <div className="rounded-[14px] bg-card overflow-hidden">
          <button type="button" onClick={() => setShowPhrases(v => !v)} aria-expanded={showPhrases}
            className="w-full min-h-[48px] flex items-center gap-2 px-4 cursor-pointer">
            <span className="flex-1 text-left text-[15px] font-semibold text-text">💬 {t(lang, "phrasesForStaff")}</span>
            <IconChevronDown size={18} className={`text-text-muted transition-transform ${showPhrases ? "rotate-180" : ""}`} />
          </button>
          {showPhrases && (
            <div className="max-h-[32dvh] overflow-y-auto divide-y divide-border border-t border-border">
              {phrases.map(p => (
                <button key={p.key} type="button"
                  onClick={() => { setPhraseKey(p.key); setShowPhrases(false); void incrementPhraseUsage(p.key); }}
                  className="w-full min-h-[48px] flex items-center gap-3 px-4 py-1.5 text-left cursor-pointer active:bg-text/5">
                  <span className="text-lg" aria-hidden="true">{p.emoji}</span>
                  {/* In the country's language, as it will be shown; mine small below. */}
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-semibold text-text truncate">
                      {capitalize(p.translations[listLang] || p.translations.en || p.translations[userLang] || p.key)}
                    </span>
                    {listLang !== userLang && p.translations[userLang] && p.translations[userLang] !== p.translations[listLang] && (
                      <span className="block text-[12px] truncate" style={{ color: "var(--color-secondary-name)" }}>{p.translations[userLang]}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Pictures of the product (in the country's language, + brand) to
            show the staff what it looks like. */}
        {item && (
          <a href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(primaryName(item, listLang) + (item.brand ? " " + item.brand : ""))}`}
            target="_blank" rel="noopener noreferrer"
            className="mt-2 w-full min-h-[48px] flex items-center gap-2 px-4 rounded-[14px] bg-card text-[15px] font-semibold text-text cursor-pointer active:bg-text/5">
            <span className="flex-1 text-left">🔍 {t(lang, "googleImages")}</span>
            <IconChevronRight size={18} className="text-text-muted" />
          </a>
        )}
      </div>
    </div>
  );
}
