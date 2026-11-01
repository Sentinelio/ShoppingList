import { t, strings, type Lang } from "../../data/i18n";

// The #transfer code didn't work (expired, already used, offline). Shown
// before the app so the setup wizard doesn't silently create a second
// account at this address.
export default function TransferFailed({ onContinue }: { onContinue: () => void }) {
  // No profile loaded yet: use the browser's language.
  const primary = (navigator.language ?? "en").split("-")[0];
  const ui: Lang = primary in strings ? (primary as Lang) : "en";
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="max-w-sm text-center flex flex-col items-center gap-4">
        <span style={{ fontSize: 48, lineHeight: 1 }} aria-hidden="true">🔑</span>
        <p role="alert" className="text-text text-base leading-snug">{t(ui, "transferFailed")}</p>
        <p className="text-text-muted text-sm">{t(ui, "transferFailedHint")}</p>
        <button type="button" onClick={onContinue}
          className="min-h-[48px] px-6 rounded-xl border border-border-light text-text-soft font-semibold cursor-pointer active:opacity-80">
          {t(ui, "transferContinue")}
        </button>
      </div>
    </div>
  );
}
