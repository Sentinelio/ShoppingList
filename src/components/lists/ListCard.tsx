import { useAuth } from "../../hooks/useAuth";
import { t, type Lang } from "../../data/i18n";

interface ListCardMember {
  name: string;
  avatar_color: string;
}

export interface ListCardData {
  id: string;
  name: string;
  code: string;
  memberCount: number;
  itemCount: number;
  members?: ListCardMember[];
}

interface ListCardProps {
  list: ListCardData;
  onClick: () => void;
}

export default function ListCard({ list, onClick }: ListCardProps) {
  const { user } = useAuth();
  const lang = (user?.lang ?? "en") as Lang;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-card rounded-xl p-4 border border-border active:brightness-90 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-text font-semibold text-base truncate flex-1">
          {list.name}
        </h3>
        <span className="font-mono text-xs text-text-muted bg-bg px-2 py-0.5 rounded-md border border-border-light shrink-0">
          {list.code}
        </span>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3 text-sm text-text-soft">
          <span>{list.itemCount} {t(lang, "lists.items")}</span>
          <span className="text-border-light">|</span>
          <span>{list.memberCount} {t(lang, "lists.members")}</span>
        </div>

        {list.members && list.members.length > 0 && (
          <div className="flex -space-x-1.5">
            {list.members.slice(0, 4).map((member, i) => (
              <div
                key={i}
                className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white border-2 border-card"
                style={{ backgroundColor: member.avatar_color }}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {list.members.length > 4 && (
              <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium text-text-muted bg-bg border-2 border-card">
                +{list.members.length - 4}
              </div>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
