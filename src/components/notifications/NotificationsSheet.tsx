import { useState } from "react";
import Sheet from "../ui/Sheet";
import { t } from "../../data/i18n";
import { usedAgo } from "../../hooks/useListsOverview";
import {
  ALWAYS_ON_PREFS, OPTIONAL_PREFS, opensList, renderNotification, type AppNotification,
} from "../../lib/notifications";

// The bell's inbox, plus the notification settings (which types to get).
export default function NotificationsSheet({
  open, onClose, lang, items, prefs, onOpenList, onMarkRead, onRemove, onPrefsChange,
}: {
  open: boolean;
  onClose: () => void;
  lang: string;
  items: AppNotification[];
  prefs: Record<string, boolean>;
  onOpenList: (listId: string) => void;
  onMarkRead: (ids: string[]) => void;
  onRemove: (id: string) => void;
  onPrefsChange: (next: Record<string, boolean>) => void;
}) {
  const [settings, setSettings] = useState(false);
  const unreadIds = items.filter(n => !n.read_at).map(n => n.id);

  const toggle = (types: string[], on: boolean) => {
    const next = { ...prefs };
    for (const ty of types) { if (on) delete next[ty]; else next[ty] = false; }
    onPrefsChange(next);
  };

  return (
    <Sheet open={open} onClose={() => { setSettings(false); onClose(); }}
      title={settings ? t(lang, "notifSettings") : t(lang, "notifications")} closeLabel={t(lang, "close")}>
      {settings ? (
        <div className="pb-3">
          <p className="text-[13px] text-text-muted mb-3">{t(lang, "notifSettingsHint")}</p>
          <div className="rounded-[14px] bg-bg divide-y divide-border overflow-hidden mb-4">
            {OPTIONAL_PREFS.map(p => {
              const on = p.types.every(ty => prefs[ty] !== false);
              return (
                <label key={p.key} className="flex items-center gap-3 px-3 min-h-[52px] cursor-pointer">
                  <span className="flex-1 text-[15px] text-text">{t(lang, p.key)}</span>
                  <input type="checkbox" checked={on} onChange={e => toggle(p.types, e.target.checked)}
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
          <button type="button" onClick={() => setSettings(false)}
            className="w-full h-12 rounded-xl border border-border-light text-text-soft font-semibold cursor-pointer">
            {t(lang, "back")}
          </button>
        </div>
      ) : (
        <div className="pb-3">
          <div className="flex items-center gap-2 mb-2">
            <button type="button" disabled={!unreadIds.length} onClick={() => onMarkRead(unreadIds)}
              className="h-9 px-3 rounded-full text-[13px] font-semibold cursor-pointer disabled:opacity-40"
              style={{ background: "var(--color-accent-soft)", color: "var(--color-accent-ink)" }}>
              {t(lang, "markAllRead")}
            </button>
            <span className="flex-1" />
            <button type="button" onClick={() => setSettings(true)}
              className="h-9 px-3 rounded-full text-[13px] font-semibold text-text-soft cursor-pointer bg-bg">
              ⚙️ {t(lang, "notifSettings")}
            </button>
          </div>
          {items.length === 0 ? (
            <p className="text-center text-text-soft py-12">{t(lang, "noNotifications")}</p>
          ) : (
            <div className="rounded-[14px] bg-bg divide-y divide-border overflow-hidden">
              {items.map(n => {
                const r = renderNotification(lang, n);
                const canOpen = opensList(n);
                return (
                  <div key={n.id} className="flex items-start gap-3 px-3 py-3">
                    <span className="text-[22px] leading-none mt-0.5" aria-hidden="true">{r.icon}</span>
                    <button type="button" disabled={!canOpen && !!n.read_at}
                      onClick={() => {
                        if (!n.read_at) onMarkRead([n.id]);
                        if (canOpen) { onClose(); onOpenList(n.list_id); }
                      }}
                      className="flex-1 min-w-0 text-left cursor-pointer disabled:cursor-default">
                      <span className={`block text-[15px] leading-snug ${n.read_at ? "text-text-soft" : "text-text font-semibold"}`}>{r.title}</span>
                      {r.body && <span className="block text-[13px] text-text-muted mt-0.5 whitespace-pre-line">{r.body}</span>}
                      <span className="block text-[12px] text-text-muted mt-1">{usedAgo(n.updated_at || n.created_at, lang)}</span>
                    </button>
                    {!n.read_at && <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: "var(--color-accent)" }} aria-label={t(lang, "unread")} />}
                    <button type="button" onClick={() => onRemove(n.id)} aria-label={t(lang, "remove")}
                      className="w-8 h-8 -mr-1 shrink-0 rounded-full flex items-center justify-center text-text-muted cursor-pointer active:bg-text/5">✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
