import { useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { t } from "../../data/i18n";
import { uploadItemPhoto } from "../../lib/photoUpload";

interface Props {
  photo: string | null | undefined;
  lang: string;
  /** New photo URL, or null to remove it. */
  onChange: (url: string | null) => void;
}

const canReadClipboard = () => typeof navigator.clipboard?.read === "function" || typeof navigator.clipboard?.readText === "function";
const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());

// Three ways to give a product its photo: a file (or the camera), a link, or
// whatever is on the clipboard ("Copy image" in Google Images, or a copied
// link). Files and pasted images are uploaded; links are kept as they are.
export default function PhotoPicker({ photo, lang, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"none" | "url" | "paste">("none");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    setMessage("");
    try {
      const u = await uploadItemPhoto(file);
      if (u) { onChange(u); setMode("none"); }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
    setBusy(false);
  };

  const applyUrl = (u: string) => {
    if (!isUrl(u)) return false;
    onChange(u.trim());
    setUrl("");
    setMode("none");
    setMessage("");
    return true;
  };

  // Clipboard API first (an image, else a link); browsers that don't allow
  // it get a field where the person pastes with Ctrl+V / long-press → Paste.
  const pasteFromClipboard = async () => {
    setMessage("");
    try {
      if (typeof navigator.clipboard?.read === "function") {
        for (const item of await navigator.clipboard.read()) {
          const type = item.types.find(ty => ty.startsWith("image/"));
          if (type) {
            const blob = await item.getType(type);
            await upload(new File([blob], `pasted.${type.split("/")[1] || "png"}`, { type }));
            return;
          }
        }
      }
      const text = typeof navigator.clipboard?.readText === "function" ? await navigator.clipboard.readText() : "";
      if (applyUrl(text)) return;
      if (canReadClipboard()) { setMessage(t(lang, "photoNothingToPaste")); return; }
    } catch {
      // Permission refused or not supported: paste by hand below.
    }
    setMode("paste");
  };

  const onPasteEvent = (e: ClipboardEvent<HTMLInputElement>) => {
    const file = [...e.clipboardData.files].find(f => f.type.startsWith("image/"));
    if (file) { e.preventDefault(); void upload(file); return; }
    const text = e.clipboardData.getData("text");
    if (applyUrl(text)) e.preventDefault();
  };

  const onDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = [...e.dataTransfer.files].find(f => f.type.startsWith("image/"));
    if (file) void upload(file);
    else applyUrl(e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text"));
  };

  const tile = "flex-1 min-w-0 h-[64px] flex flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed text-[12px] font-semibold cursor-pointer disabled:opacity-50";
  const tileStyle = (active: boolean) => ({
    borderColor: active ? "var(--color-accent)" : "color-mix(in srgb, var(--color-text) 18%, transparent)",
    color: active ? "var(--color-accent)" : "var(--color-text-soft)",
    background: active ? "color-mix(in srgb, var(--color-accent) 8%, transparent)" : "transparent",
  });
  const field = "flex-1 min-w-0 h-10 px-3 rounded-[10px] bg-bg border border-border-light text-text text-[16px] outline-none focus:border-accent";

  return (
    <div className="mb-2">
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (fileRef.current) fileRef.current.value = ""; if (f) void upload(f); }} />
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={tile} style={tileStyle(dragOver)}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M20 15v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4" />
          </svg>
          {busy ? t(lang, "photoUploading") : t(lang, "photoFile")}
        </button>
        <button type="button" disabled={busy} onClick={() => { setMode(m => (m === "url" ? "none" : "url")); setMessage(""); }} className={tile} style={tileStyle(mode === "url")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
          </svg>
          {t(lang, "photoLink")}
        </button>
        <button type="button" disabled={busy} onClick={() => void pasteFromClipboard()} className={tile} style={tileStyle(mode === "paste")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          </svg>
          {t(lang, "photoPaste")}
        </button>
      </div>

      {mode === "url" && (
        <div className="flex gap-2 mt-2">
          <input autoFocus type="url" inputMode="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…"
            onKeyDown={e => { if (e.key === "Enter") applyUrl(url); if (e.key === "Escape") setMode("none"); }}
            onPaste={onPasteEvent} className={field} />
          <button type="button" onClick={() => applyUrl(url)} disabled={!isUrl(url)}
            className="h-10 px-4 rounded-[10px] text-[13px] font-bold text-white cursor-pointer disabled:opacity-40" style={{ background: "var(--color-accent)" }}>OK</button>
        </div>
      )}
      {mode === "paste" && (
        <input autoFocus type="text" onPaste={onPasteEvent} placeholder={t(lang, "photoPasteHere")} className={`${field} w-full mt-2`} />
      )}
      {message && <div className="mt-1.5 text-[12px] text-text-soft">{message}</div>}

      {photo && (
        <div className="relative mt-2">
          <img src={photo} alt="" className="w-full max-h-[180px] object-contain rounded-[10px] bg-bg" />
          <button type="button" onClick={() => onChange(null)} aria-label={t(lang, "photoRemove")}
            className="absolute top-1.5 right-1.5 w-9 h-9 rounded-full flex items-center justify-center text-white text-[16px] cursor-pointer"
            style={{ background: "rgba(0,0,0,0.55)" }}>✕</button>
        </div>
      )}
    </div>
  );
}
