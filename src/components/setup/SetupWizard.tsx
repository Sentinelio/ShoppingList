import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import { t, type Lang, strings } from "../../data/i18n";
import { LANGS } from "../../data/langs";
import { COUNTRIES } from "../../data/countries";

interface SetupWizardProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 4;

function detectBrowserLang(): Lang {
  const browserLang = navigator.language?.split("-")[0] ?? "en";
  if (browserLang in strings) return browserLang as Lang;
  return "en";
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const { createUser } = useAuth();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [lang, setLang] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Detect browser language on mount
  useEffect(() => {
    const detected = detectBrowserLang();
    setLang(detected);
  }, []);

  // The i18n language follows the user's current selection (or browser default)
  const i18nLang: Lang = useMemo(() => {
    if (lang && lang in strings) return lang as Lang;
    return detectBrowserLang();
  }, [lang]);

  const handleFinish = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await createUser(name.trim(), lang, country);
      onComplete();
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center px-4 py-8">
      {/* Dot stepper */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === step ? "bg-accent" : "bg-border-light"
            }`}
          />
        ))}
      </div>

      <div className="w-full max-w-md mx-auto flex-1 flex flex-col">
        {/* Step 0 - Welcome */}
        {step === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
            <h1 className="text-4xl font-bold text-text">
              {"\uD83C\uDF0D\uD83D\uDED2"} Polyglot Cart
            </h1>
            <p className="text-lg text-text-soft">
              {t(i18nLang, "app.tagline")}
            </p>
            <button
              onClick={() => setStep(1)}
              className="w-full py-4 rounded-xl bg-accent text-bg font-semibold text-lg transition-opacity hover:opacity-90 active:opacity-80"
            >
              {t(i18nLang, "setup.welcome")}
            </button>
          </div>
        )}

        {/* Step 1 - Name */}
        {step === 1 && (
          <div className="flex-1 flex flex-col gap-6">
            <h2 className="text-2xl font-bold text-text text-center">
              {t(i18nLang, "setup.step1Title")}
            </h2>
            <p className="text-text-soft text-center">
              {t(i18nLang, "setup.nameLabel")}
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(i18nLang, "setup.namePlaceholder")}
              autoFocus
              className="w-full py-4 px-5 text-lg text-text bg-card rounded-xl border border-border-light outline-none focus:border-accent transition-colors placeholder:text-text-muted text-center"
            />
            <div className="mt-auto">
              <button
                onClick={() => setStep(2)}
                disabled={!name.trim()}
                className="w-full py-4 rounded-xl bg-accent text-bg font-semibold text-lg transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t(i18nLang, "common.confirm")}
              </button>
            </div>
          </div>
        )}

        {/* Step 2 - Country */}
        {step === 2 && (
          <div className="flex-1 flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-text text-center">
              {t(i18nLang, "setup.step2Title")}
            </h2>
            <p className="text-sm text-text-soft text-center">
              {t(i18nLang, "setup.countryDesc")}
            </p>
            <div className="flex-1 overflow-y-auto -mx-1 px-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => setCountry(c.code)}
                    className={`flex items-center gap-2 p-3 rounded-xl bg-card border transition-colors text-left ${
                      country === c.code
                        ? "border-accent"
                        : "border-border-light hover:border-border-light/50"
                    }`}
                  >
                    <span className="text-xl">{c.flag}</span>
                    <span className="text-sm text-text truncate">
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setStep(3)}
              disabled={!country}
              className="w-full py-4 rounded-xl bg-accent text-bg font-semibold text-lg transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {t(i18nLang, "common.confirm")}
            </button>
          </div>
        )}

        {/* Step 3 - Language */}
        {step === 3 && (
          <div className="flex-1 flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-text text-center">
              {t(i18nLang, "setup.step3Title")}
            </h2>
            <p className="text-sm text-text-soft text-center">
              {t(i18nLang, "setup.langDesc")}
            </p>
            <div className="flex-1 overflow-y-auto -mx-1 px-1">
              <div className="grid grid-cols-2 gap-3">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={`flex items-center gap-2 p-3 rounded-xl bg-card border transition-colors text-left ${
                      lang === l.code
                        ? "border-accent"
                        : "border-border-light hover:border-border-light/50"
                    }`}
                  >
                    <span className="text-xl">{l.flag}</span>
                    <span className="text-sm text-text">{l.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleFinish}
              disabled={!lang || submitting}
              className="w-full py-4 rounded-xl bg-accent text-bg font-semibold text-lg transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {submitting
                ? t(i18nLang, "common.loading")
                : t(i18nLang, "setup.finish")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
