import { useState, useEffect } from "react";
import type { Item } from "../../lib/supabase";
import { getLangFlag } from "../../data/langs";
import { t } from "../../data/i18n";
import { SHOW_VARIANTS } from "../../lib/itemDetailLab";
import { useLabSelection } from "../../hooks/useLabSelection";
import { useStorePhrases } from "../../hooks/useStorePhrases";
import { incrementPhraseUsage } from "../../lib/storePhrasesStore";
import { matchProductEmoji } from "../../lib/emojiMatcher";

interface ItemDetailProps {
  item: Item | null;
  open: boolean;
  onClose: () => void;
  userLang: string;
  shelfLang: string;
  countryFlag?: string;
  onUpdate: (itemId: string, updates: Partial<Pick<Item, "qty" | "unit" | "note" | "photo" | "important">>) => void;
  onDelete: (itemId: string) => void;
  onShowStore: (item: Item) => void;
  lang?: string;
}

const UNITS = [
  { value: "", label: "\u2014" },
  { value: "x", label: "\u00d7" },
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "L", label: "L" },
  { value: "ml", label: "ml" },
  { value: "cl", label: "cl" },
  { value: "pack", label: "pack" },
];

type DetailTab = "show" | "edit" | "price" | "trans" | "stats" | "comm" | "hist" | "del";

const TABS: { key: DetailTab; icon: string }[] = [
  { key: "show", icon: "📱" },
  { key: "edit", icon: "✏️" },
  { key: "price", icon: "💰" },
  { key: "trans", icon: "🌍" },
  { key: "stats", icon: "📊" },
  { key: "comm", icon: "💬" },
  { key: "hist", icon: "📋" },
];

// ── Side-tab styles (matching the lab phone preview) ─────────────────────
const tabBarStyle: React.CSSProperties = {
  width: 46,
  background: "#10121a",
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: "12px 3px 10px",
  borderRight: "1px solid rgba(255,255,255,0.06)",
  flexShrink: 0,
  overflowY: "auto",
};

const tabBtnBase: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  transition: "background 0.15s",
  flexShrink: 0,
};

export default function ItemDetail({
  item,
  open,
  onClose,
  userLang,
  shelfLang,
  countryFlag,
  onUpdate,
  onDelete,
}: ItemDetailProps) {
  const lang = userLang;
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");
  const [_deleteStep, setDeleteStep] = useState<0 | 1>(0);
  void _deleteStep; // used only for reset in useEffect
  const [activeTab, setActiveTab] = useState<DetailTab>("show");
  const [activePhrase, setActivePhrase] = useState<string | null>(null);
  const [showPhraseList, setShowPhraseList] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [editingPhoto, setEditingPhoto] = useState(false);
  const phrases = useStorePhrases();
  const labSel = useLabSelection();
  const sv = SHOW_VARIANTS[labSel.show] ?? SHOW_VARIANTS[0];

  // Debug: log what we read so we can diagnose sync issues
  useEffect(() => {
    if (open && item) {
      const raw = localStorage.getItem("babelcart_item_detail_lab_v1");
      console.log("[ItemDetail] Lab selection from localStorage:", raw);
      console.log("[ItemDetail] Parsed labSel:", labSel);
    }
  }, [open, item, labSel]);

  useEffect(() => {
    if (item) {
      setQty(item.qty || "");
      setUnit(item.unit || "");
      setNote(item.note || "");
      setDeleteStep(0);
      setActiveTab("show");
      setActivePhrase(null);
      setShowPhraseList(false);
      setEditingPhoto(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, open]);

  if (!open || !item) return null;

  const displayName = item.translations[userLang] || item.original;
  const shelfName = item.translations[shelfLang] || item.original;
  const showShelf = shelfLang !== userLang && shelfName.toLowerCase() !== displayName.toLowerCase();
  const emojiChar = matchProductEmoji(item.original).emoji || "🛒";
  const activePhraseObj = activePhrase ? phrases.find(p => p.key === activePhrase) : null;
  const activePhraseShelf = activePhraseObj
    ? (activePhraseObj.translations[shelfLang] || activePhraseObj.translations.en)
    : null;

  const handleSave = () => onUpdate(item.id, { qty, unit, note });

  const savePhotoUrl = () => {
    const url = photoUrl.trim();
    if (!url) return;
    onUpdate(item.id, { photo: url });
    setPhotoUrl("");
    setEditingPhoto(false);
  };

  // ── SHOW PANE ──────────────────────────────────────────────────────────
  const showPane = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0, background: sv.bodyBg }}>
      {/* Active phrase banner */}
      {activePhraseShelf && (
        <div onClick={() => setActivePhrase(null)}
          style={{ textAlign: "center", padding: "16px 16px 12px", background: "linear-gradient(135deg, #f09848, #e07028)", cursor: "pointer", flexShrink: 0 }}>
          <span style={{ fontSize: 24, display: "block", marginBottom: 4 }}>{activePhraseObj?.emoji}</span>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{activePhraseShelf}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>tap para ocultar</div>
        </div>
      )}
      {/* Shelf name */}
      <div style={{ textAlign: "center", padding: "2px 16px 0", flexShrink: 0 }}>
        <div style={{ fontSize: sv.shelfFontSize, fontWeight: sv.shelfFontWeight, color: "var(--color-shelf, #e8c364)", marginTop: 10, letterSpacing: sv.shelfLetterSpacing, textShadow: sv.shelfTextShadow }}>
          {shelfName}
        </div>
        {showShelf && (
          <div style={{ fontSize: sv.mineFontSize, color: sv.mineColor, marginTop: 4, ...(sv.mineBg ? { padding: "4px 12px", background: sv.mineBg, borderRadius: sv.mineBorderRadius || "8px", display: "inline-block" } : {}) }}>
            ({displayName})
          </div>
        )}
      </div>
      {/* Emoji centered */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {item.photo ? (
          <img src={item.photo} style={{ maxWidth: "70%", maxHeight: "30vh", borderRadius: 16, objectFit: "contain" }} alt={shelfName} />
        ) : (
          <span style={{ fontSize: sv.emojiFontSize, lineHeight: 1, filter: sv.emojiFilter, opacity: sv.emojiOpacity }} aria-hidden="true">{emojiChar}</span>
        )}
      </div>
      {/* Qty + note */}
      {(qty || item.note) && (
        <div style={{ textAlign: "center", flexShrink: 0, padding: "0 16px 4px" }}>
          {qty && <p style={{ fontSize: 20, fontWeight: 800, color: "var(--color-accent, #f0883e)" }}>{qty}{unit}</p>}
          {item.note && <p style={{ fontSize: 13, color: "#8b92a8", fontStyle: "italic", marginTop: 4 }}>{item.note}</p>}
        </div>
      )}
      {/* Collapsible phrases */}
      <div style={{ flexShrink: 0, paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        <div onClick={() => setShowPhraseList(v => !v)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, cursor: "pointer", borderTop: sv.toggleBorderTop, background: sv.toggleBg, borderRadius: sv.toggleBorderRadius, border: !sv.toggleBorderTop ? sv.toggleBorder : undefined, ...(sv.toggleBorderRadius ? { margin: "0 12px" } : {}) }}>
          <span style={{ fontSize: sv.toggleLabelSize, fontWeight: sv.toggleLabelWeight, color: sv.toggleLabelColor }}>Preguntas para el dependiente</span>
          <span style={{ fontSize: sv.toggleLabelSize - 1, color: sv.toggleLabelColor }}>{showPhraseList ? "▲" : "▼"}</span>
        </div>
        {showPhraseList && (
          <div style={{ maxHeight: 220, overflowY: "auto", borderRadius: sv.listBorderRadius, border: sv.listBorder, margin: sv.listMargin }}>
            {phrases.map(phrase => {
              const phraseShelf = phrase.translations[shelfLang] || phrase.translations.en || phrase.key;
              return (
                <div key={phrase.key} onClick={() => { setActivePhrase(phrase.key); setShowPhraseList(false); void incrementPhraseUsage(phrase.key); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontSize: 18 }}>{phrase.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#8b92a8" }}>{phraseShelf}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ── EDIT PANE (5 variants synced from lab) ───────────────────────────────
  // Shared blocks used by all edit variants
  const photoBlock = item.photo ? (
    <img src={item.photo} style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }} alt="" />
  ) : !editingPhoto ? (
    <button type="button" onClick={() => setEditingPhoto(true)}
      style={{ width: "100%", padding: "10px 0", borderRadius: 10, background: "transparent", border: "1.5px solid rgba(255,255,255,0.10)", color: "#8b92a8", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
      🔗 {t(lang, "addPhotoUrl")}
    </button>
  ) : (
    <div style={{ display: "flex", gap: 6 }}>
      <input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://..." autoFocus
        onKeyDown={e => { if (e.key === "Enter") savePhotoUrl(); if (e.key === "Escape") setEditingPhoto(false); }}
        className="input" style={{ flex: 1, fontSize: 13, padding: "8px 12px" }} />
      <button onClick={savePhotoUrl} style={{ padding: "8px 14px", borderRadius: 10, background: "linear-gradient(135deg,#f09848,#e07028)", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>OK</button>
    </div>
  );

  const importantBlock = (
    <button type="button" onClick={() => onUpdate(item.id, { important: !item.important })}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 11, border: `1.5px solid ${item.important ? "rgba(255,92,92,0.3)" : "rgba(255,255,255,0.10)"}`, background: item.important ? "rgba(255,92,92,0.04)" : "transparent", cursor: "pointer", width: "100%", fontFamily: "inherit" }}>
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: item.important ? "#ff5c5c" : "#555d74", boxShadow: item.important ? "0 0 6px rgba(255,92,92,0.4)" : "none" }} />
      <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: item.important ? "#ff5c5c" : "var(--color-text, #e6e8ee)", textAlign: "left" }}>{item.important ? t(lang, "important") : t(lang, "markImportant")}</span>
    </button>
  );

  const saveBtn = (
    <button type="button" onClick={handleSave}
      style={{ width: "100%", padding: "12px 0", borderRadius: 10, background: "linear-gradient(135deg,#f09848,#e07028)", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: "auto" }}>
      💾 {t(lang, "save")}
    </button>
  );

  // ── EDIT PANE (fixed design — matches lab preview exactly) ────────────
  const editPane = (
    <div key="edit" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#555d74", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{t(lang, "qty")}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="number" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} onBlur={handleSave} placeholder="1" className="input" style={{ width: 70, textAlign: "center" }} />
          <select value={unit} onChange={e => { setUnit(e.target.value); setTimeout(() => onUpdate(item.id, { qty, unit: e.target.value, note }), 0); }} className="input" style={{ flex: 1 }}>
            {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#555d74", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{t(lang, "notePlaceholder")}</div>
        <input type="text" value={note} onChange={e => setNote(e.target.value)} onBlur={handleSave} placeholder={t(lang, "notePlaceholder")} className="input" />
      </div>
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#555d74", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{t(lang, "important")}</div>
        {importantBlock}
      </div>
      {photoBlock}
      <div style={{ marginTop: "auto" }}>{saveBtn}</div>
    </div>
  );

  // ── TRANSLATIONS PANE (5 variants from the lab) ─────────────────────────
  const otherLangs = Object.entries(item.translations || {}).filter(([c]) => c !== userLang && c !== shelfLang);

  const transVariants: React.ReactNode[] = [
    // v1: Flag List — yours + shelf highlighted, others below divider
    <div key="t0" style={{ padding: "12px 16px", flex: 1 }}>
      <div style={{ textAlign: "center", marginBottom: 10 }}><span style={{ fontSize: 28 }}>{emojiChar}</span>{" "}<span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-accent)" }}>{qty}{unit}</span></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 6 }}>
        {[{ flag: getLangFlag(userLang), word: displayName, label: "Tu idioma", bg: "rgba(108,138,255,0.08)", border: "rgba(108,138,255,0.2)", color: "var(--color-text)" },
          ...(showShelf ? [{ flag: getLangFlag(shelfLang) || countryFlag, word: shelfName, label: "Estante", bg: "rgba(232,195,100,0.08)", border: "rgba(232,195,100,0.2)", color: "var(--color-shelf, #e8c364)" }] : []),
        ].map((row, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: row.bg, border: `1.5px solid ${row.border}` }}>
            <span style={{ fontSize: 20 }}>{row.flag}</span><span style={{ fontSize: 17, fontWeight: 800, flex: 1, color: row.color }}>{row.word}</span><span style={{ fontSize: 9, color: "#555d74", fontWeight: 600 }}>{row.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0 8px" }}><div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} /><span style={{ fontSize: 9, color: "#555d74", fontWeight: 600 }}>Otros idiomas</span><div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} /></div>
      {otherLangs.map(([code, word]) => (
        <div key={code} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", borderRadius: 8 }}><span style={{ fontSize: 14 }}>{getLangFlag(code)}</span><span style={{ fontSize: 13, fontWeight: 600, color: "#8b92a8" }}>{word}</span></div>
      ))}
    </div>,

    // v2: Bridge Visual — yours → emoji → shelf
    <div key="t1" style={{ padding: "12px 16px", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 8 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#6c8aff", textTransform: "uppercase", letterSpacing: "0.1em" }}>🇵🇱 Tu idioma</div>
      <div style={{ fontSize: 24, fontWeight: 800 }}>{displayName}</div>
      <div style={{ fontSize: 28, margin: "8px 0", color: "var(--color-accent)" }}>↓ {emojiChar} ↓</div>
      <div style={{ fontSize: 9, fontWeight: 700, color: "var(--color-shelf, #e8c364)", textTransform: "uppercase", letterSpacing: "0.1em" }}>🇪🇸 En la tienda</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "var(--color-shelf, #e8c364)" }}>{shelfName}</div>
      <div style={{ height: 1, width: "80%", background: "rgba(255,255,255,0.06)", margin: "12px auto" }} />
      <div style={{ fontSize: 10, color: "#555d74", marginBottom: 4 }}>Otros idiomas</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
        {otherLangs.map(([code, word]) => (
          <span key={code} style={{ padding: "4px 10px", borderRadius: 8, background: "var(--color-card, #161b26)", fontSize: 11, color: "#8b92a8" }}>{getLangFlag(code)} {word}</span>
        ))}
      </div>
    </div>,

    // v3: Tag Cloud — all translations as colored chips
    <div key="t2" style={{ padding: "12px 16px", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <span style={{ fontSize: 48 }}>{emojiChar}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
        {Object.entries(item.translations || {}).map(([code, word]) => {
          const isYours = code === userLang;
          const isShelf = code === shelfLang;
          return (
            <span key={code} style={{ padding: "7px 14px", borderRadius: 20, background: isYours ? "rgba(108,138,255,0.1)" : isShelf ? "rgba(232,195,100,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${isYours ? "rgba(108,138,255,0.2)" : isShelf ? "rgba(232,195,100,0.2)" : "var(--color-border)"}`, fontSize: 13, fontWeight: 700, color: isShelf ? "var(--color-shelf, #e8c364)" : isYours ? "#6c8aff" : "#8b92a8" }}>
              {getLangFlag(code)} {word}
            </span>
          );
        })}
      </div>
    </div>,

    // v4: Card Grid — 2-column cards with flags
    <div key="t3" style={{ padding: "12px 16px", flex: 1 }}>
      <div style={{ textAlign: "center", marginBottom: 10 }}><span style={{ fontSize: 24 }}>{emojiChar}</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {Object.entries(item.translations || {}).map(([code, word]) => {
          const isYours = code === userLang;
          const isShelf = code === shelfLang;
          return (
            <div key={code} style={{ padding: 10, borderRadius: 10, background: isYours ? "rgba(108,138,255,0.06)" : isShelf ? "rgba(232,195,100,0.06)" : "var(--color-card, #161b26)", border: `1px solid ${isYours ? "rgba(108,138,255,0.15)" : isShelf ? "rgba(232,195,100,0.15)" : "var(--color-border)"}`, textAlign: "center" }}>
              <div style={{ fontSize: 18 }}>{getLangFlag(code)}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: isShelf ? "var(--color-shelf, #e8c364)" : "var(--color-text)", marginTop: 2 }}>{word}</div>
            </div>
          );
        })}
      </div>
    </div>,

    // v5: Comparison Columns — side by side
    <div key="t4" style={{ padding: "12px 16px", flex: 1 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "8px 12px", background: "rgba(108,138,255,0.06)", fontSize: 10, fontWeight: 700, color: "#6c8aff", textAlign: "center", borderBottom: "1px solid var(--color-border)" }}>Tu idioma</div>
        <div style={{ padding: "8px 12px", background: "rgba(232,195,100,0.06)", fontSize: 10, fontWeight: 700, color: "var(--color-shelf, #e8c364)", textAlign: "center", borderBottom: "1px solid var(--color-border)" }}>Estante</div>
        <div style={{ padding: 14, textAlign: "center", borderRight: "1px solid var(--color-border)" }}>
          <div style={{ fontSize: 32 }}>{emojiChar}</div><div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{displayName}</div>
        </div>
        <div style={{ padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 32 }}>{emojiChar}</div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--color-shelf, #e8c364)", marginTop: 4 }}>{shelfName}</div>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#555d74", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>También se dice...</div>
        {otherLangs.map(([code, word]) => (
          <div key={code} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 12 }}><span>{getLangFlag(code)}</span><span style={{ fontWeight: 600 }}>{word}</span></div>
        ))}
      </div>
    </div>,
  ];

  const transPane = transVariants[labSel.trans] ?? transVariants[0];

  // ── DELETE PANE ────────────────────────────────────────────────────────
  const delPane = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 14, padding: "40px 24px" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,92,92,0.08)", border: "1px solid rgba(255,92,92,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🗑</div>
      <div style={{ fontSize: 17, fontWeight: 800 }}>¿Eliminar {displayName}?</div>
      <div style={{ fontSize: 12, color: "#8b92a8", lineHeight: 1.4 }}>Se eliminará de la lista para todos los miembros. Esta acción no se puede deshacer.</div>
      <div style={{ display: "flex", gap: 8, width: "100%", marginTop: 8 }}>
        <button type="button" onClick={() => setActiveTab("show")}
          style={{ flex: 1, padding: 13, borderRadius: 12, background: "#161b26", border: "1px solid rgba(255,255,255,0.10)", color: "#8b92a8", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
        <button type="button" onClick={() => { onDelete(item.id); onClose(); }}
          style={{ flex: 1, padding: 13, borderRadius: 12, background: "#ff5c5c", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Eliminar</button>
      </div>
    </div>
  );

  // ── PLACEHOLDER PANES (price, stats, comm, hist) ──────────────────────
  const placeholderPane = (icon: string, label: string) => (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 40, textAlign: "center" }}>
      <span style={{ fontSize: 40 }}>{icon}</span>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 11, color: "#555d74" }}>Próximamente</div>
    </div>
  );

  const paneContent: Record<DetailTab, React.ReactNode> = {
    show: showPane,
    edit: editPane,
    trans: transPane,
    del: delPane,
    price: placeholderPane("💰", "Historial de precios"),
    stats: placeholderPane("📊", "Estadísticas"),
    comm: placeholderPane("💬", "Comentarios"),
    hist: placeholderPane("📋", "Historial"),
  };

  // ── RENDER: full-screen overlay with side tabs ─────────────────────────
  return (
    <div
      className="fixed inset-0 z-50"
      style={{ display: "flex", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Panel — phone-like container */}
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "calc(100% - 80px)",
          maxWidth: 460,
          height: "calc(100% - 96px)",
          maxHeight: "calc(100vh - 96px)",
          margin: "48px auto",
          background: "var(--color-bg, #0d1017)",
          overflow: "hidden",
          zIndex: 1,
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        {/* Side tab bar */}
        <div style={tabBarStyle}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...tabBtnBase,
                background: activeTab === tab.key ? "#161b26" : "transparent",
                border: activeTab === tab.key ? "1px solid rgba(255,255,255,0.10)" : "none",
              }}
            >
              {tab.icon}
              {activeTab === tab.key && (
                <span style={{ position: "absolute", right: -2, top: "50%", transform: "translateY(-50%)", width: 3, height: 12, background: "#f0883e", borderRadius: 2 }} />
              )}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => setActiveTab("del")}
            style={{
              ...tabBtnBase,
              color: "#ff5c5c",
              background: activeTab === "del" ? "#161b26" : "transparent",
              border: activeTab === "del" ? "1px solid rgba(255,92,92,0.2)" : "none",
            }}
          >
            🗑
          </button>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              position: "absolute", top: 8, right: 10, zIndex: 10,
              width: 28, height: 28, borderRadius: 9,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, color: "#8b92a8", cursor: "pointer",
            }}
          >
            ✕
          </button>

          {/* Scrollable pane */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {paneContent[activeTab]}
          </div>
        </div>
      </div>
    </div>
  );
}
