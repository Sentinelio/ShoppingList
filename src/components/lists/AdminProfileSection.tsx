import { useEffect, useState } from "react";
import { pb, type List, type User } from "../../lib/pocketbase";
import { go } from "../../lib/router";

// Profile → "Admin" (only users.is_admin): open the admin panel, open any
// list without being invited (admin mode: nobody sees you in Members, what
// you add shows as "Admin"), and whether you may edit those lists (off =
// read-only, enforced by the server: migration 1792540013). Admin texts are
// in English.
export default function AdminProfileSection({ user, onEditChange }: {
  user: User;
  onEditChange: (on: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const [lists, setLists] = useState<List[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const term = q.trim();
    const timer = setTimeout(async () => {
      try {
        const res = await pb.collection("lists").getList<List>(1, 20, {
          sort: "-created_at",
          filter: term ? pb.filter("name ~ {:q} || code ~ {:q}", { q: term }) : "",
          fields: "id,name,code,country,active_members",
          skipTotal: true,
        });
        if (!cancelled) { setLists(res.items); setError(false); }
      } catch (err) {
        console.error("[admin lists]", err);
        if (!cancelled) setError(true);
      }
    }, term ? 300 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [q]);

  const label = "text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block";
  const accent = { background: "var(--color-accent-soft)", color: "var(--color-accent-ink)" };

  return (
    <section>
      <h2 className={label}>🛡️ Admin</h2>
      <div className="flex flex-col gap-3">
        <button type="button" onClick={() => go({ page: "admin" })}
          className="w-full h-12 rounded-xl text-[14px] font-bold cursor-pointer" style={accent}>
          Open admin panel
        </button>

        <label className="flex items-center gap-3 px-3 min-h-[52px] rounded-[14px] bg-card cursor-pointer">
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] text-text">Edit lists I'm not a member of</span>
            <span className="block text-[12px] text-text-muted">
              {user.admin_edit ? "On: you can add, tick and change things." : "Off: read-only, the server refuses any change."}
            </span>
          </span>
          <input type="checkbox" checked={!!user.admin_edit} onChange={e => onEditChange(e.target.checked)}
            className="w-5 h-5 cursor-pointer accent-[var(--color-accent)]" />
        </label>

        <div>
          <p className="text-[13px] text-text-muted mb-2">
            Open any list without being invited. You don't appear in its members, and what you add shows as "Admin".
          </p>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by list name or code" aria-label="Search lists"
            className="w-full py-3 px-4 bg-card border border-border-light rounded-xl text-text text-[16px] outline-none focus:border-accent" />
          <div className="mt-2 rounded-[14px] bg-card divide-y divide-border overflow-hidden">
            {error && <div className="px-3 py-3 text-[13px]" style={{ color: "var(--color-danger)" }}>Could not load the lists.</div>}
            {!error && lists === null && <div className="px-3 py-3 text-[13px] text-text-muted">…</div>}
            {!error && lists?.length === 0 && <div className="px-3 py-3 text-[13px] text-text-muted">No list matches.</div>}
            {lists?.map(l => {
              const member = (l.active_members ?? []).includes(user.id);
              return (
                <button key={l.id} type="button" onClick={() => go({ page: "list", listId: l.id, tab: "list" })}
                  className="w-full flex items-center gap-3 px-3 min-h-[52px] text-left cursor-pointer active:bg-text/5">
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] text-text truncate">{l.name}</span>
                    <span className="block text-[12px] text-text-muted font-mono">
                      {l.code}{member ? " · member" : ""} · {(l.active_members ?? []).length} members
                    </span>
                  </span>
                  <span className="text-text-muted" aria-hidden="true">›</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
