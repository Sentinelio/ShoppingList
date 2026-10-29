import { t, strings, type Lang } from "../../data/i18n";
import type { AuthError } from "../../hooks/useAuth";

interface SessionErrorProps {
  error: Exclude<AuthError, null>;
  onRetry: () => void;
}

// Opening the invisible session failed and there's no cached one. Shown
// instead of the setup wizard so a retry never creates a second account.
export default function SessionError({ error, onRetry }: SessionErrorProps) {
  // No profile loaded yet: use the browser's language.
  const primary = (navigator.language ?? "en").split("-")[0];
  const ui: Lang = primary in strings ? (primary as Lang) : "en";
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="max-w-sm text-center flex flex-col items-center gap-4">
        <span style={{ fontSize: 48, lineHeight: 1 }} aria-hidden="true">📡</span>
        <p role="alert" className="text-text text-base leading-snug">
          {t(ui, error === "network" ? "errNetwork" : "errSession")}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[48px] px-6 rounded-xl text-white font-semibold cursor-pointer active:opacity-80"
          style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}
        >
          {t(ui, "retry")}
        </button>
      </div>
    </div>
  );
}
