import { useEffect, useState } from "react";
import { t } from "../../data/i18n";
import { IconClose } from "./icons";

// Safari's own Share glyph (square with an arrow), so the step matches the bar.
function SafariShareIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#4aa3ff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d="M8 8H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2" />
      <polyline points="16 5 12 1 8 5" />
      <line x1="12" y1="1" x2="12" y2="14" />
    </svg>
  );
}

const SEEN_KEY = "babelcart_ios_install_hint_v1";

// Safari on iPhone/iPad (not Chrome/Firefox/Edge for iOS, which can't add
// to the Home Screen the same way), and not already opened from it.
function shouldShow(): boolean {
  try {
    if (localStorage.getItem(SEEN_KEY)) return false;
  } catch {
    return false; // no storage: we couldn't remember it was closed
  }
  const ua = navigator.userAgent;
  const iOS = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); // iPadOS
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua);
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  return iOS && safari && !standalone;
}

// Shown once: remembered as soon as it appears, so it never comes back.
export default function IosInstallHint({ lang }: { lang: string }) {
  const [open, setOpen] = useState(shouldShow);
  useEffect(() => {
    if (!open) return;
    try { localStorage.setItem(SEEN_KEY, new Date().toISOString()); } catch { /* ignore */ }
  }, [open]);
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label={t(lang, "installTitle")}
      className="fixed left-3 right-3 z-40 rounded-[14px] bg-card border border-border-light shadow-2xl px-4 py-3"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 92px)" }}
    >
      <div className="flex items-start gap-3">
        <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold text-text leading-snug">{t(lang, "installTitle")}</div>
          <div className="text-[12px] text-text-muted mt-0.5">{t(lang, "installWhy")}</div>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label={t(lang, "close")}
          className="shrink-0 -mr-2 -mt-1 w-10 h-10 rounded-full flex items-center justify-center text-text-soft cursor-pointer active:bg-white/5">
          <IconClose size={18} />
        </button>
      </div>
      <ol className="mt-2.5 flex flex-col gap-1.5 text-[13px] text-text">
        <li className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-bg text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
          <span className="flex-1">{t(lang, "installStep1")}</span>
          <SafariShareIcon />
        </li>
        <li className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-bg text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
          <span className="flex-1">{t(lang, "installStep2")}</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-bg text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
          <span className="flex-1">{t(lang, "installStep3")}</span>
        </li>
      </ol>
    </div>
  );
}
