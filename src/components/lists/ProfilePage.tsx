import { useState } from "react";
import { t } from "../../data/i18n";
import { LANGS } from "../../data/langs";
import { getCountries } from "../../data/countries";
import { ALWAYS_ON_PREFS, OPTIONAL_PREFS } from "../../lib/notifications";
import type { User } from "../../lib/pocketbase";
import { IconBack } from "../ui/icons";

type Updates = Partial<Pick<User, "name" | "lang" | "country" | "notification_prefs">>;

// #/settings — my profile: public ID, name, language, country, which
// notifications I get, and sign out. A screen of its own (Back returns).
export default function ProfilePage({ lang, user, onBack, onUpdate, onLogout }: {
  lang: string;
  user: User;
  onBack: () => void;
  onUpdate: (updates: Updates) => void;
  onLogout: () => void;
}) {
  const [name, setName] = useState(user.name ?? "");
  const [copied, setCopied] = useState(false);
  const prefs = user.notification_prefs ?? {};
  const label = "text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block";
  const field = "w-full py-3 px-4 bg-card border border-border-light rounded-xl text-text text-[16px] outline-none focus:border-accent";

  const togglePref = (types: string[], on: boolean) => {
    const next = { ...prefs };
    for (const ty of types) { if (on) delete next[ty]; else next[ty] = false; }
    onUpdate({ notification_prefs: next });
  };

  return (
    <div className="fixed inset-0 bg-bg flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <header className="shrink-0 h-14 flex items-center gap-1 px-1.5">
        <button onClick={onBack} aria-label={t(lang, "back")}
          className="w-11 h-11 flex items-center justify-center rounded-full text-text-soft active:bg-text/5 cursor-pointer">
          <IconBack />
        </button>
        <h1 className="flex-1 min-w-0 truncate text-[20px] font-bold text-text">{t(lang, "settings")}</h1>
      </header>
      <main className="flex-1 overflow-y-auto px-4 pb-8 flex flex-col gap-5">
        {user.tag && (
          <section className="p-3 rounded-xl bg-card flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-text-muted uppercase tracking-widest">{t(lang, "yourId")}</div>
              <div className="text-[22px] font-bold text-text tracking-wider font-mono">{user.tag}</div>
              <div className="text-[12px] text-text-muted">{t(lang, "yourIdHint")}</div>
            </div>
            <button type="button"
              onClick={() => { void navigator.clipboard?.writeText(user.tag ?? "").then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}
              className="shrink-0 h-10 px-3 rounded-xl text-[13px] font-semibold cursor-pointer"
              style={{ background: "var(--color-accent-soft)", color: "var(--color-accent-ink)" }}>
              {copied ? t(lang, "copied") : t(lang, "copy")}
            </button>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <div>
            <label className={label} htmlFor="profile-name">{t(lang, "name")}</label>
            <input id="profile-name" value={name} onChange={e => setName(e.target.value)}
              onBlur={() => { if (name.trim() && name.trim() !== user.name) onUpdate({ name: name.trim() }); }}
              className={field} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              <label className={label} htmlFor="profile-lang">{t(lang, "language")}</label>
              <select id="profile-lang" value={user.lang ?? "en"} onChange={e => onUpdate({ lang: e.target.value })} className={`${field} cursor-pointer`}>
                {LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-0">
              <label className={label} htmlFor="profile-country">{t(lang, "country")}</label>
              <select id="profile-country" value={user.country ?? "PL"} onChange={e => onUpdate({ country: e.target.value })} className={`${field} cursor-pointer`}>
                {getCountries().map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section>
          <h2 className={label}>{t(lang, "notifications")}</h2>
          <p className="text-[13px] text-text-muted mb-2">{t(lang, "notifSettingsHint")}</p>
          <div className="rounded-[14px] bg-card divide-y divide-border overflow-hidden">
            {OPTIONAL_PREFS.map(p => {
              const on = p.types.every(ty => prefs[ty] !== false);
              return (
                <label key={p.key} className="flex items-center gap-3 px-3 min-h-[52px] cursor-pointer">
                  <span className="flex-1 text-[15px] text-text">{t(lang, p.key)}</span>
                  <input type="checkbox" checked={on} onChange={e => togglePref(p.types, e.target.checked)}
                    className="w-5 h-5 cursor-pointer accent-[var(--color-accent)]" />
                </label>
              );
            })}
            {ALWAYS_ON_PREFS.map(k => (
              <div key={k} className="flex items-center gap-3 px-3 min-h-[52px]">
                <span className="flex-1 text-[15px] text-text-soft">{t(lang, k)}</span>
                <span className="text-[12px] text-text-muted">{t(lang, "alwaysOn")}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="p-3 rounded-xl" style={{ background: "color-mix(in srgb, var(--color-danger) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--color-danger) 15%, transparent)" }}>
          <button onClick={onLogout}
            className="w-full py-3 rounded-xl font-semibold text-sm cursor-pointer"
            style={{ background: "color-mix(in srgb, var(--color-danger) 8%, transparent)", color: "var(--color-danger)", border: "1px solid color-mix(in srgb, var(--color-danger) 20%, transparent)" }}>
            🔄 {t(lang, "logout")}
          </button>
        </section>
      </main>
    </div>
  );
}
