import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useLists, deleteList, useMyPendingRequests, cancelJoinRequest } from "../hooks/useList";
import { IS_DEMO } from "../lib/supabase";
import { copyToClipboard } from "../lib/clipboard";
import { demoGetMembers, demoGetItems } from "../lib/demoStore";
import { t } from "../data/i18n";
import type { Lang } from "../data/i18n";
import type { List, ListMember, Item } from "../lib/supabase";
import SwipeRow from "../components/ui/SwipeRow";
import Modal from "../components/ui/Modal";
import CreateListModal from "../components/lists/CreateListModal";
import JoinListModal from "../components/lists/JoinListModal";
import { LANGS } from "../data/langs";
import { COUNTRIES } from "../data/countries";

interface ListsPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

interface ListCardInfo {
  list: List;
  members: ListMember[];
  items: Item[];
  uncheckedCount: number;
  pendingCount: number;
}

export default function ListsPage({ onNavigate }: ListsPageProps) {
  const { user, updateUser, logout } = useAuth();
  const lang = (user?.lang ?? "en") as Lang;
  const { lists, loading, refresh } = useLists(user?.id);
  const { requests: pendingRequests, refresh: refreshPending } = useMyPendingRequests(user?.id);

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editListId, setEditListId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [copied, setCopied] = useState(false);

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
      await deleteList(listId);
      refresh();
    } catch {
      // ignore
    }
  };

  const cardInfos: ListCardInfo[] = lists.map((l) => {
    if (IS_DEMO) {
      const members = demoGetMembers(l.id);
      const items = demoGetItems(l.id);
      return {
        list: l,
        members,
        items,
        uncheckedCount: items.filter((i) => !i.checked).length,
        pendingCount: members.filter((m) => m.status === "pending").length,
      };
    }
    return {
      list: l,
      members: [],
      items: [],
      uncheckedCount: 0,
      pendingCount: 0,
    };
  });

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="px-5 pt-safe-top pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-text-muted text-xs">{t(lang, "welcome")}</p>
            <h1 className="text-2xl font-bold text-text mt-0.5">
              {user?.name ?? ""}
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => setShowJoin(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-accent text-sm font-medium active:brightness-90 transition-colors cursor-pointer"
            >
              <span>🔗</span>
              {t(lang, "join")}
            </button>
            <button
              type="button"
              onClick={() => { setShowSettings(true); setProfileName(user?.name ?? ""); }}
              className="h-9 w-9 flex items-center justify-center rounded-lg text-text-soft active:bg-card transition-colors cursor-pointer"
              aria-label={t(lang, "settings")}
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-5 pt-2 pb-28 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : cardInfos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-[48px] opacity-60 mb-3">📝</div>
            <p className="text-text font-semibold text-lg mb-1">
              {t(lang, "noLists")}
            </p>
            <p className="text-text-muted text-sm max-w-[260px]">
              {t(lang, "tapCreate")}
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {cardInfos.map((info) => (
              <SwipeRow
                key={info.list.id}
                id={info.list.id}
                lang={lang}
                onDelete={() => handleDelete(info.list.id)}
                onEdit={() => setEditListId(info.list.id)}
              >
                <button
                  type="button"
                  onClick={() =>
                    onNavigate("list-detail", { listId: info.list.id })
                  }
                  className="w-full text-left bg-card rounded-xl border border-border p-3.5 active:brightness-95 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: name + date */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-text font-bold text-[16px] truncate">
                        {info.list.name}
                      </h3>
                      <p className="text-text-muted text-[11px] mt-0.5">
                        {new Date(info.list.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Right: badges + avatars + chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      {info.uncheckedCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent/15 text-accent text-[11px] font-bold">
                          {info.uncheckedCount}
                        </span>
                      )}
                      {info.pendingCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500/15 text-red-400 text-[11px] font-bold">
                          {info.pendingCount}
                        </span>
                      )}

                      {/* Member avatars */}
                      {info.members.length > 0 && (
                        <div className="flex items-center">
                          {info.members
                            .filter((m) => m.status === "active")
                            .slice(0, 3)
                            .map((member, i) => (
                              <div
                                key={member.user_id}
                                className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white border-2 border-card"
                                style={{
                                  backgroundColor: "#888",
                                  marginLeft: i === 0 ? 0 : -8,
                                }}
                              >
                                {member.user_id.charAt(0).toUpperCase()}
                              </div>
                            ))}
                        </div>
                      )}

                      <span className="text-text-muted text-lg ml-1">
                        ›
                      </span>
                    </div>
                  </div>
                </button>
              </SwipeRow>
            ))}
          </div>
        )}

        {/* My pending join requests */}
        {pendingRequests.length > 0 && (
          <div className="mt-4">
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 px-1 flex items-center gap-2">
              <span>⏳ {t(lang, "pendingReqs")} ({pendingRequests.length})</span>
            </div>
            {pendingRequests.map(pr => (
              <div key={pr.list_id} className="bg-card rounded-xl border border-border p-3.5 mb-2 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: "rgba(240,136,62,0.1)" }}>
                  ⏳
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{pr.list_name}</div>
                  <div className="text-text-muted text-xs mt-0.5">{t(lang, "waitingOwner")}</div>
                </div>
                <button
                  onClick={async () => { await cancelJoinRequest(pr.list_id, user?.id ?? ""); refreshPending(); }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{ background: "rgba(255,92,92,0.08)", color: "#ff5c5c", border: "1px solid rgba(255,92,92,0.2)" }}
                >
                  ✕ {t(lang, "cancel")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white text-2xl font-bold shadow-lg shadow-orange-500/30 flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label={t(lang, "create")}
      >
        +
      </button>

      {/* Modals */}
      <CreateListModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
      <JoinListModal
        open={showJoin}
        onClose={() => setShowJoin(false)}
        onJoined={handleJoined}
      />

      {/* Edit List Modal (from swipe) */}
      {editListId && (() => {
        const editList = lists.find(l => l.id === editListId);
        if (!editList) return null;
        return (
          <Modal open={true} onClose={() => setEditListId(null)}>
            <h3 className="text-lg font-bold mb-4">⚙️ {editList.name}</h3>
            <div className="rounded-xl p-4 text-center mb-3" style={{ background: "rgba(240,136,62,0.06)", border: "1px solid rgba(240,136,62,0.2)" }}>
              <div className="text-text-muted text-xs mb-1.5">{t(lang, "shareCode")}</div>
              <div className="text-2xl font-extrabold font-mono tracking-widest text-accent">{editList.code}</div>
            </div>
            <button
              onClick={() => {
                copyToClipboard(editList.code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
              }}
              className="w-full py-3 rounded-xl font-semibold cursor-pointer active:brightness-90 text-white"
              style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}
            >
              {copied ? `✓ ${t(lang, "copied")}` : `📋 ${t(lang, "copyCode")}`}
            </button>
            <button
              onClick={() => { handleDelete(editListId); setEditListId(null); }}
              className="w-full mt-3 py-3 rounded-xl font-semibold text-sm cursor-pointer"
              style={{ background: "rgba(255,92,92,0.08)", color: "#ff5c5c", border: "1px solid rgba(255,92,92,0.15)" }}
            >
              🚪 {t(lang, "leave")}
            </button>
            <button onClick={() => setEditListId(null)} className="w-full mt-2 py-3 rounded-xl border border-border-light text-text-soft font-medium cursor-pointer active:bg-card">{t(lang, "close")}</button>
          </Modal>
        );
      })()}

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
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">▾</div>
              </div>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(false)} className="w-full mt-4 py-3 rounded-xl border border-border-light text-text-soft font-medium cursor-pointer active:bg-card">{t(lang, "close")}</button>
        <button onClick={() => { setShowSettings(false); onNavigate("admin"); }} className="w-full mt-2 py-3 rounded-xl border font-medium cursor-pointer active:bg-card" style={{ borderColor: "rgba(108,138,255,0.3)", color: "#6c8aff" }}>🛠️ Admin Panel</button>
        <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(255,92,92,0.05)", border: "1px solid rgba(255,92,92,0.15)" }}>
          <button
            onClick={() => { logout(); }}
            className="w-full py-3 rounded-xl font-semibold text-sm cursor-pointer"
            style={{ background: "rgba(255,92,92,0.08)", color: "#ff5c5c", border: "1px solid rgba(255,92,92,0.2)" }}
          >
            🔄 {t(lang, "logout")}
          </button>
        </div>
      </Modal>

    </div>
  );
}
