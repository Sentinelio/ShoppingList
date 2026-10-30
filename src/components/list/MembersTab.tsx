import { useState } from "react";
import type { List, ListMember } from "../../lib/pocketbase";
import { t } from "../../data/i18n";
import Avatar from "../ui/Avatar";

interface MembersTabProps {
  list: List | null;
  members: ListMember[];
  userId: string;
  lang: string;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
  onRemove: (userId: string) => void;
}

// 3.4 — "Quieren unirse" (approve / reject) and "En la lista" (avatar,
// name, role). The invite code lives only in the share sheet (3.8).
export default function MembersTab({ list, members, userId, lang, onApprove, onReject, onRemove }: MembersTabProps) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const active = members.filter(m => m.status === "active");
  const pending = members.filter(m => m.status === "pending");
  const iOwn = !!list?.owners?.includes(userId);
  const canApprove = iOwn || list?.who_can_approve === "any_member";
  const canRemove = iOwn || list?.who_can_remove === "any_member";

  // Two taps for destructive actions; the second within 3 s.
  const confirmThen = (key: string, action: () => void) => {
    if (confirming === key) {
      setConfirming(null);
      action();
    } else {
      setConfirming(key);
      setTimeout(() => setConfirming(prev => (prev === key ? null : prev)), 3000);
    }
  };

  const section = "text-[13px] font-bold uppercase tracking-wide px-1 mb-2 mt-1";
  const name = (m: ListMember) => m.user_name || m.user_id.slice(0, 6);

  return (
    <div className="flex-1 overflow-y-auto px-3 pb-4">
      {pending.length > 0 && (
        <>
          <h2 className={section} style={{ color: "var(--color-accent)" }}>{t(lang, "wantToJoin")} · {pending.length}</h2>
          <div className="rounded-[14px] bg-card divide-y divide-border overflow-hidden mb-5">
            {pending.map((m, i) => (
              <div key={m.user_id} className="flex items-center gap-3 px-3 min-h-[60px]">
                <Avatar name={name(m)} index={active.length + i} size={36} />
                <span className="flex-1 min-w-0 truncate text-[15px] font-semibold text-text">{name(m)}</span>
                {canApprove && (
                  <>
                    <button type="button" onClick={() => confirmThen(`reject:${m.user_id}`, () => onReject(m.user_id))}
                      className="h-10 px-3 rounded-xl text-[13px] font-semibold cursor-pointer"
                      style={confirming === `reject:${m.user_id}`
                        ? { background: "var(--color-danger-strong)", color: "#fff" }
                        : { background: "var(--color-danger-soft)", color: "var(--color-danger-ink)" }}>
                      {confirming === `reject:${m.user_id}` ? t(lang, "confirm") : t(lang, "reject")}
                    </button>
                    <button type="button" onClick={() => onApprove(m.user_id)}
                      className="h-10 px-3 rounded-xl text-[13px] font-bold cursor-pointer"
                      style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}>
                      {t(lang, "approve")}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className={section} style={{ color: "var(--color-accent)" }}>{t(lang, "inTheList")} · {active.length}</h2>
      <div className="rounded-[14px] bg-card divide-y divide-border overflow-hidden">
        {active.map((m, i) => {
          const isMe = m.user_id === userId;
          const isOwner = m.role === "owner" || !!list?.owners?.includes(m.user_id);
          const key = `remove:${m.user_id}`;
          return (
            <div key={m.user_id} className="flex items-center gap-3 px-3 min-h-[60px]">
              <Avatar name={name(m)} index={i} size={36} />
              <span className="flex-1 min-w-0 truncate text-[15px] font-semibold text-text">
                {name(m)}{isMe && <span className="text-text-muted font-normal"> ({t(lang, "you")})</span>}
              </span>
              <span className="text-[13px] font-semibold shrink-0" style={{ color: isOwner ? "var(--color-accent-ink)" : "var(--color-text-soft)" }}>
                {isOwner ? t(lang, "roleOwner") : t(lang, "roleMember")}
              </span>
              {canRemove && !isMe && !isOwner && (
                <button type="button" onClick={() => confirmThen(key, () => onRemove(m.user_id))}
                  className="h-10 px-3 rounded-xl text-[13px] font-semibold cursor-pointer shrink-0"
                  style={confirming === key ? { background: "var(--color-danger-strong)", color: "#fff" } : { background: "var(--color-danger-soft)", color: "var(--color-danger-ink)" }}>
                  {confirming === key ? t(lang, "confirm") : t(lang, "expel")}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
