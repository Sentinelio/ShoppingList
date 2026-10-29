import { useEffect, useState } from "react";
import { pb, IS_DEMO } from "../../lib/pocketbase";
import { onAdminError, type AdminError } from "../../lib/adminErrors";
import { t } from "../../data/i18n";

// Header status: pings /api/health every 30 s and says "connected" only when
// the server really answers (it used to be green whenever not in demo mode).
export function ConnectionBadge() {
  const [ok, setOk] = useState<boolean | null>(IS_DEMO ? false : null);
  useEffect(() => {
    if (IS_DEMO) return;
    let alive = true;
    const ping = () =>
      pb.health.check()
        .then(() => { if (alive) setOk(true); })
        .catch((err) => {
          console.error("[admin] health check failed", err);
          if (alive) setOk(false);
        });
    ping();
    const id = setInterval(ping, 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  const color = ok ? "#3dd68c" : ok === null ? "#8b92a8" : "#ff5c5c";
  const label = IS_DEMO ? "Demo Mode" : ok ? "PocketBase" : ok === null ? "…" : "Sin conexión";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "0 0 auto" }}
      title={IS_DEMO ? "Running in Demo Mode (no backend connection)" : ok ? "Connected to PocketBase" : "PocketBase does not answer"}>
      <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: color,
        animation: ok ? "admin-status-pulse 2s ease-in-out infinite" : undefined }} />
      <span style={{ fontSize: 12, fontWeight: 700, color, whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
}

// Failed admin actions, shown until dismissed (see lib/adminErrors.ts).
export function AdminErrorBanner({ lang }: { lang: string }) {
  const [errors, setErrors] = useState<AdminError[]>([]);
  useEffect(() => onAdminError(e => setErrors(prev => [...prev.slice(-4), e])), []);
  if (errors.length === 0) return null;
  return (
    <div className="fixed top-2 left-2 right-2 z-[60] flex flex-col gap-2" role="alert">
      {errors.map(e => (
        <div key={e.id} className="rounded-xl px-3 py-2.5 shadow-2xl flex items-start gap-2"
          style={{ background: "#2b1f24", border: "1px solid rgba(255,107,107,0.5)", color: "#ffd0d0" }}>
          <div className="flex-1 min-w-0 text-[13px] leading-snug">
            <div className="font-bold" style={{ color: "#ff9d9d" }}>❌ {e.action}</div>
            <div className="break-words">{e.network ? t(lang, "errNetwork") : e.message}</div>
          </div>
          <button type="button" aria-label={t(lang, "close")}
            onClick={() => setErrors(prev => prev.filter(x => x.id !== e.id))}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer" style={{ color: "#ff9d9d" }}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
