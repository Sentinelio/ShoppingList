import { useState, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import { t, type Lang, strings } from "../../data/i18n";
import { LANGS } from "../../data/langs";
import { COUNTRIES } from "../../data/countries";
import { isNetworkError } from "../../lib/netError";

interface SetupWizardProps {
  onComplete: () => void;
}

// Browser locale ("es-ES") → defaults for the form
function detectDefaults(): { lang: string; country: string } {
  const locale = navigator.language ?? "en";
  const [primary, region] = locale.split("-");
  const lang = LANGS.some((l) => l.code === primary) ? primary : "en";
  const country =
    region && COUNTRIES.some((c) => c.code === region.toUpperCase()) ? region.toUpperCase() : "";
  return { lang, country };
}

const inputClass =
  "w-full py-4 px-5 text-lg text-text bg-card rounded-xl border border-border-light outline-none focus:border-accent transition-colors placeholder:text-text-muted";

function Chevron() {
  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const { createUser } = useAuth();
  const [defaults] = useState(detectDefaults);

  const [name, setName] = useState("");
  const [lang, setLang] = useState(defaults.lang);
  const [country, setCountry] = useState(defaults.country);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<"network" | "other" | null>(null);

  // The form switches language live as soon as the user picks theirs
  const ui: Lang = useMemo(() => {
    if (lang && lang in strings) return lang as Lang;
    return "en";
  }, [lang]);

  const canSubmit = !!name.trim() && !!lang && !!country && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await createUser(name.trim(), lang, country);
      onComplete();
    } catch (err) {
      console.error("[setup] could not create the profile", err);
      setError(isNetworkError(err) ? "network" : "other");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center px-4 py-10">
      <form
        className="w-full max-w-md mx-auto flex-1 flex flex-col gap-7"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="flex flex-col items-center text-center gap-3 pt-2">
          <span style={{ fontSize: "56px", lineHeight: 1 }}>🌍🛒</span>
          <h1 className="text-4xl font-bold text-text">BabelCart</h1>
          <p className="text-lg text-text-soft">{t(ui, "setupWelcomeText")}</p>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="setup-name" className="text-sm font-semibold text-text-soft px-1">
              {t(ui, "yourName")}
            </label>
            <input
              id="setup-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              autoComplete="given-name"
              maxLength={60}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="setup-lang" className="text-sm font-semibold text-text-soft px-1">
              {t(ui, "iSpeak")}
            </label>
            <div className="relative">
              <select
                id="setup-lang"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className={`${inputClass} appearance-none cursor-pointer`}
              >
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name}
                  </option>
                ))}
              </select>
              <Chevron />
            </div>
            <p className="text-xs text-text-muted px-1">{t(ui, "setupLangHint")}</p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="setup-country" className="text-sm font-semibold text-text-soft px-1">
              {t(ui, "iLive")}
            </label>
            <div className="relative">
              <select
                id="setup-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={`${inputClass} appearance-none cursor-pointer`}
              >
                <option value="" disabled>
                  {t(ui, "setupCountryTitle")}
                </option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
              <Chevron />
            </div>
            <p className="text-xs text-text-muted px-1">{t(ui, "setupCountryHint")}</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-auto w-full py-4 rounded-xl text-white font-semibold text-lg transition-opacity active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}
        >
          {submitting ? "..." : error ? t(ui, "retry") : t(ui, "getStarted")}
        </button>
        {error && (
          <p role="alert" className="-mt-4 text-sm leading-snug px-1" style={{ color: "#ff9d9d" }}>
            {t(ui, error === "network" ? "errNetwork" : "errCreateProfile")}
          </p>
        )}
      </form>
    </div>
  );
}
