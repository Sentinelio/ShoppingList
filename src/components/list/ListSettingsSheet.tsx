import { useEffect, useState } from "react";
import type { List } from "../../lib/pocketbase";
import { t } from "../../data/i18n";
import { getActiveCountries } from "../../lib/langConfig";
import Sheet from "../ui/Sheet";

type Policy = "keep" | "next_trip" | "next_day";
type Who = "owner" | "any_member";

interface ListSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  list: List | null;
  lang: string;
  userCountry: string;
  isOwner: boolean;
  onChange: (updates: Partial<Pick<List, "name" | "country" | "unavailable_policy" | "who_can_approve" | "who_can_remove">>) => void;
  /** Owner: delete the list for everyone. Others: leave it. */
  onDeleteOrLeave: () => void;
}

// 3.6 — name, country, what happens to "No hay" items, who can approve and
// remove, delete (or leave). No invite code here.
export default function ListSettingsSheet({ open, onClose, list, lang, userCountry, isOwner, onChange, onDeleteOrLeave }: ListSettingsSheetProps) {
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setName(list?.name ?? "");
      setConfirmDelete(false);
    }
  }, [open, list?.name]);

  if (!list) return null;
  const countries = getActiveCountries();
  const policy: Policy = (list.unavailable_policy || "keep") as Policy;
  const who: Who = list.who_can_approve === "any_member" && list.who_can_remove === "any_member" ? "any_member" : "owner";

  const saveName = () => {
    const v = name.trim();
    if (v && v !== list.name) onChange({ name: v });
    else setName(list.name);
  };

  const label = "block text-[13px] font-bold uppercase tracking-wide px-1 mb-2 mt-4";
  const block = "rounded-[14px] bg-bg divide-y divide-border overflow-hidden";

  const radio = <T extends string>(group: string, value: T, current: T, text: string, onPick: (v: T) => void, disabled = false) => (
    <label key={value} className={`flex items-center gap-3 px-4 min-h-[52px] ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <input type="radio" name={group} value={value} checked={current === value} disabled={disabled}
        onChange={() => onPick(value)} className="sr-only peer" />
      <span aria-hidden="true" className="shrink-0 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center peer-focus-visible:ring-2 ring-accent"
        style={{ borderColor: current === value ? "var(--color-accent)" : "var(--color-text-muted)" }}>
        {current === value && <span className="w-[11px] h-[11px] rounded-full" style={{ background: "var(--color-accent)" }} />}
      </span>
      <span className="flex-1 text-[15px] text-text">{text}</span>
    </label>
  );

  return (
    <Sheet open={open} onClose={onClose} title={t(lang, "listSettings")} closeLabel={t(lang, "close")}>
      <label className={label} style={{ color: "var(--color-accent)", marginTop: 0 }} htmlFor="list-name">{t(lang, "name")}</label>
      <input id="list-name" value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className="w-full h-12 px-4 rounded-[14px] bg-bg border border-border-light text-text text-[16px] outline-none focus:border-accent" />

      <label className={label} style={{ color: "var(--color-accent)" }} htmlFor="list-country">{t(lang, "listCountry")}</label>
      <select id="list-country" value={list.country || userCountry}
        onChange={(e) => onChange({ country: e.target.value })}
        className="w-full h-12 px-3 rounded-[14px] bg-bg border border-border-light text-text text-[16px] outline-none focus:border-accent">
        {countries.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
      </select>
      <p className="text-[12px] text-text-muted px-1 mt-1.5">{t(lang, "listCountryHint")}</p>

      <h3 className={label} style={{ color: "var(--color-accent)" }}>{t(lang, "unavailableSection")}</h3>
      <div className={block} role="radiogroup" aria-label={t(lang, "unavailableSection")}>
        {radio<Policy>("policy", "keep", policy, t(lang, "policyKeep"), v => onChange({ unavailable_policy: v }))}
        {radio<Policy>("policy", "next_trip", policy, t(lang, "policyNextTrip"), v => onChange({ unavailable_policy: v }))}
        {radio<Policy>("policy", "next_day", policy, t(lang, "policyNextDay"), v => onChange({ unavailable_policy: v }))}
      </div>

      <h3 className={label} style={{ color: "var(--color-accent)" }}>{t(lang, "members")}</h3>
      <div className={block} role="radiogroup" aria-label={t(lang, "whoCanApprove")}>
        <div className="px-4 pt-3 pb-1 text-[13px] text-text-soft">
          {t(lang, "whoCanApprove")}{!isOwner && ` · ${t(lang, "onlyOwnerChanges")}`}
        </div>
        {radio<Who>("who", "owner", who, t(lang, "onlyOwner"), v => onChange({ who_can_approve: v, who_can_remove: v }), !isOwner)}
        {radio<Who>("who", "any_member", who, t(lang, "anyMember"), v => onChange({ who_can_approve: v, who_can_remove: v }), !isOwner)}
      </div>

      <div className={`${block} mt-5 mb-2`}>
        <button type="button"
          onClick={() => { if (confirmDelete) onDeleteOrLeave(); else setConfirmDelete(true); }}
          className="w-full min-h-[52px] px-4 text-left text-[15px] font-semibold cursor-pointer"
          style={confirmDelete ? { background: "var(--color-danger-strong)", color: "#fff" } : { color: "var(--color-important)" }}>
          {confirmDelete
            ? t(lang, isOwner ? "confirmDeleteList" : "confirmLeaveList")
            : t(lang, isOwner ? "deleteList" : "leaveList")}
        </button>
      </div>
    </Sheet>
  );
}
