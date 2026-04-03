import { useState, useMemo, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { t, type Lang } from "../data/i18n";
import { LANGS } from "../data/langs";
import { COUNTRIES } from "../data/countries";
import Button from "../components/ui/Button";

const avatarColors = [
  "#f0883e",
  "#3dd68c",
  "#6c8aff",
  "#c76dff",
  "#34d6c0",
  "#ff5c5c",
  "#ffb03d",
];

interface SettingsPageProps {
  onNavigate: (page: string) => void;
}

export default function SettingsPage({ onNavigate }: SettingsPageProps) {
  const { user, updateUser } = useAuth();

  const lang = (user?.lang ?? "en") as Lang;

  const [name, setName] = useState(user?.name ?? "");
  const [selectedLang, setSelectedLang] = useState(user?.lang ?? "en");
  const [selectedCountry, setSelectedCountry] = useState(user?.country ?? "");
  const [selectedColor, setSelectedColor] = useState(user?.avatar_color ?? avatarColors[0]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);

  // Sync local state when user data loads/changes externally
  useEffect(() => {
    if (user) {
      setName(user.name);
      setSelectedLang(user.lang);
      setSelectedCountry(user.country);
      setSelectedColor(user.avatar_color);
    }
  }, [user]);

  const hasChanges = useMemo(() => {
    if (!user) return false;
    return (
      name.trim() !== user.name ||
      selectedLang !== user.lang ||
      selectedCountry !== user.country ||
      selectedColor !== user.avatar_color
    );
  }, [user, name, selectedLang, selectedCountry, selectedColor]);

  async function handleSave() {
    if (!hasChanges || !name.trim()) return;
    setSaving(true);
    try {
      await updateUser({
        name: name.trim(),
        lang: selectedLang,
        country: selectedCountry,
        avatar_color: selectedColor,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const currentLang = LANGS.find((l) => l.code === selectedLang);
  const currentCountry = COUNTRIES.find((c) => c.code === selectedCountry);

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => onNavigate("lists")}
          className="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-text-soft active:bg-card"
          aria-label="Back"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold">{t(lang, "settings.title")}</h1>
      </header>

      {/* Profile Card */}
      <div className="px-4 pb-6">
        <div className="bg-card rounded-xl p-4 flex flex-col gap-5">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-name" className="text-sm text-text-soft">
              {t(lang, "settings.name")}
            </label>
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-h-11 rounded-lg bg-bg border border-border-light px-3 text-text text-base outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Language Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-soft">
              {t(lang, "settings.lang")}
            </label>
            <button
              type="button"
              onClick={() => {
                setLangOpen(!langOpen);
                setCountryOpen(false);
              }}
              className="min-h-11 rounded-lg bg-bg border border-border-light px-3 text-left text-text text-base flex items-center justify-between active:brightness-90 transition-colors"
            >
              <span>
                {currentLang ? `${currentLang.flag} ${currentLang.name}` : selectedLang}
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`text-text-soft transition-transform ${langOpen ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {langOpen && (
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => {
                      setSelectedLang(l.code);
                      setLangOpen(false);
                    }}
                    className={`min-h-11 rounded-lg px-3 text-left text-sm flex items-center gap-2 transition-colors ${
                      selectedLang === l.code
                        ? "bg-accent text-white"
                        : "bg-bg border border-border-light text-text active:brightness-90"
                    }`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Country Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-soft">
              {t(lang, "settings.country")}
            </label>
            <button
              type="button"
              onClick={() => {
                setCountryOpen(!countryOpen);
                setLangOpen(false);
              }}
              className="min-h-11 rounded-lg bg-bg border border-border-light px-3 text-left text-text text-base flex items-center justify-between active:brightness-90 transition-colors"
            >
              <span>
                {currentCountry
                  ? `${currentCountry.flag} ${currentCountry.name}`
                  : selectedCountry}
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`text-text-soft transition-transform ${countryOpen ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {countryOpen && (
              <div className="grid grid-cols-2 gap-1.5 mt-1 max-h-64 overflow-y-auto">
                {COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setSelectedCountry(c.code);
                      setCountryOpen(false);
                    }}
                    className={`min-h-11 rounded-lg px-3 text-left text-sm flex items-center gap-2 transition-colors ${
                      selectedCountry === c.code
                        ? "bg-accent text-white"
                        : "bg-bg border border-border-light text-text active:brightness-90"
                    }`}
                  >
                    <span>{c.flag}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Avatar Color Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-soft">Avatar color</label>
            <div className="flex items-center gap-3 flex-wrap">
              {avatarColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className="min-h-11 min-w-11 rounded-full flex items-center justify-center transition-transform"
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                >
                  {selectedColor === color && (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Save Button + Feedback */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button
            variant="primary"
            size="lg"
            disabled={!hasChanges || !name.trim() || saving}
            onClick={handleSave}
            className="w-full"
          >
            {saving ? t(lang, "common.loading") : t(lang, "settings.save")}
          </Button>
          {saved && (
            <span className="text-accent text-sm font-medium animate-pulse">
              {t(lang, "settings.saved")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
