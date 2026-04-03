import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { t, type Lang } from "../data/i18n";
import { LANGS } from "../data/langs";
import { COUNTRIES } from "../data/countries";

interface SettingsPageProps {
  onNavigate: (page: string) => void;
}

export default function SettingsPage({ onNavigate }: SettingsPageProps) {
  const { user, updateUser, logout } = useAuth();
  const lang = (user?.lang ?? "en") as Lang;

  const [name, setName] = useState(user?.name ?? "");
  const [selectedLang, setSelectedLang] = useState(user?.lang ?? "en");
  const [selectedCountry, setSelectedCountry] = useState(user?.country ?? "PL");

  useEffect(() => {
    if (user) {
      setName(user.name);
      setSelectedLang(user.lang);
      setSelectedCountry(user.country);
    }
  }, [user]);

  function saveField(patch: Record<string, string>) {
    updateUser(patch);
  }

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col" style={{ maxWidth: 460, margin: "0 auto" }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 shrink-0">
        <button
          onClick={() => onNavigate("lists")}
          className="h-10 w-10 flex items-center justify-center rounded-xl text-text-soft active:bg-card cursor-pointer"
        >
          ←
        </button>
        <h1 className="text-xl font-bold">{t(lang, "settings")}</h1>
      </header>

      <div className="flex-1 px-4 pb-8 space-y-4">
        {/* Profile section */}
        <div className="bg-card rounded-xl p-4 space-y-4 border border-border">
          {/* Name */}
          <div>
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block">
              {t(lang, "name")}
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={() => { if (name.trim() && name.trim() !== user?.name) saveField({ name: name.trim() }); }}
              className="w-full py-3 px-4 bg-bg border border-border-light rounded-xl text-text outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Language + Country row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block">
                {t(lang, "language")}
              </label>
              <div className="relative">
                <select
                  value={selectedLang}
                  onChange={e => { setSelectedLang(e.target.value); saveField({ lang: e.target.value }); }}
                  className="w-full py-3 px-4 bg-bg border border-border-light rounded-xl text-text outline-none focus:border-accent transition-colors appearance-none cursor-pointer text-sm"
                >
                  {LANGS.map(l => (
                    <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                  <svg width={12} height={12} viewBox="0 0 12 12"><path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block">
                {t(lang, "country")}
              </label>
              <div className="relative">
                <select
                  value={selectedCountry}
                  onChange={e => { setSelectedCountry(e.target.value); saveField({ country: e.target.value }); }}
                  className="w-full py-3 px-4 bg-bg border border-border-light rounded-xl text-text outline-none focus:border-accent transition-colors appearance-none cursor-pointer text-sm"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                  <svg width={12} height={12} viewBox="0 0 12 12"><path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Logout / Switch user */}
        <div className="p-3 rounded-xl border border-border" style={{ background: "rgba(255,92,92,0.05)" }}>
          <div className="text-[10px] text-text-muted mb-2">🔄 {t(lang, "logout")}</div>
          <button
            onClick={() => {
              localStorage.clear();
              logout();
              window.location.reload();
            }}
            className="w-full py-3 rounded-xl font-semibold text-sm cursor-pointer transition-colors"
            style={{ background: "rgba(255,92,92,0.08)", color: "#ff5c5c", border: "1px solid rgba(255,92,92,0.2)" }}
          >
            {t(lang, "logout")}
          </button>
        </div>
      </div>
    </div>
  );
}
