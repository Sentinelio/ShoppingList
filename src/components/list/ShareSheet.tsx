import { useState } from "react";
import type { Item, List } from "../../lib/pocketbase";
import { t, formatQtyUnit } from "../../data/i18n";
import { copyToClipboard } from "../../lib/clipboard";
import { categoryNames, primaryName, secondaryName } from "../../lib/names";
import { CATEGORY_ORDER } from "../../data/categories";
import Sheet from "../ui/Sheet";
import QrCode from "../ui/QrCode";
import { joinUrl } from "../../lib/joinLink";

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  list: List | null;
  /** Items still to buy, for the bilingual text. */
  items: Item[];
  listLang: string;
  userLang: string;
  isOwner: boolean;
  onRequireApproval: (value: boolean) => void;
}

/** "Mleko — Leche (2 L)" lines grouped by category, both languages side by side. */
function bilingualText(list: List, items: Item[], listLang: string, userLang: string): string {
  const byCat: Record<string, Item[]> = {};
  for (const it of items) (byCat[it.category || "other"] ??= []).push(it);
  const cats = [...CATEGORY_ORDER, ...Object.keys(byCat).filter(c => !CATEGORY_ORDER.includes(c))].filter(c => byCat[c]);
  const lines = [`🛒 ${list.name}`];
  for (const cat of cats) {
    const names = categoryNames(cat, listLang, userLang);
    lines.push("", names.secondary ? `${names.primary} — ${names.secondary}` : names.primary);
    for (const it of byCat[cat]) {
      const mine = secondaryName(it, listLang, userLang);
      const qty = formatQtyUnit(it.qty, it.unit, userLang);
      lines.push(`• ${primaryName(it, listLang)}${mine ? ` — ${mine}` : ""}${qty ? ` (${qty})` : ""}`);
    }
  }
  return lines.join("\n");
}

// 3.8 — the only place that shows the invite code.
export default function ShareSheet({ open, onClose, list, items, listLang, userLang, isOwner, onRequireApproval }: ShareSheetProps) {
  const lang = userLang;
  const [flash, setFlash] = useState<string | null>(null);
  if (!list) return null;
  const url = joinUrl(list.code);

  const notify = (key: string) => {
    setFlash(key);
    setTimeout(() => setFlash(prev => (prev === key ? null : prev)), 2000);
  };

  // Web Share API where available; copying is the fallback.
  const share = async (text: string, key: string, withUrl: boolean) => {
    if (navigator.share) {
      try {
        await navigator.share(withUrl ? { title: list.name, text, url } : { title: list.name, text });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    await copyToClipboard(withUrl ? `${text}\n${url}` : text);
    notify(key);
  };

  const inviteText = t(lang, "inviteText").replace("{name}", list.name).replace("{code}", list.code);
  const optionBtn = "w-full min-h-[52px] flex items-center gap-3 px-4 text-left text-[15px] text-text cursor-pointer active:bg-white/5";

  return (
    <Sheet open={open} onClose={onClose} title={t(lang, "share")} closeLabel={t(lang, "close")}>
      <div className="flex flex-col items-center text-center pt-1 pb-4">
        <div className="text-[12px] text-text-muted uppercase tracking-wide">{t(lang, "inviteCode")}</div>
        <div className="text-[40px] font-extrabold font-mono tracking-[0.2em] mt-1" style={{ color: "var(--color-accent-ink)" }}>
          {list.code}
        </div>
        <div className="mt-3 p-2 bg-white rounded-2xl">
          <QrCode value={url} size={176} />
        </div>
      </div>

      <div className="rounded-[14px] bg-bg overflow-hidden mb-3">
        <label className={`flex items-center gap-3 px-4 py-3 min-h-[60px] ${isOwner ? "cursor-pointer" : "opacity-60"}`}>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] text-text">{t(lang, "approveBeforeJoin")}</span>
            <span className="block text-[12px] text-text-muted mt-0.5">
              {t(lang, "approveHint")}{!isOwner && ` · ${t(lang, "onlyOwnerChanges")}`}
            </span>
          </span>
          <input type="checkbox" role="switch" className="sr-only peer" checked={list.require_approval}
            disabled={!isOwner} onChange={(e) => onRequireApproval(e.target.checked)} />
          <span aria-hidden="true" className="relative shrink-0 w-12 h-7 rounded-full transition-colors peer-focus-visible:ring-2 ring-accent"
            style={{ background: list.require_approval ? "var(--color-accent)" : "#3a4255" }}>
            <span className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all" style={{ left: list.require_approval ? 24 : 4 }} />
          </span>
        </label>
      </div>

      <div className="rounded-[14px] bg-bg divide-y divide-border overflow-hidden">
        <button type="button" className={optionBtn} onClick={() => share(inviteText, "invite", true)}>
          <span aria-hidden="true">📨</span>
          <span className="flex-1">{flash === "invite" ? `✓ ${t(lang, "copied")}` : t(lang, "sendInvite")}</span>
        </button>
        <button type="button" className={optionBtn} onClick={() => copyToClipboard(list.code).then(() => notify("code"))}>
          <span aria-hidden="true">📋</span>
          <span className="flex-1">{flash === "code" ? `✓ ${t(lang, "copied")}` : t(lang, "copyCode")}</span>
        </button>
        <button type="button" className={optionBtn} onClick={() => share(bilingualText(list, items, listLang, userLang), "list", false)}>
          <span aria-hidden="true">🌍</span>
          <span className="flex-1">{flash === "list" ? `✓ ${t(lang, "copied")}` : t(lang, "sendBilingual")}</span>
        </button>
      </div>
    </Sheet>
  );
}
