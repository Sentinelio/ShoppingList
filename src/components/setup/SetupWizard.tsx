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

  useEffect(() => {
    const detected = detectBrowserLang();
    setLang(detected);
  }, []);

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

  const selectedCountry = COUNTRIES.find(c => c.code === country);
  const selectedLang = LANGS.find(l => l.code === lang);

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
              {"\uD83D\uDED2\uD83C\uDF0D"} BabelCart
            </h1>
            <p className="text-lg text-text-soft">
              {t(i18nLang, "app.tagline")}
            </p>
            <button
              onClick={() => setStep(1)}
              className="w-full py-4 rounded-xl bg-accent text-bg font-semibold text-lg transition-opacity active:opacity-80 cursor-pointer"
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
            <div className="mt-auto flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="py-4 px-6 rounded-xl bg-card text-text-soft font-medium text-lg transition-opacity active:opacity-80 cursor-pointer border border-border-light"
              >
                &larr;
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!name.trim()}
                className="flex-1 py-4 rounded-xl bg-accent text-bg font-semibold text-lg transition-opacity active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {t(i18nLang, "common.confirm")}
              </button>
            </div>
          </div>
        )}

        {/* Step 2 - Country (dropdown) */}
        {step === 2 && (
          <div className="flex-1 flex flex-col gap-5">
            <h2 className="text-2xl font-bold text-text text-center">
              {t(i18nLang, "setup.countryLabel")}
            </h2>
            <p className="text-sm text-text-soft text-center px-2">
              {t(i18nLang, "setup.countryDesc")}
            </p>

            <div className="relative">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full py-4 px-5 text-lg text-text bg-card rounded-xl border border-border-light outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
              >
                <option value="" disabled>
                  {t(i18nLang, "setup.countryLabel")}...
                </option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            {selectedCountry && (
              <div className="bg-card rounded-xl p-4 border border-border-light text-center">
                <span className="text-4xl">{selectedCountry.flag}</span>
                <p className="text-text font-medium mt-2">{selectedCountry.name}</p>
                <p className="text-text-muted text-xs mt-1">
                  {t(i18nLang, "store.show")}: {selectedCountry.lang.toUpperCase()}
                </p>
              </div>
            )}

            <div className="mt-auto flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="py-4 px-6 rounded-xl bg-card text-text-soft font-medium text-lg transition-opacity active:opacity-80 cursor-pointer border border-border-light"
              >
                &larr;
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!country}
                className="flex-1 py-4 rounded-xl bg-accent text-bg font-semibold text-lg transition-opacity active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {t(i18nLang, "common.confirm")}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 - Language (dropdown) */}
        {step === 3 && (
          <div className="flex-1 flex flex-col gap-5">
            <h2 className="text-2xl font-bold text-text text-center">
              {t(i18nLang, "setup.langLabel")}
            </h2>
            <p className="text-sm text-text-soft text-center px-2">
              {t(i18nLang, "setup.langDesc")}
            </p>

            <div className="relative">
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="w-full py-4 px-5 text-lg text-text bg-card rounded-xl border border-border-light outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
              >
                <option value="" disabled>
                  {t(i18nLang, "setup.langLabel")}...
                </option>
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            {selectedLang && (
              <div className="bg-card rounded-xl p-4 border border-border-light text-center">
                <span className="text-4xl">{selectedLang.flag}</span>
                <p className="text-text font-medium mt-2">{selectedLang.name}</p>
              </div>
            )}

            <div className="mt-auto flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="py-4 px-6 rounded-xl bg-card text-text-soft font-medium text-lg transition-opacity active:opacity-80 cursor-pointer border border-border-light"
              >
                &larr;
              </button>
              <button
                onClick={handleFinish}
                disabled={!lang || submitting}
                className="flex-1 py-4 rounded-xl bg-accent text-bg font-semibold text-lg transition-opacity active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting
                  ? t(i18nLang, "common.loading")
                  : t(i18nLang, "setup.finish")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
