import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useLists } from "../hooks/useList";
import { IS_DEMO } from "../lib/supabase";
import { demoGetMembers, demoGetItems } from "../lib/demoStore";
import { t, type Lang } from "../data/i18n";
import ListCard, { type ListCardData } from "../components/lists/ListCard";
import CreateListModal from "../components/lists/CreateListModal";
import JoinListModal from "../components/lists/JoinListModal";
import Button from "../components/ui/Button";

interface ListsPageProps {
  onNavigate: (page: string, params?: any) => void;
}

export default function ListsPage({ onNavigate }: ListsPageProps) {
  const { user } = useAuth();
  const lang = (user?.lang ?? "en") as Lang;
  const { lists, loading, refresh } = useLists(user?.id);

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const handleCreated = (listId: string) => {
    refresh();
    onNavigate("list-detail", { listId });
  };

  const handleJoined = () => {
    refresh();
  };

  const listCards: ListCardData[] = lists.map((l) => {
    if (IS_DEMO) {
      const members = demoGetMembers(l.id);
      const items = demoGetItems(l.id);
      return {
        id: l.id, name: l.name, code: l.code,
        memberCount: members.length, itemCount: items.length, members: [],
      };
    }
    return { id: l.id, name: l.name, code: l.code, memberCount: 0, itemCount: 0, members: [] };
  });

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-safe-top">
        <h1 className="text-2xl font-bold text-text">{t(lang, "lists.title")}</h1>
        <button
          type="button"
          onClick={() => onNavigate("settings")}
          className="h-10 w-10 flex items-center justify-center rounded-xl text-text-soft active:bg-card transition-colors cursor-pointer"
          aria-label={t(lang, "settings.title")}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 px-5 pt-4 pb-28 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-text-muted">{t(lang, "common.loading")}</p>
          </div>
        ) : listCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4 opacity-30">&#128722;</div>
            <p className="text-text-soft font-medium text-lg mb-2">{t(lang, "lists.empty")}</p>
            <p className="text-text-muted text-sm max-w-[260px]">
              {t(lang, "lists.create")} {t(lang, "common.or").toLowerCase()} {t(lang, "lists.join").toLowerCase()}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
            {listCards.map((card) => (
              <ListCard
                key={card.id}
                list={card}
                onClick={() => onNavigate("list-detail", { listId: card.id })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 inset-x-0 z-40">
        <div className="max-w-lg mx-auto px-5 pb-safe-bottom">
          <div className="flex gap-3 pb-4">
            <Button
              variant="primary"
              size="lg"
              className="flex-1 gap-2"
              onClick={() => setShowCreate(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t(lang, "lists.create")}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="flex-1 gap-2"
              onClick={() => setShowJoin(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              {t(lang, "lists.join")}
            </Button>
          </div>
        </div>
      </div>

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
    </div>
  );
}
