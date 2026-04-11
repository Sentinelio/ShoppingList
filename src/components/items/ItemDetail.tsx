import { useState, useEffect } from "react";
import type { Item } from "../../lib/supabase";
import ProductIcon from "../ui/ProductIcon";
import { getLangFlag } from "../../data/langs";
import { t } from "../../data/i18n";
import { getLabSelection, SHOW_VARIANTS } from "../../lib/itemDetailLab";
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
  const labSel = getLabSelection();
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

  const editVariants: React.ReactNode[] = [
    // v1: Classic Form — labels + inputs stacked
    <div key="e0" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <ProductIcon name={item.original} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }} className="truncate">{displayName}</div>
          {item.added_by_name && <div style={{ fontSize: 11, color: "#555d74" }}>{t(lang, "addedBy")} {item.added_by_name}</div>}
        </div>
      </div>
      {photoBlock}
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#555d74", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{t(lang, "qty")}</div>
        <div style={{ display: "flex", gap: 6 }}>
          <input type="number" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} onBlur={handleSave} placeholder="1" className="input" style={{ width: 60, textAlign: "center" }} />
          <select value={unit} onChange={e => { setUnit(e.target.value); setTimeout(() => onUpdate(item.id, { qty, unit: e.target.value, note }), 0); }} className="input" style={{ width: 70 }}>
            {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
          <input type="text" value={note} onChange={e => setNote(e.target.value)} onBlur={handleSave} placeholder={t(lang, "notePlaceholder")} className="input" style={{ flex: 1 }} />
        </div>
      </div>
      {importantBlock}
      {saveBtn}
    </div>,

    // v2: Stepper Buttons — big +/- for qty, centered emoji
    <div key="e1" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flex: 1, textAlign: "center" }}>
      <ProductIcon name={item.original} size={64} />
      <div style={{ fontSize: 18, fontWeight: 800 }}>{displayName}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "8px 0" }}>
        <button type="button" onClick={() => { const n = Math.max(0, Number(qty) - 1); setQty(String(n)); onUpdate(item.id, { qty: String(n), unit, note }); }}
          style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--color-card, #161b26)", border: "2px solid rgba(255,255,255,0.10)", fontSize: 20, color: "#8b92a8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
        <div>
          <span style={{ fontSize: 40, fontWeight: 900, color: "var(--color-accent, #f0883e)" }}>{qty || "0"}</span>
          <div style={{ fontSize: 11, color: "#8b92a8" }}>{UNITS.find(u => u.value === unit)?.label || "—"}</div>
        </div>
        <button type="button" onClick={() => { const n = Number(qty) + 1; setQty(String(n)); onUpdate(item.id, { qty: String(n), unit, note }); }}
          style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #f09848, #e07028)", border: "none", fontSize: 20, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center" }}>
        {UNITS.filter(u => u.value).map(u => (
          <button key={u.value} type="button" onClick={() => { setUnit(u.value); onUpdate(item.id, { qty, unit: u.value, note }); }}
            style={{ padding: "5px 12px", borderRadius: 8, background: unit === u.value ? "rgba(240,136,62,0.12)" : "var(--color-card, #161b26)", fontSize: 11, color: unit === u.value ? "var(--color-accent)" : "#555d74", fontWeight: 600, border: `1px solid ${unit === u.value ? "rgba(240,136,62,0.3)" : "var(--color-border)"}`, cursor: "pointer" }}>{u.label}</button>
        ))}
      </div>
      <input type="text" value={note} onChange={e => setNote(e.target.value)} onBlur={handleSave} placeholder={t(lang, "notePlaceholder")} className="input" style={{ width: "100%" }} />
      {photoBlock}
      {importantBlock}
      {saveBtn}
    </div>,

    // v3: All-in-one Row — compact
    <div key="e2" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--color-card, #161b26)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
        <ProductIcon name={item.original} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700 }} className="truncate">{displayName}</div>
          {showShelf && <div style={{ fontSize: 11, color: "var(--color-shelf)", fontWeight: 600 }}>{shelfName}</div>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        <input type="number" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} onBlur={handleSave} placeholder="1" className="input" style={{ width: 50, textAlign: "center" }} />
        <select value={unit} onChange={e => { setUnit(e.target.value); setTimeout(() => onUpdate(item.id, { qty, unit: e.target.value, note }), 0); }} className="input" style={{ width: 60 }}>
          {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
        </select>
        <input type="text" value={note} onChange={e => setNote(e.target.value)} onBlur={handleSave} placeholder={t(lang, "notePlaceholder")} className="input" style={{ flex: 1 }} />
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        <div style={{ flex: 1 }}>{importantBlock}</div>
      </div>
      {photoBlock}
      {saveBtn}
    </div>,

    // v4: Minimal Fields — no labels, just placeholders
    <div key="e3" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flex: 1, textAlign: "center" }}>
      <ProductIcon name={item.original} size={56} />
      {showShelf && <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-shelf, #e8c364)" }}>{shelfName}</div>}
      <div style={{ display: "flex", gap: 6, width: "100%", marginTop: 8 }}>
        <input type="number" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} onBlur={handleSave} placeholder={t(lang, "qty")} className="input" style={{ width: 60, textAlign: "center" }} />
        <select value={unit} onChange={e => { setUnit(e.target.value); setTimeout(() => onUpdate(item.id, { qty, unit: e.target.value, note }), 0); }} className="input" style={{ width: 50 }}>
          {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
        </select>
        <input type="text" value={note} onChange={e => setNote(e.target.value)} onBlur={handleSave} placeholder={t(lang, "notePlaceholder")} className="input" style={{ flex: 1 }} />
      </div>
      {importantBlock}
      {photoBlock}
      {saveBtn}
    </div>,

    // v5: Quick Presets — preset qty buttons
    <div key="e4" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
      <div style={{ textAlign: "center" }}>
        <ProductIcon name={item.original} size={40} />
        <span style={{ fontSize: 18, fontWeight: 800, marginLeft: 8, verticalAlign: "middle" }}>{displayName}</span>
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#555d74", textTransform: "uppercase", letterSpacing: "0.08em" }}>Cantidad rapida</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
        {(unit === "L" ? ["1L","2L","3L","500ml"] : unit === "kg" ? ["100g","250g","500g","1kg"] : ["1×","2×","3×","6×"]).map(p => {
          const match = p === `${qty}${unit}` || p === `${qty}×`;
          return (
            <button key={p} type="button" onClick={() => {
              const num = p.replace(/[^0-9.]/g, ""); const u = p.replace(/[0-9.]/g, "");
              setQty(num); const mapped = u === "×" ? "x" : u; setUnit(mapped);
              onUpdate(item.id, { qty: num, unit: mapped, note });
            }}
              style={{ padding: "10px 0", borderRadius: 10, textAlign: "center", fontSize: 12, fontWeight: 600, cursor: "pointer", background: match ? "rgba(240,136,62,0.12)" : "var(--color-card, #161b26)", color: match ? "var(--color-accent)" : "#555d74", border: `1px solid ${match ? "var(--color-accent)" : "var(--color-border)"}` }}>{p}</button>
          );
        })}
      </div>
      <input type="text" value={note} onChange={e => setNote(e.target.value)} onBlur={handleSave} placeholder={t(lang, "notePlaceholder")} className="input" />
      {photoBlock}
      {importantBlock}
      {saveBtn}
    </div>,
  ];

  const editPane = editVariants[labSel.edit] ?? editVariants[0];

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

  // ── PRICE / STATS / COMM / HIST PANES (5 variants each, mock data) ────
  // Mock data — matches lab. Real prices/comments/history tables coming soon.
  const prices = [
    { store: "Mercadona", price: "0.89€", date: "02 abr", best: false },
    { store: "Carrefour", price: "0.95€", date: "28 mar", best: false },
    { store: "Lidl", price: "0.79€", date: "25 mar", best: true },
    { store: "Biedronka", price: "3.49zl", date: "20 mar", best: false },
    { store: "Aldi", price: "0.92€", date: "15 mar", best: false },
  ];

  const priceVariants: React.ReactNode[] = [
    // v1: Simple List
    <div key="p0" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}><span style={{ fontSize: 24 }}>{emojiChar}</span> <span style={{ fontSize: 15, fontWeight: 700 }}>{displayName}</span></div>
      {prices.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: p.best ? "rgba(61,214,140,0.04)" : "var(--color-card, #161b26)", borderRadius: 10, border: `1px solid ${p.best ? "rgba(61,214,140,0.15)" : "var(--color-border, rgba(255,255,255,0.10))"}` }}>
          <span style={{ fontSize: 14 }}>{p.best ? "🏷" : "🏪"}</span>
          <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{p.store}</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: p.best ? "#3dd68c" : "var(--color-text)" }}>{p.price}</span>
          <span style={{ fontSize: 9, color: "#555d74" }}>{p.date}</span>
        </div>
      ))}
      <button type="button" style={{ marginTop: "auto", width: "100%", padding: "10px 0", borderRadius: 10, background: "transparent", border: "1.5px solid rgba(255,255,255,0.10)", color: "#8b92a8", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ Añadir precio</button>
    </div>,

    // v2: Best Deal
    <div key="p1" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
      <div style={{ textAlign: "center", padding: 16, background: "rgba(61,214,140,0.06)", borderRadius: 14, border: "1px solid rgba(61,214,140,0.15)" }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#3dd68c", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>🏷 Mejor precio</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#3dd68c" }}>0.79€</div>
        <div style={{ fontSize: 13, color: "#8b92a8", marginTop: 2 }}>Lidl · 25 mar</div>
      </div>
      <div style={{ flex: 1 }}>
        {prices.filter(p => p.store !== "Lidl").map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", fontSize: 12 }}>
            <span style={{ flex: 1, color: "#8b92a8" }}>{p.store}</span>
            <span style={{ fontWeight: 700 }}>{p.price}</span>
            <span style={{ fontSize: 9, color: "#555d74" }}>{p.date}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--color-card, #161b26)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.10)" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#555d74" }}>PRECIO MEDIO</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: "var(--color-accent, #f0883e)" }}>0.89€</span>
      </div>
      <button type="button" style={{ width: "100%", padding: "10px 0", borderRadius: 10, background: "transparent", border: "1.5px solid rgba(255,255,255,0.10)", color: "#8b92a8", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ Añadir precio</button>
    </div>,

    // v3: Store Cards
    <div key="p2" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
      {prices.map((p, i) => (
        <div key={i} style={{ padding: "10px 12px", background: "var(--color-card, #161b26)", borderRadius: 10, border: `1px solid ${p.best ? "rgba(61,214,140,0.2)" : "rgba(255,255,255,0.10)"}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: p.best ? "rgba(61,214,140,0.1)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{p.best ? "🏷" : "🏪"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{p.store}</div>
            <div style={{ fontSize: 9, color: "#555d74" }}>{p.date}</div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: p.best ? "#3dd68c" : "var(--color-text)" }}>{p.price}</div>
        </div>
      ))}
      <button type="button" style={{ marginTop: "auto", width: "100%", padding: "10px 0", borderRadius: 10, background: "transparent", border: "1.5px solid rgba(255,255,255,0.10)", color: "#8b92a8", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ Añadir</button>
    </div>,

    // v4: Savings Badge
    <div key="p3" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: 32 }}>{emojiChar}</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{displayName}</div>
      <div style={{ display: "flex", gap: 8, margin: "8px 0" }}>
        <div style={{ padding: "14px 18px", background: "rgba(61,214,140,0.08)", borderRadius: 14, border: "2px solid rgba(61,214,140,0.2)", textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#3dd68c", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Mejor</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#3dd68c" }}>0.79€</div>
          <div style={{ fontSize: 10, color: "#8b92a8", marginTop: 2 }}>Lidl</div>
        </div>
        <div style={{ padding: "14px 18px", background: "var(--color-card, #161b26)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#555d74", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Peor</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#ff5c5c" }}>0.95€</div>
          <div style={{ fontSize: 10, color: "#8b92a8", marginTop: 2 }}>Carrefour</div>
        </div>
      </div>
      <div style={{ padding: "8px 16px", borderRadius: 10, background: "rgba(61,214,140,0.06)", fontSize: 12, color: "#3dd68c", fontWeight: 700 }}>Ahorras 0.16€ comprando en Lidl</div>
      <button type="button" style={{ marginTop: "auto", width: "100%", padding: "10px 0", borderRadius: 10, background: "transparent", border: "1.5px solid rgba(255,255,255,0.10)", color: "#8b92a8", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ Añadir precio</button>
    </div>,

    // v5: Receipt Style
    <div key="p4" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, background: "var(--color-card, #161b26)", borderRadius: 8, padding: 14, border: "1px solid rgba(255,255,255,0.10)" }}>
        <div style={{ textAlign: "center", fontWeight: 700, marginBottom: 8, fontSize: 12 }}>💰 {displayName} — Historial</div>
        <div style={{ borderBottom: "1px dashed #555d74", marginBottom: 6, paddingBottom: 6 }}>
          {prices.map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: p.best ? "#3dd68c" : "#8b92a8" }}>
              <span>{p.store}</span><span style={{ fontWeight: 700 }}>{p.price}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 12 }}>
          <span>MEDIA</span><span style={{ color: "var(--color-accent, #f0883e)" }}>0.89€</span>
        </div>
      </div>
      <button type="button" style={{ marginTop: "auto", width: "100%", padding: "10px 0", borderRadius: 10, background: "transparent", border: "1.5px solid rgba(255,255,255,0.10)", color: "#8b92a8", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ Añadir</button>
    </div>,
  ];

  const pricePane = priceVariants[labSel.price] ?? priceVariants[0];

  // ── STATS PANE ────────────────────────────────────────────────────────
  const statsVariants: React.ReactNode[] = [
    // v1: Dashboard Grid
    <div key="s0" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
      <div style={{ textAlign: "center", marginBottom: 4 }}><span style={{ fontSize: 20 }}>{emojiChar}</span> <span style={{ fontSize: 14, fontWeight: 700 }}>{displayName}</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          { v: "23", l: "Compras", c: "var(--color-accent, #f0883e)" },
          { v: "~10d", l: "Frecuencia", c: "#3dd68c" },
          { v: "20.5€", l: "Total gastado", c: "#e8c364" },
          { v: "0.89€", l: "Precio medio", c: "#6c8aff" },
        ].map((s, i) => (
          <div key={i} style={{ padding: 14, background: "var(--color-card, #161b26)", borderRadius: 12, textAlign: "center", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 9, color: "#555d74", marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>,

    // v2: Spend Tracker
    <div key="s1" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: 32 }}>{emojiChar}</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{displayName}</div>
      <div style={{ padding: "18px 24px", background: "var(--color-card, #161b26)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", textAlign: "center", width: "100%" }}>
        <div style={{ fontSize: 9, color: "#555d74", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Total gastado</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: "var(--color-accent, #f0883e)" }}>20.47€</div>
        <div style={{ fontSize: 11, color: "#8b92a8", marginTop: 4 }}>en 23 compras</div>
      </div>
      <div style={{ display: "flex", gap: 6, width: "100%" }}>
        {[
          { l: "Este mes", v: "6.23€", c: "#3dd68c" },
          { l: "Mes pasado", v: "5.34€", c: "#8b92a8" },
          { l: "Media/mes", v: "5.12€", c: "#6c8aff" },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: 10, background: "var(--color-card, #161b26)", borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "#555d74" }}>{s.l}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>
    </div>,

    // v3: Compact Numbers
    <div key="s2" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ textAlign: "center", padding: "8px 0 12px" }}>
        <span style={{ fontSize: 28 }}>{emojiChar}</span>
        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{displayName}</div>
      </div>
      {[
        { l: "Compras totales", v: "23", c: "var(--color-accent, #f0883e)" },
        { l: "Frecuencia", v: "cada ~10 días", c: "#3dd68c" },
        { l: "Última compra", v: "hace 2 días", c: "var(--color-text)" },
        { l: "Precio medio", v: "0.89€", c: "#e8c364" },
        { l: "Total gastado", v: "20.47€", c: "var(--color-accent, #f0883e)" },
        { l: "Este mes", v: "7 compras · 6.23€", c: "#6c8aff" },
        { l: "Tienda favorita", v: "Mercadona (12x)", c: "var(--color-accent, #f0883e)" },
      ].map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 6px", borderBottom: i < 6 ? "1px solid rgba(255,255,255,0.06)" : "none", fontSize: 12 }}>
          <span style={{ color: "#555d74" }}>{r.l}</span>
          <span style={{ fontWeight: 700, color: r.c }}>{r.v}</span>
        </div>
      ))}
    </div>,

    // v4: Streak Counter
    <div key="s3" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: 32 }}>{emojiChar}</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{displayName}</div>
      <div style={{ padding: 16, background: "var(--color-card, #161b26)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", textAlign: "center", width: "100%" }}>
        <div style={{ fontSize: 9, color: "var(--color-accent, #f0883e)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>🔥 Racha actual</div>
        <div style={{ fontSize: 38, fontWeight: 900, color: "var(--color-accent, #f0883e)" }}>6</div>
        <div style={{ fontSize: 11, color: "#8b92a8" }}>semanas comprando</div>
      </div>
      <div style={{ display: "flex", gap: 4, width: "100%", justifyContent: "center" }}>
        {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
          <div key={i} style={{ width: 28, height: 28, borderRadius: 8, background: i === 5 ? "#3dd68c" : "var(--color-card, #161b26)", border: `1px solid ${i === 5 ? "#3dd68c" : "rgba(255,255,255,0.10)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, color: i === 5 ? "#fff" : "#555d74" }}>{d}</div>
        ))}
      </div>
      <div style={{ fontSize: 10, color: "#555d74", marginTop: 2 }}>Último sábado · Mercadona</div>
    </div>,

    // v5: Who Buys
    <div key="s4" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
      <div style={{ textAlign: "center" }}><span style={{ fontSize: 20 }}>{emojiChar}</span> <span style={{ fontSize: 14, fontWeight: 700 }}>{displayName}</span></div>
      {[
        { who: "Manu", flag: "🇪🇸", n: 15, c: "var(--color-accent, #f0883e)", pct: 65 },
        { who: "Kasia", flag: "🇵🇱", n: 8, c: "#6c8aff", pct: 35 },
      ].map((m, i) => (
        <div key={i} style={{ padding: 12, background: "var(--color-card, #161b26)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: m.c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>{m.who[0]}</div>
            <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{m.who} {m.flag}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: m.c }}>{m.n}x</span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${m.pct}%`, background: m.c, borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 9, color: "#555d74", marginTop: 4, textAlign: "right" }}>{m.pct}% de las compras</div>
        </div>
      ))}
    </div>,
  ];

  const statsPane = statsVariants[labSel.stats] ?? statsVariants[0];

  // ── COMMENTS PANE ─────────────────────────────────────────────────────
  const mockComments = [
    { who: "Manu", flag: "🇪🇸", color: "var(--color-accent, #f0883e)", text: "Que sea entera, no desnatada", t: "hace 1h" },
    { who: "Kasia", flag: "🇵🇱", color: "#6c8aff", text: "Laciate si hay, si no cualquiera 3.2%", t: "hace 45m" },
    { who: "Manu", flag: "🇪🇸", color: "var(--color-accent, #f0883e)", text: "En Mercadona está en el pasillo 3", t: "hace 30m" },
    { who: "Kasia", flag: "🇵🇱", color: "#6c8aff", text: "Ok 👍", t: "hace 28m" },
  ];

  const commInputRow = (placeholder: string, btnBg: string, btnIcon: string) => (
    <div style={{ marginTop: "auto", display: "flex", gap: 6, paddingTop: 8 }}>
      <input className="input" placeholder={placeholder} style={{ flex: 1, fontSize: 12, padding: "8px 12px" }} />
      <button type="button" style={{ padding: "8px 14px", borderRadius: 10, background: btnBg, border: "none", color: "#fff", fontSize: 14, cursor: "pointer" }}>{btnIcon}</button>
    </div>
  );

  const commVariants: React.ReactNode[] = [
    // v1: Chat Bubbles
    <div key="c0" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
      <div style={{ fontSize: 10, color: "#555d74", textAlign: "center", marginBottom: 4 }}>💬 Conversación sobre {displayName}</div>
      {mockComments.map((c, i) => (
        <div key={i} style={{ maxWidth: "85%", alignSelf: i % 2 ? "flex-start" : "flex-end", padding: "8px 12px", borderRadius: i % 2 ? "12px 12px 12px 4px" : "12px 12px 4px 12px", background: i % 2 ? "rgba(108,138,255,0.08)" : "rgba(240,136,62,0.08)", border: `1px solid ${i % 2 ? "rgba(108,138,255,0.12)" : "rgba(240,136,62,0.12)"}` }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: c.color }}>{c.flag} {c.who}</div>
          <div style={{ fontSize: 12, color: "#8b92a8", marginTop: 2 }}>{c.text}</div>
          <div style={{ fontSize: 8, color: "#555d74", textAlign: "right", marginTop: 2 }}>{c.t}</div>
        </div>
      ))}
      {commInputRow("Escribe un comentario...", "linear-gradient(135deg,#f09848,#e07028)", "→")}
    </div>,

    // v2: Card Comments
    <div key="c1" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
      {mockComments.map((c, i) => (
        <div key={i} style={{ padding: "10px 12px", background: "var(--color-card, #161b26)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#fff" }}>{c.who[0]}</div>
            <span style={{ fontSize: 11, fontWeight: 700 }}>{c.who}</span>
            <span style={{ fontSize: 9, color: "#555d74", marginLeft: "auto" }}>{c.t}</span>
          </div>
          <div style={{ fontSize: 12, color: "#8b92a8" }}>{c.text}</div>
        </div>
      ))}
      {commInputRow("💬 Comentar...", "var(--color-accent, #f0883e)", "→")}
    </div>,

    // v3: Minimal Lines
    <div key="c2" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
      {mockComments.map((c, i) => (
        <div key={i} style={{ padding: "8px 4px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 12, color: "#8b92a8" }}>{c.text}</div>
          <div style={{ fontSize: 9, color: "#555d74", marginTop: 2 }}>— {c.who} {c.flag} · {c.t}</div>
        </div>
      ))}
      {commInputRow("Añadir nota...", "var(--color-accent, #f0883e)", "→")}
    </div>,

    // v4: Color Left Bar
    <div key="c3" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
      {mockComments.map((c, i) => (
        <div key={i} style={{ display: "flex", borderRadius: 8, overflow: "hidden", background: "var(--color-card, #161b26)" }}>
          <div style={{ width: 3, background: c.color, flexShrink: 0 }} />
          <div style={{ flex: 1, padding: "8px 12px" }}>
            <div style={{ fontSize: 12, color: "#8b92a8" }}>{c.text}</div>
            <div style={{ fontSize: 9, color: "#555d74", marginTop: 2 }}>{c.who} · {c.t}</div>
          </div>
        </div>
      ))}
      {commInputRow("Mensaje...", "var(--color-accent, #f0883e)", "→")}
    </div>,

    // v5: Sticky Notes
    <div key="c4" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
      {mockComments.map((c, i) => (
        <div key={i} style={{ padding: "10px 12px", borderRadius: 4, background: i % 2 ? "rgba(108,138,255,0.08)" : "rgba(240,136,62,0.08)", transform: `rotate(${i % 2 ? "-1" : "0.5"}deg)`, boxShadow: "2px 3px 8px rgba(0,0,0,0.2)" }}>
          <div style={{ fontSize: 12, color: "var(--color-text)" }}>{c.text}</div>
          <div style={{ fontSize: 9, color: "#555d74", marginTop: 4, textAlign: "right" }}>— {c.who} · {c.t}</div>
        </div>
      ))}
      {commInputRow("Nueva nota...", "var(--color-accent, #f0883e)", "📌")}
    </div>,
  ];

  const commPane = commVariants[labSel.comm] ?? commVariants[0];

  // ── HISTORY PANE ──────────────────────────────────────────────────────
  const events = [
    { t: "Ahora", icon: "📍", text: "Estás viendo este item", color: "var(--color-accent, #f0883e)" },
    { t: "Hace 10m", icon: "✏️", text: "Manu cambió qty a 2L", color: "#6c8aff" },
    { t: "Hace 30m", icon: "❗", text: "Kasia marcó como importante", color: "#ff5c5c" },
    { t: "Hace 1h", icon: "📝", text: "Manu añadió nota", color: "#c76dff" },
    { t: "Hace 2h", icon: "➕", text: `Manu añadió ${displayName} a la lista`, color: "#3dd68c" },
    { t: "Hace 3h", icon: "🌍", text: "Traducción automática completada", color: "#34d6c0" },
  ];

  const histVariants: React.ReactNode[] = [
    // v1: Timeline Dots
    <div key="h0" style={{ padding: "12px 16px 12px 32px", position: "relative", flex: 1 }}>
      <div style={{ position: "absolute", left: 22, top: 36, bottom: 16, width: 2, background: "rgba(255,255,255,0.06)" }} />
      {events.map((e, i) => (
        <div key={i} style={{ position: "relative", padding: "6px 0 14px 16px" }}>
          <div style={{ position: "absolute", left: -6, top: 10, width: 10, height: 10, borderRadius: "50%", background: e.color, border: "2px solid var(--color-bg, #0d1017)" }} />
          <div style={{ fontSize: 9, color: "#555d74" }}>{e.t}</div>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{e.icon} {e.text}</div>
        </div>
      ))}
    </div>,

    // v2: Activity Feed
    <div key="h1" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
      {events.map((e, i) => (
        <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", background: "var(--color-card, #161b26)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", alignItems: "flex-start" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${e.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{e.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{e.text}</div>
            <div style={{ fontSize: 9, color: "#555d74", marginTop: 1 }}>{e.t}</div>
          </div>
        </div>
      ))}
    </div>,

    // v3: Compact Log
    <div key="h2" style={{ padding: "12px 16px", flex: 1 }}>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10 }}>
        {events.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
            <span style={{ color: "#555d74", whiteSpace: "nowrap", minWidth: 60 }}>{e.t}</span>
            <span>{e.icon}</span>
            <span style={{ color: "#8b92a8" }}>{e.text}</span>
          </div>
        ))}
      </div>
    </div>,

    // v4: Color Bar Left
    <div key="h3" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
      {events.map((e, i) => (
        <div key={i} style={{ display: "flex", alignItems: "stretch", borderRadius: 8, overflow: "hidden", background: "var(--color-card, #161b26)" }}>
          <div style={{ width: 4, background: e.color, flexShrink: 0 }} />
          <div style={{ flex: 1, padding: "9px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>{e.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#8b92a8", flex: 1 }}>{e.text}</span>
            <span style={{ fontSize: 9, color: "#555d74" }}>{e.t}</span>
          </div>
        </div>
      ))}
    </div>,

    // v5: Diff View
    <div key="h4" style={{ padding: "12px 16px", flex: 1 }}>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, background: "#0a0a0a", borderRadius: 10, padding: 12, border: "1px solid #222" }}>
        <div style={{ color: "#666", marginBottom: 6 }}>--- {displayName.toLowerCase()}.history</div>
        <div style={{ color: "#3dd68c" }}>+ qty: 2L <span style={{ color: "#666" }}>// Manu, 10m ago</span></div>
        <div style={{ color: "#ff5c5c" }}>- qty: 1L</div>
        <div style={{ margin: "4px 0", borderTop: "1px solid #222" }} />
        <div style={{ color: "#3dd68c" }}>+ important: true <span style={{ color: "#666" }}>// Kasia, 30m ago</span></div>
        <div style={{ color: "#ff5c5c" }}>- important: false</div>
        <div style={{ margin: "4px 0", borderTop: "1px solid #222" }} />
        <div style={{ color: "#3dd68c" }}>+ note: "pelne" <span style={{ color: "#666" }}>// Manu, 1h ago</span></div>
        <div style={{ margin: "4px 0", borderTop: "1px solid #222" }} />
        <div style={{ color: "#3dd68c" }}>+ created <span style={{ color: "#666" }}>// Manu, 2h ago</span></div>
      </div>
    </div>,
  ];

  const histPane = histVariants[labSel.hist] ?? histVariants[0];

  const paneContent: Record<DetailTab, React.ReactNode> = {
    show: showPane,
    edit: editPane,
    trans: transPane,
    del: delPane,
    price: pricePane,
    stats: statsPane,
    comm: commPane,
    hist: histPane,
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
