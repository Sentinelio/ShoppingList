import { t } from "../../data/i18n";
import { IconList, IconMembers, IconPlus, IconStore } from "../ui/icons";

export type ListTab = "list" | "store" | "members";

interface BottomNavProps {
  tab: ListTab;
  onTab: (tab: ListTab) => void;
  onAdd: () => void;
  lang: string;
  /** Badge on Members (pending join requests). */
  pendingCount?: number;
}

// 60px bottom bar, icons only (labels in aria-label). The active tab gets a
// soft orange pill; the + on the far right opens the add sheet (3.3).
export default function BottomNav({ tab, onTab, onAdd, lang, pendingCount = 0 }: BottomNavProps) {
  const tabs: Array<{ id: ListTab; label: string; Icon: typeof IconList }> = [
    { id: "list", label: t(lang, "tabList"), Icon: IconList },
    { id: "store", label: t(lang, "tabStore"), Icon: IconStore },
    { id: "members", label: t(lang, "tabMembers"), Icon: IconMembers },
  ];
  return (
    <nav
      className="shrink-0 bg-card border-t border-border-light"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label={t(lang, "tabList")}
    >
      <div className="h-[60px] flex items-center gap-1 px-3">
        {tabs.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTab(id)}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className="relative flex-1 h-11 flex items-center justify-center cursor-pointer"
            >
              <span
                className="w-16 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{
                  background: active ? "var(--color-accent-soft)" : "transparent",
                  color: active ? "var(--color-accent-ink)" : "var(--color-text-soft)",
                }}
              >
                <Icon size={22} />
              </span>
              {id === "members" && pendingCount > 0 && (
                <span className="absolute top-0.5 left-1/2 ml-3 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onAdd}
          aria-label={t(lang, "addProduct")}
          className="shrink-0 w-12 h-12 ml-1 rounded-2xl flex items-center justify-center text-[#0d1017] cursor-pointer active:brightness-90"
          style={{ background: "var(--color-accent)" }}
        >
          <IconPlus size={26} strokeWidth={2.6} />
        </button>
      </div>
    </nav>
  );
}
