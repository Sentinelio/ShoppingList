import { t } from "../../data/i18n";
import { usedAgo } from "../../hooks/useListsOverview";
import { opensList, renderNotification, type AppNotification } from "../../lib/notifications";
import { IconBack } from "../ui/icons";

// #/notifications — the bell's inbox, a screen of its own (Back returns).
// Which types to get is set in Ajustes (#/settings).
export default function NotificationsPage({
  lang, items, onBack, onOpenList, onOpenSettings, onMarkRead, onRemove,
}: {
  lang: string;
  items: AppNotification[];
  onBack: () => void;
  onOpenList: (listId: string) => void;
  onOpenSettings: () => void;
  onMarkRead: (ids: string[]) => void;
  onRemove: (id: string) => void;
}) {
  const unreadIds = items.filter(n => !n.read_at).map(n => n.id);

  return (
    <div className="fixed inset-0 bg-bg flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <header className="shrink-0 h-14 flex items-center gap-1 px-1.5">
        <button onClick={onBack} aria-label={t(lang, "back")}
          className="w-11 h-11 flex items-center justify-center rounded-full text-text-soft active:bg-text/5 cursor-pointer">
          <IconBack />
        </button>
        <h1 className="flex-1 min-w-0 truncate text-[20px] font-bold text-text">{t(lang, "notifications")}</h1>
        <button type="button" onClick={onOpenSettings}
          className="h-10 px-3 rounded-full text-[13px] font-semibold text-text-soft cursor-pointer bg-card">
          ⚙️ {t(lang, "notifSettings")}
        </button>
      </header>
      <main className="flex-1 overflow-y-auto px-3 pb-6">
        <div className="flex mb-2 px-1">
          <button type="button" disabled={!unreadIds.length} onClick={() => onMarkRead(unreadIds)}
            className="h-9 px-3 rounded-full text-[13px] font-semibold cursor-pointer disabled:opacity-40"
            style={{ background: "var(--color-accent-soft)", color: "var(--color-accent-ink)" }}>
            {t(lang, "markAllRead")}
          </button>
        </div>
        {items.length === 0 ? (
          <p className="text-center text-text-soft py-16">{t(lang, "noNotifications")}</p>
        ) : (
          <div className="rounded-[14px] bg-card divide-y divide-border overflow-hidden">
            {items.map(n => {
              const r = renderNotification(lang, n);
              const canOpen = opensList(n);
              return (
                <div key={n.id} className="flex items-start gap-3 px-3 py-3">
                  <span className="text-[22px] leading-none mt-0.5" aria-hidden="true">{r.icon}</span>
                  <button type="button" disabled={!canOpen && !!n.read_at}
                    onClick={() => {
                      if (!n.read_at) onMarkRead([n.id]);
                      if (canOpen) onOpenList(n.list_id);
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
      </main>
    </div>
  );
}
