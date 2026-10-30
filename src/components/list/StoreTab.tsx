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
      {phrase && (
        <button type="button" onClick={() => setPhraseKey(null)} aria-label={t(lang, "tapToClose")}
          className="shrink-0 w-full px-4 py-4 text-center cursor-pointer" style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}>
          <div className="text-[26px] font-extrabold leading-tight">
            {phrase.emoji} {phrase.translations[listLang] || phrase.translations.en || phrase.key}
          </div>
          {listLang !== userLang && phrase.translations[userLang] && (
            <div className="text-[13px] mt-1 opacity-75">{phrase.translations[userLang]}</div>
          )}
        </button>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center text-center px-5 py-4">
        {item ? (
          <>
            <ItemIcon name={item.original} category={item.category} photo={item.photo} size={170} />
            <div className="mt-5 text-[52px] font-extrabold leading-[1.05] break-words max-w-full"
              style={{ color: item.important ? "var(--color-important)" : "var(--color-primary-name)" }}>
              {primaryName(item, listLang)}
            </div>
            {secondaryName(item, listLang, userLang) && (
              <div className="mt-2 text-[17px]" style={{ color: "var(--color-secondary-name)" }}>
                {secondaryName(item, listLang, userLang)}
              </div>
            )}
            {item.qty && (
              <div className="mt-4 rounded-full px-5 py-1.5 text-[22px] font-bold text-text" style={{ background: "color-mix(in srgb, var(--color-text) 8%, transparent)" }}>
                {formatQtyUnit(item.qty, item.unit, lang)}
              </div>
            )}
            {(item.brand || item.note) && (
              <div className="mt-2 text-[13px] text-text-muted">{[item.brand, item.note].filter(Boolean).join(" · ")}</div>
            )}
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
                  {/* Picked in my language; the country's one small below. */}
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-semibold text-text truncate">
                      {capitalize(p.translations[userLang] || p.translations[listLang] || p.translations.en || p.key)}
                    </span>
                    {listLang !== userLang && p.translations[listLang] && p.translations[listLang] !== p.translations[userLang] && (
                      <span className="block text-[12px] truncate" style={{ color: "var(--color-secondary-name)" }}>{p.translations[listLang]}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
