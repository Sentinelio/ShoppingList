import { useState, useEffect } from "react";
import { useThemeView } from "../lib/themeStore";
import { useAuth } from "../hooks/useAuth";
import { useLists, exitList, useMyPendingRequests, cancelJoinRequest, archiveList } from "../hooks/useList";
import { useListsOverview, usedAgo, type ListOverview } from "../hooks/useListsOverview";
import { t } from "../data/i18n";
import type { Lang } from "../data/i18n";
import { CHANGELOG } from "../data/changelog";
import Modal from "../components/ui/Modal";
import Avatar from "../components/ui/Avatar";
import CreateListModal from "../components/lists/CreateListModal";
import JoinListModal from "../components/lists/JoinListModal";
import IosInstallHint from "../components/ui/IosInstallHint";
import { readJoinHash } from "../lib/joinLink";
import { LANGS } from "../data/langs";
import { getCountries, getCountryFlag } from "../data/countries";
import { IconBack, IconChevronRight, IconPlus } from "../components/ui/icons";

interface ListsPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export default function ListsPage({ onNavigate }: ListsPageProps) {
  const { user, updateUser, logout } = useAuth();
  const lang = (user?.lang ?? "en") as Lang;
  useThemeView("lists");
  const { lists, loading, refresh } = useLists(user?.id);
  const { requests: pendingRequests, refresh: refreshPending } = useMyPendingRequests(user?.id);

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  // Invite links (#join=CODE, from the share QR) open the join dialog.
  const [joinCode] = useState(() => readJoinHash());
  useEffect(() => {
    if (!joinCode) return;
    setShowJoin(true);
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }, [joinCode]);
  const [showSettings, setShowSettings] = useState(false);
  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [showArchived, setShowArchived] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const { overview, reload, setOverview } = useListsOverview(lists, user?.id);

  const handleCreated = (listId: string) => {
    refresh();
    onNavigate("list-detail", { listId });
  };

  const handleJoined = () => {
    refresh();
    refreshPending();
  };

  const handleDelete = async (listId: string) => {
    try {
      if (user) await exitList(listId, user.id);
      refresh();
    } catch {
      // ignore
    }
  };

  const active = overview.filter(o => !o.archived);
  const archived = overview.filter(o => o.archived);

  // Archive is personal: optimistic toggle, then the server.
  const setArchived = async (listId: string, value: boolean) => {
    setOverview(prev => prev.map(o => (o.list.id === listId ? { ...o, archived: value } : o)));
    try { await archiveList(listId, value); } catch (err) { console.error("[archiveList]", err); }
    reload();
  };

  // "Borrar" from the archive: owners delete the list for everyone, others
  // leave it. Two taps.
  const removeArchived = (listId: string) => {
    if (confirmRemove !== listId) {
      setConfirmRemove(listId);
      setTimeout(() => setConfirmRemove(prev => (prev === listId ? null : prev)), 3000);
      return;
    }
    setConfirmRemove(null);
    void handleDelete(listId);
  };

  const toBuyLabel = (o: ListOverview) =>
    o.toBuy ? t(lang, "toBuyCount").replace("{n}", String(o.toBuy))
      : o.total ? t(lang, "nothingToBuy")
      : t(lang, "noItems");

  const flagTile = (o: ListOverview) => (
    <span className="shrink-0 w-12 h-12 rounded-[14px] bg-bg flex items-center justify-center text-[26px] leading-none" aria-hidden="true">
      {getCountryFlag(o.list.country || user?.country || "") || "🛒"}
    </span>
  );

  const membersStack = (o: ListOverview) => (
    <span className="flex -space-x-2 shrink-0">
      {o.members.slice(0, 3).map(m => (
        <span key={m.user_id} className="rounded-full ring-2 ring-card">
          <Avatar name={m.name || "?"} index={colorIndex(m.user_id)} size={24} />
        </span>
      ))}
      {o.members.length > 3 && (
        <span className="w-6 h-6 rounded-full ring-2 ring-card bg-bg text-[10px] font-bold text-text-soft flex items-center justify-center">
          +{o.members.length - 3}
        </span>
      )}
    </span>
  );

  // Stable per person, so the same member has the same colour everywhere.
  const colorIndex = (id: string) => {
    let h = 2166136261; // FNV-1a
    for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    return h;
  };

  const section = "text-[13px] font-bold uppercase tracking-wide px-1 mb-2 mt-5";
  const userAvatar = (
    <span className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
      style={{ background: user?.avatar_color || "var(--color-accent)" }}>
      {(user?.name || "?")[0].toUpperCase()}
    </span>
  );

  // ── 2.5 Archived lists ────────────────────────────────────────────────
  if (showArchived) {
    return (
      <div className="fixed inset-0 bg-bg flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <header className="shrink-0 h-14 flex items-center gap-1 px-1.5">
          <button onClick={() => setShowArchived(false)} aria-label={t(lang, "back")}
            className="w-11 h-11 flex items-center justify-center rounded-full text-text-soft active:bg-text/5 cursor-pointer">
            <IconBack />
          </button>
          <h1 className="flex-1 min-w-0 truncate text-[20px] font-bold text-text">{t(lang, "archivedTitle")}</h1>
        </header>
        <main className="flex-1 overflow-y-auto px-3 pb-6">
          <p className="text-[13px] text-text-muted px-1 mb-3">{t(lang, "archivedHint")}</p>
          {archived.length === 0 ? (
            <p className="text-center text-text-soft py-16">{t(lang, "noArchived")}</p>
          ) : (
            <div className="rounded-[14px] bg-card divide-y divide-border overflow-hidden">
              {archived.map(o => {
                const owner = !!user && !!o.list.owners?.includes(user.id);
                const confirming = confirmRemove === o.list.id;
                return (
                  <div key={o.list.id} className="px-3 py-3">
                    <div className="flex items-center gap-3">
                    {flagTile(o)}
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-[15px] font-semibold text-text">{o.list.name}</span>
                      <span className="block truncate text-[12px] text-text-muted">{toBuyLabel(o)}</span>
                    </span>
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                    <button type="button" onClick={() => setArchived(o.list.id, false)}
                      className="h-10 px-3 rounded-xl text-[13px] font-bold cursor-pointer shrink-0"
                      style={{ background: "var(--color-accent-soft)", color: "var(--color-accent-ink)" }}>
                      {t(lang, "restore")}
                    </button>
                    <button type="button" onClick={() => removeArchived(o.list.id)}
                      className="h-10 px-3 rounded-xl text-[13px] font-semibold cursor-pointer shrink-0"
                      style={confirming ? { background: "var(--color-danger-strong)", color: "#fff" } : { background: "var(--color-danger-soft)", color: "var(--color-danger-ink)" }}>
                      {confirming ? t(lang, "confirm") : owner ? t(lang, "deleteArchived") : t(lang, "leaveList")}
                    </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-bg flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* 2.1 top bar: title, Join, my avatar (opens my settings) */}
      <header className="shrink-0 h-14 flex items-center gap-2 pl-4 pr-2">
        <h1 className="flex-1 min-w-0 truncate text-[22px] font-bold text-text">{t(lang, "myLists")}</h1>
        <button type="button" onClick={() => setShowJoin(true)}
          className="h-10 px-4 rounded-full text-[14px] font-semibold cursor-pointer active:brightness-90"
          style={{ background: "var(--color-accent-soft)", color: "var(--color-accent-ink)" }}>
          {t(lang, "join")}
        </button>
        <button type="button" aria-label={t(lang, "settings")}
          onClick={() => { setShowSettings(true); setProfileName(user?.name ?? ""); }}
          className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer">
          {userAvatar}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-3 pb-28">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : active.length === 0 && archived.length === 0 && pendingRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-[48px] opacity-60 mb-3">📝</div>
            <p className="text-text font-semibold text-lg mb-1">{t(lang, "noLists")}</p>
            <p className="text-text-muted text-sm max-w-[260px]">{t(lang, "createFirstList")}</p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div className="rounded-[14px] bg-card divide-y divide-border overflow-hidden mt-1">
                {active.map(o => (
                  <button key={o.list.id} type="button" onClick={() => onNavigate("list-detail", { listId: o.list.id })}
                    className="w-full flex items-center gap-3 px-3 min-h-[72px] py-2 text-left cursor-pointer active:bg-text/5">
                    {flagTile(o)}
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-[16px] font-semibold text-text">{o.list.name}</span>
                      <span className="block truncate text-[13px] mt-0.5">
                        <span style={{ color: o.toBuy ? "var(--color-accent-ink)" : "var(--color-text-soft)" }}>
                          {toBuyLabel(o)}
                        </span>
                        <span className="text-text-muted"> · {o.lastUsed ? usedAgo(o.lastUsed, lang) : t(lang, "neverUsed")}</span>
                      </span>
                    </span>
                    {membersStack(o)}
                  </button>
                ))}
              </div>
            )}

            {pendingRequests.length > 0 && (
              <>
                <h2 className={section} style={{ color: "var(--color-accent)" }}>{t(lang, "requestsSent")}</h2>
                <div className="rounded-[14px] bg-card divide-y divide-border overflow-hidden">
                  {pendingRequests.map(pr => (
                    <div key={pr.list_id} className="flex items-center gap-3 px-3 min-h-[60px] py-2">
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-[15px] font-semibold text-text">{pr.list_name}</span>
                        <span className="block text-[12px]" style={{ color: pr.status === "rejected" ? "var(--color-danger-ink)" : "var(--color-text-muted)" }}>
                          {pr.status === "rejected" ? t(lang, "statusRejected") : t(lang, "statusPending")}
                        </span>
                      </span>
                      <button type="button"
                        onClick={async () => { await cancelJoinRequest(pr.list_id, user?.id ?? ""); refreshPending(); }}
                        className="h-10 px-3 rounded-xl text-[13px] font-semibold cursor-pointer shrink-0"
                        style={{ background: "var(--color-danger-soft)", color: "var(--color-danger-ink)" }}>
                        {t(lang, "cancel")}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="rounded-[14px] bg-card overflow-hidden mt-5">
              <button type="button" onClick={() => setShowArchived(true)}
                className="w-full min-h-[52px] flex items-center gap-3 px-4 text-left cursor-pointer active:bg-text/5">
                <span className="text-lg" aria-hidden="true">🗄️</span>
                <span className="flex-1 text-[15px] text-text">{t(lang, "archivedLists")}</span>
                <span className="text-[14px] text-text-muted tabular-nums">{archived.length}</span>
                <IconChevronRight size={18} className="text-text-muted" />
              </button>
            </div>
          </>
        )}
      </main>

      {/* Version badge (bottom-left) */}
      <div
        className="fixed bottom-6 left-6 z-40 text-text-muted"
        style={{
          marginBottom: "env(safe-area-inset-bottom, 0px)",
          fontSize: 10,
          fontFamily: "JetBrains Mono, ui-monospace, monospace",
          opacity: 0.5,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {CHANGELOG[0]?.version ?? "v?"}
      </div>

      {/* Safari on iPhone, not installed: once, how to add it to the Home Screen */}
      <IosInstallHint lang={lang} />

      {/* FAB: new list */}
      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="fixed bottom-6 right-5 z-40 h-14 w-14 rounded-2xl flex items-center justify-center text-on-accent shadow-lg cursor-pointer active:brightness-90"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)", background: "var(--color-accent)" }}
        aria-label={t(lang, "newList")}
      >
        <IconPlus size={28} strokeWidth={2.6} />
      </button>

      {/* Modals */}
      <CreateListModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
      <JoinListModal
        initialCode={joinCode ?? undefined}
        open={showJoin}
        onClose={() => setShowJoin(false)}
        onJoined={handleJoined}
      />

      {/* Settings Modal */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)}>
        <h3 className="text-lg font-bold mb-4">⚙️ {t(lang, "settings")}</h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block">{t(lang, "name")}</label>
            <input
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              onBlur={() => { if (profileName.trim() && profileName.trim() !== user?.name) updateUser({ name: profileName.trim() }); }}
              className="w-full py-3 px-4 bg-bg border border-border-light rounded-xl text-text outline-none focus:border-accent"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block">{t(lang, "language")}</label>
              <div className="relative">
                <select
                  value={user?.lang ?? "en"}
                  onChange={e => updateUser({ lang: e.target.value })}
                  className="w-full py-3 px-4 bg-bg border border-border-light rounded-xl text-text outline-none focus:border-accent appearance-none cursor-pointer text-sm"
                >
                  {LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">▾</div>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block">{t(lang, "country")}</label>
              <div className="relative">
                <select
                  value={user?.country ?? "PL"}
                  onChange={e => updateUser({ country: e.target.value })}
                  className="w-full py-3 px-4 bg-bg border border-border-light rounded-xl text-text outline-none focus:border-accent appearance-none cursor-pointer text-sm"
                >
                  {getCountries().map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">▾</div>
              </div>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(false)} className="w-full mt-4 py-3 rounded-xl border border-border-light text-text-soft font-medium cursor-pointer active:bg-card">{t(lang, "close")}</button>
        <button onClick={() => { setShowSettings(false); onNavigate("admin"); }} className="w-full mt-2 py-3 rounded-xl border font-medium cursor-pointer active:bg-card" style={{ borderColor: "color-mix(in srgb, var(--color-info) 30%, transparent)", color: "var(--color-info)" }}>🛠️ Admin Panel</button>
        <div className="mt-4 p-3 rounded-xl" style={{ background: "color-mix(in srgb, var(--color-danger) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--color-danger) 15%, transparent)" }}>
          <button
            onClick={() => { logout(); }}
            className="w-full py-3 rounded-xl font-semibold text-sm cursor-pointer"
            style={{ background: "color-mix(in srgb, var(--color-danger) 8%, transparent)", color: "var(--color-danger)", border: "1px solid color-mix(in srgb, var(--color-danger) 20%, transparent)" }}
          >
            🔄 {t(lang, "logout")}
          </button>
        </div>
      </Modal>

    </div>
  );
}
