import { useState } from "react";
import { callRoute } from "../../lib/pocketbase";
import { reportAdminError } from "../../lib/adminErrors";
import { getEnabledLangs } from "../../lib/langConfig";
import { ALL_LANGUAGES } from "../../data/allLanguages";

// Admin → Messages: a notification every chosen user gets in the app (it
// can't be turned off). Written in one language, optionally translated with
// Claude into every enabled language; each user sees theirs (else English).

type Target = "all" | "lang" | "users";
interface Recipient { name: string; tag: string; lang: string }

const flag = (code: string) => ALL_LANGUAGES.find(l => l.code === code)?.flag ?? "";
const langName = (code: string) => ALL_LANGUAGES.find(l => l.code === code)?.name ?? code;

export default function AdminMessages() {
  const enabled = getEnabledLangs();
  const [source, setSource] = useState("en");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [translations, setTranslations] = useState<Record<string, { title: string; body: string }>>({});
  const [translating, setTranslating] = useState(false);
  const [target, setTarget] = useState<Target>("all");
  const [lang, setLang] = useState(enabled[0] ?? "en");
  const [tags, setTags] = useState("");
  const [recipients, setRecipients] = useState<Recipient[] | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");

  const payloadTarget = () => ({
    target,
    lang: target === "lang" ? lang : undefined,
    tags: target === "users" ? tags.split(/[\s,;]+/).filter(Boolean) : undefined,
  });
  const reset = () => { setRecipients(null); setConfirm(false); setResult(""); };

  const translate = async () => {
    setTranslating(true);
    const next: Record<string, { title: string; body: string }> = {};
    for (const code of enabled.filter(c => c !== source)) {
      try {
        const data = await callRoute<{ translations?: Record<string, string> }>("translate-ui", {
          strings: { title, body }, targetLang: code, targetLangName: langName(code),
        });
        next[code] = { title: data.translations?.title ?? "", body: data.translations?.body ?? "" };
      } catch (err) {
        reportAdminError(`Translate message to ${code}`, err);
      }
    }
    setTranslations(next);
    setTranslating(false);
  };

  const preview = async () => {
    reset();
    try {
      const data = await callRoute<{ recipients: Recipient[] }>("notify", { ...payloadTarget(), title: title || "-", dry: true });
      setRecipients(data.recipients);
    } catch (err) {
      reportAdminError("Preview recipients", err);
    }
  };

  const send = async () => {
    if (!confirm) { setConfirm(true); return; }
    setSending(true);
    const map = (field: "title" | "body") => {
      const m: Record<string, string> = { [source]: field === "title" ? title : body };
      for (const [code, tr] of Object.entries(translations)) if (tr[field].trim()) m[code] = tr[field];
      return Object.keys(m).length > 1 ? m : m[source];
    };
    try {
      const data = await callRoute<{ sent: number }>("notify", { ...payloadTarget(), title: map("title"), body: map("body") });
      setResult(`Sent to ${data.sent} user${data.sent === 1 ? "" : "s"}.`);
      setTitle(""); setBody(""); setTranslations({}); setRecipients(null);
    } catch (err) {
      reportAdminError("Send message", err);
    }
    setConfirm(false);
    setSending(false);
  };

  const field = "w-full px-3 py-2 rounded-lg bg-bg border border-border-light text-[14px] text-text outline-none focus:border-accent";
  const canSend = !!(title.trim() || body.trim()) && !sending;

  return (
    <div className="max-w-[760px] flex flex-col gap-4">
      <section className="bg-card rounded-xl border border-border p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h3 className="flex-1 text-[14px] font-bold text-text">Message</h3>
          <label className="text-[12px] text-text-muted">Written in</label>
          <select value={source} onChange={e => { setSource(e.target.value); setTranslations({}); }}
            className="h-8 px-2 rounded-lg bg-bg border border-border-light text-[13px] text-text cursor-pointer">
            {enabled.map(c => <option key={c} value={c}>{flag(c)} {c}</option>)}
          </select>
        </div>
        <input value={title} onChange={e => { setTitle(e.target.value); reset(); }} placeholder="Title" className={field} maxLength={120} />
        <textarea value={body} onChange={e => { setBody(e.target.value); reset(); }} placeholder="Message" rows={4} className={field} maxLength={1000} />
        <div className="flex items-center gap-2">
          <button type="button" onClick={translate} disabled={translating || !(title.trim() || body.trim())}
            className="h-9 px-3 rounded-lg text-[13px] font-semibold cursor-pointer disabled:opacity-40"
            style={{ background: "color-mix(in srgb, var(--color-success) 12%, transparent)", color: "var(--color-success)" }}>
            {translating ? "⏳ Translating…" : `🧠 Translate into the ${enabled.length - 1} other languages`}
          </button>
          <span className="text-[12px] text-text-muted">Users get their language, else {source === "en" ? "this text" : "English if present, else this text"}.</span>
        </div>
        {Object.keys(translations).length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            {Object.entries(translations).map(([code, tr]) => (
              <div key={code} className="grid grid-cols-[48px_1fr] gap-2 items-start">
                <span className="text-[13px] text-text-soft pt-2">{flag(code)} {code}</span>
                <div className="flex flex-col gap-1">
                  <input value={tr.title} onChange={e => setTranslations(p => ({ ...p, [code]: { ...p[code], title: e.target.value } }))} className={field} />
                  <textarea value={tr.body} rows={2} onChange={e => setTranslations(p => ({ ...p, [code]: { ...p[code], body: e.target.value } }))} className={field} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-card rounded-xl border border-border p-4 flex flex-col gap-3">
        <h3 className="text-[14px] font-bold text-text">Recipients</h3>
        <div className="flex gap-2 flex-wrap">
          {([["all", "Everyone"], ["lang", "Users of a language"], ["users", "Specific users (by ID)"]] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => { setTarget(k); reset(); }} aria-pressed={target === k}
              className="h-8 px-3 rounded-full text-[13px] font-semibold cursor-pointer"
              style={{ background: target === k ? "var(--color-accent-soft)" : "var(--color-bg)", color: target === k ? "var(--color-accent-ink)" : "var(--color-text-soft)" }}>
              {label}
            </button>
          ))}
        </div>
        {target === "lang" && (
          <select value={lang} onChange={e => { setLang(e.target.value); reset(); }} className={`${field} max-w-[260px] cursor-pointer`}>
            {enabled.map(c => <option key={c} value={c}>{flag(c)} {langName(c)}</option>)}
          </select>
        )}
        {target === "users" && (
          <textarea value={tags} onChange={e => { setTags(e.target.value); reset(); }} rows={2} className={field}
            placeholder="User IDs, separated by spaces or commas (K7M-2QX, ENJBPC…)" />
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={preview} className="h-9 px-3 rounded-lg bg-bg border border-border-light text-[13px] font-semibold text-text cursor-pointer">
            👀 Check recipients
          </button>
          {recipients && (
            <span className="text-[13px] text-text-soft">
              {recipients.length} user{recipients.length === 1 ? "" : "s"}
              {recipients.length > 0 && `: ${recipients.slice(0, 6).map(r => `${r.name} (${r.tag})`).join(", ")}${recipients.length > 6 ? "…" : ""}`}
            </span>
          )}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button type="button" onClick={send} disabled={!canSend}
          className="h-11 px-5 rounded-xl text-[14px] font-bold cursor-pointer disabled:opacity-40"
          style={confirm ? { background: "var(--color-danger-strong)", color: "#fff" } : { background: "var(--color-accent)", color: "var(--color-on-accent)" }}>
          {sending ? "Sending…" : confirm ? "Confirm: send now" : "📣 Send"}
        </button>
        {confirm && <button type="button" onClick={() => setConfirm(false)} className="text-[13px] text-text-soft cursor-pointer">Cancel</button>}
        {result && <span className="text-[13px]" style={{ color: "var(--color-success)" }}>✅ {result}</span>}
      </div>
      <p className="text-[12px] text-text-muted">Users can't turn admin messages off. Old notifications are removed after 90 days.</p>
    </div>
  );
}
