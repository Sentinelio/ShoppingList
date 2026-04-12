import { useState, useEffect } from "react";
import type { Item } from "../../lib/supabase";
import { getLangFlag } from "../../data/langs";
import { t } from "../../data/i18n";
import { getLabSelection, SHOW_VARIANTS } from "../../lib/itemDetailLab";
import { useStorePhrases } from "../../hooks/useStorePhrases";
import { incrementPhraseUsage } from "../../lib/storePhrasesStore";
import { matchProductEmoji } from "../../lib/emojiMatcher";
import { useItemPrices, useItemComments, useItemHistory } from "../../hooks/useItemData";
import { addItemPrice, deleteItemPrice, addItemComment, deleteItemComment, computeItemStats, relativeTime, formatPrice, getCountryCurrency, getCountryPopularStore } from "../../lib/itemData";
import { useAuth } from "../../hooks/useAuth";
import { translateProduct } from "../../lib/translate";
import { getEnabledLangs } from "../../lib/langConfig";

interface ItemDetailProps {
  item: Item | null;
  open: boolean;
  onClose: () => void;
  userLang: string;
  shelfLang: string;
  countryFlag?: string;
  onUpdate: (itemId: string, updates: Partial<Pick<Item, "qty" | "unit" | "note" | "photo" | "important" | "original" | "translations" | "brand">>) => void;
  onDelete: (itemId: string) => void;
  onShowStore: (item: Item) => void;
  lang?: string;
}

const UNITS = [
  { value: "", label: "\u2014" },
  { value: "x", label: "uds" },
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
  const [editName, setEditName] = useState("");
  const [brand, setBrand] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [saved, setSaved] = useState(false);
  const [_deleteStep, setDeleteStep] = useState<0 | 1>(0);
  void _deleteStep; // used only for reset in useEffect
  const [activeTab, setActiveTab] = useState<DetailTab>("show");
  const [activePhrase, setActivePhrase] = useState<string | null>(null);
  const [showPhraseList, setShowPhraseList] = useState(false);
  const phrases = useStorePhrases();
  const labSel = getLabSelection();
  const sv = SHOW_VARIANTS[labSel.show] ?? SHOW_VARIANTS[0];

  // ── Real per-item data (prices, comments, history) ───────────────────
  const { user } = useAuth();
  const itemId = item?.id;
  const prices = useItemPrices(itemId);
  const comments = useItemComments(itemId);
  const history = useItemHistory(itemId);
  const stats = computeItemStats(prices);

  // Add price form state
  const [showAddPriceForm, setShowAddPriceForm] = useState(false);
  const [newPriceStore, setNewPriceStore] = useState("");
  const [newPriceValue, setNewPriceValue] = useState("");
  const userCurrency = getCountryCurrency(user?.country);
  const userPopularStore = getCountryPopularStore(user?.country);
  const [newPriceCurrency, setNewPriceCurrency] = useState(userCurrency);

  // Comment input state
  const [newCommentText, setNewCommentText] = useState("");

  // Reset add-price form when item changes
  useEffect(() => {
    setShowAddPriceForm(false);
    setNewPriceStore("");
    setNewPriceValue("");
    setNewPriceCurrency(userCurrency);
    setNewCommentText("");
  }, [item?.id, userCurrency]);

  // Helper to extract readable error message from Supabase/any error
  const errMsg = (err: unknown): string => {
    if (err instanceof Error) return err.message;
    if (typeof err === "object" && err !== null) {
      const e = err as { message?: string; details?: string; hint?: string; code?: string };
      return [e.message, e.details, e.hint, e.code].filter(Boolean).join(" | ") || JSON.stringify(err);
    }
    return String(err);
  };

  const handleAddPrice = async () => {
    if (!user || !item || !newPriceStore.trim() || !newPriceValue.trim()) return;
    const value = parseFloat(newPriceValue.replace(",", "."));
    if (isNaN(value)) return;
    // Normalize store name: first letter of each word uppercased for consistency
    const normalizedStore = newPriceStore.trim().replace(/\b\p{L}/gu, c => c.toUpperCase());
    try {
      await addItemPrice({
        itemId: item.id,
        store: normalizedStore,
        price: value,
        currency: newPriceCurrency,
        addedBy: user.id,
        addedByName: user.name,
      });
      setNewPriceStore("");
      setNewPriceValue("");
      setShowAddPriceForm(false);
    } catch (err) {
      console.error("[addItemPrice] failed:", err);
      alert("Error al guardar precio: " + errMsg(err));
    }
  };

  const handleDeletePrice = async (priceId: string) => {
    try { await deleteItemPrice(priceId); } catch (err) { console.error("[deleteItemPrice]", err); }
  };

  const handleAddComment = async () => {
    if (!user || !item || !newCommentText.trim()) return;
    try {
      await addItemComment({
        itemId: item.id,
        text: newCommentText.trim(),
        addedBy: user.id,
        addedByName: user.name,
        addedByLang: user.lang,
      });
      setNewCommentText("");
    } catch (err) {
      console.error("[addItemComment] failed:", err);
      alert("Error al añadir comentario: " + errMsg(err));
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try { await deleteItemComment(commentId); } catch (err) { console.error("[deleteItemComment]", err); }
  };

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
      setEditName(item.original || "");
      setBrand(item.brand || "");
      setEditingPhoto(false);
      setPhotoUrl("");
      setSaved(false);
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

  // Check if any edit field has changed
  const nameChanged = editName.trim() !== "" && editName.trim() !== item.original;
  const brandChanged = brand.trim() !== (item.brand || "");
  const qtyChanged = qty !== (item.qty || "");
  const unitChanged = unit !== (item.unit || "");
  const noteChanged = note !== (item.note || "");
  const isDirty = nameChanged || brandChanged || qtyChanged || unitChanged || noteChanged;

  const handleSave = async () => {
    const updates: Partial<Record<string, unknown>> = {};

    // Always save qty/unit/note/brand
    if (qtyChanged) updates.qty = qty;
    if (unitChanged) updates.unit = unit;
    if (noteChanged) updates.note = note;
    if (brandChanged) updates.brand = brand.trim();

    // If name changed, re-translate fully
    if (nameChanged) {
      const trimmed = editName.trim();
      updates.original = trimmed;
      const targetLangs = getEnabledLangs();
      let newTranslations: Record<string, string> = { [userLang]: trimmed, en: trimmed };
      try {
        const result = await translateProduct(trimmed, targetLangs, userLang);
        if (result?.translations) newTranslations = result.translations;
      } catch { /* fall back */ }
      updates.translations = newTranslations;
      updates.photo = null; // clear photo since product changed
    }

    if (Object.keys(updates).length > 0) {
      onUpdate(item.id, updates as Parameters<typeof onUpdate>[1]);
      // Show saved feedback
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

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
        {item.brand && (
          <div style={{ fontSize: 11, color: "#8b92a8", marginTop: 4, fontStyle: "italic" }}>
            {item.brand}
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
        {/* Google Images button */}
        <a
          href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent((shelfName || displayName) + (item.brand ? " " + item.brand : ""))}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            margin: "8px 12px 0",
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(66,133,244,0.08)",
            border: "1px solid rgba(66,133,244,0.25)",
            color: "#6c9dff",
            fontSize: 12,
            fontWeight: 700,
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          🔍 Ver en Google Images
        </a>
      </div>
    </div>
  );

  // ── EDIT PANE (5 variants synced from lab) ───────────────────────────────
  // Shared lab-style CSS values for edit variants
  const labLabel: React.CSSProperties = { fontSize: 9, fontWeight: 700, color: "#555d74", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 };
  const labInput: React.CSSProperties = { background: "var(--color-card, #161b26)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "var(--color-text, #e6e8ee)", width: "100%", fontFamily: "inherit", outline: "none" };
  const labBtn: React.CSSProperties = { padding: 14, borderRadius: 12, background: "linear-gradient(135deg,#f09848,#e07028)", color: "#fff", fontWeight: 700, fontSize: 15, border: "none", width: "100%", cursor: "pointer", fontFamily: "inherit" };
  const saveBtn = (
    <button type="button" onClick={handleSave} disabled={!isDirty && !saved}
      style={{
        ...labBtn,
        opacity: isDirty ? 1 : 0.4,
        cursor: isDirty ? "pointer" : "default",
        background: saved ? "linear-gradient(135deg, #3dd68c, #2ab573)" : labBtn.background,
        transition: "background 0.3s, opacity 0.3s",
      }}>
      {saved ? "✅ Guardado" : "💾 Guardar"}
    </button>
  );

  // Shared edit header: name input + photo button (matches lab editHeader)
  const editHeader = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 28 }}>{emojiChar}</span>
        <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
          style={{ ...labInput, flex: 1, fontSize: 16, fontWeight: 700, padding: "6px 10px" }} />
      </div>
      {!editingPhoto ? (
        <button type="button" onClick={() => setEditingPhoto(true)}
          style={{ width: "100%", padding: "8px 0", borderRadius: 10, background: "transparent", border: "1.5px solid rgba(255,255,255,0.10)", color: "#8b92a8", fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginBottom: 6 }}>
          {item.photo ? "📷 Cambiar foto" : "🔗 Añadir URL de foto"}
        </button>
      ) : (
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input type="text" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://..." autoFocus
            onKeyDown={e => { if (e.key === "Enter") savePhotoUrl(); if (e.key === "Escape") setEditingPhoto(false); }}
            style={{ ...labInput, flex: 1, fontSize: 12, padding: "8px 10px" }} />
          <button type="button" onClick={savePhotoUrl} style={{ padding: "8px 14px", borderRadius: 10, background: "linear-gradient(135deg,#f09848,#e07028)", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>OK</button>
        </div>
      )}
      {item.photo && <img src={item.photo} style={{ width: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", marginBottom: 6 }} alt="" />}
      <div style={labLabel}>Marca</div>
      <input type="text" value={brand} onChange={e => setBrand(e.target.value)}
        placeholder="Ej: Hacendado, Lidl, Himalaya..."
        style={{ ...labInput, marginBottom: 6, fontSize: 13, padding: "10px 14px" }} />
    </>
  );

  const editVariants: React.ReactNode[] = [
    // v1: Classic Form — pixel-perfect match with lab HTML
    <div key="e0" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
      {editHeader}
      <div>
        <div style={labLabel}>Cantidad</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="number" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)}placeholder="1"
            style={{ ...labInput, width: 70, textAlign: "center", flex: "none" }} />
          <select value={unit} onChange={e => { setUnit(e.target.value); setTimeout(() => onUpdate(item.id, { qty, unit: e.target.value, note }), 0); }}
            style={{ ...labInput, flex: 1, appearance: "none", WebkitAppearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath fill='%238b92a8' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: 30 }}>
            {UNITS.map(u => <option key={u.value} value={u.value} style={{ background: "#0d1017", color: "#e6e8ee" }}>{u.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <div style={labLabel}>Nota</div>
        <input type="text" value={note} onChange={e => setNote(e.target.value)}placeholder={t(lang, "notePlaceholder")}
          style={labInput} />
      </div>
      <div>
        <div style={labLabel}>Prioridad</div>
        <button type="button" onClick={() => onUpdate(item.id, { important: !item.important })}
          style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 11, width: "100%",
            border: `1.5px solid ${item.important ? "rgba(255,92,92,0.2)" : "rgba(255,255,255,0.10)"}`,
            background: item.important ? "rgba(255,92,92,0.04)" : "transparent", cursor: "pointer", fontFamily: "inherit",
          }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: item.important ? "#ff5c5c" : "#555d74", boxShadow: item.important ? "0 0 6px rgba(255,92,92,0.4)" : "none" }} />
          <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: item.important ? "#ff5c5c" : "var(--color-text, #e6e8ee)", textAlign: "left" }}>Importante</span>
          {/* Toggle switch */}
          <span style={{
            width: 40, height: 22, borderRadius: 11, position: "relative",
            background: item.important ? "#ff5c5c" : "rgba(255,255,255,0.12)",
            display: "inline-block", transition: "background 0.2s", flexShrink: 0,
          }}>
            <span style={{
              position: "absolute", top: 3, left: item.important ? 20 : 3,
              width: 16, height: 16, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }} />
          </span>
        </button>
      </div>
      <div style={{ marginTop: "auto" }}>
        <button type="button" onClick={handleSave} style={labBtn}>💾 Guardar</button>
      </div>
    </div>,

    // v2: Stepper Buttons — Botones +/- grandes (1:1 with lab)
    <div key="e1" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flex: 1, textAlign: "center" }}>
      {editHeader}
      <span style={{ fontSize: 36 }}>{emojiChar}</span>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{displayName}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "12px 0" }}>
        <button type="button" onClick={() => { const n = Math.max(0, Number(qty) - 1); setQty(String(n)); onUpdate(item.id, { qty: String(n), unit, note }); }}
          style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--color-card, #161b26)", border: "2px solid rgba(255,255,255,0.10)", fontSize: 20, color: "#8b92a8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>−</button>
        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: 40, fontWeight: 900, color: "var(--color-accent, #f0883e)" }}>{qty || "0"}</span>
          <div style={{ fontSize: 11, color: "#8b92a8" }}>{UNITS.find(u => u.value === unit)?.label || "—"}</div>
        </div>
        <button type="button" onClick={() => { const n = Number(qty) + 1; setQty(String(n)); onUpdate(item.id, { qty: String(n), unit, note }); }}
          style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #f09848, #e07028)", border: "none", fontSize: 20, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>+</button>
      </div>
      <input type="text" value={note} onChange={e => setNote(e.target.value)}placeholder={`📝 ${t(lang, "notePlaceholder")}`} className="input" style={{ width: "100%", marginTop: 8 }} />
      {saveBtn}
    </div>,

    // v3: All-in-one Row — Todo compacto (1:1 with lab)
    <div key="e2" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
      {editHeader}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--color-card, #161b26)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
        <span style={{ fontSize: 28 }}>{emojiChar}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700 }} className="truncate">{displayName}</div>
          {showShelf && <div style={{ fontSize: 11, color: "var(--color-shelf, #e8c364)", fontWeight: 600 }}>{shelfName}</div>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input type="number" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)}placeholder="1" className="input" style={{ width: 50, textAlign: "center" }} />
        <select value={unit} onChange={e => { setUnit(e.target.value); setTimeout(() => onUpdate(item.id, { qty, unit: e.target.value, note }), 0); }} className="input" style={{ width: 60 }}>
          {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
        </select>
        <input type="text" value={note} onChange={e => setNote(e.target.value)}placeholder={`📝 ${t(lang, "notePlaceholder")}`} className="input" style={{ flex: 1 }} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" onClick={() => onUpdate(item.id, { important: !item.important })}
          style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${item.important ? "rgba(255,92,92,0.3)" : "rgba(255,255,255,0.10)"}`, background: item.important ? "rgba(255,92,92,0.06)" : "var(--color-card, #161b26)", textAlign: "center", fontSize: 12, fontWeight: 600, cursor: "pointer", color: item.important ? "#ff5c5c" : "#8b92a8", fontFamily: "inherit" }}>
          ❗ Importante
        </button>
        <button type="button" onClick={() => setEditingPhoto(true)}
          style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.10)", background: "var(--color-card, #161b26)", textAlign: "center", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#8b92a8", fontFamily: "inherit" }}>
          📷 Foto
        </button>
      </div>
      {saveBtn}
    </div>,

    // v4: Minimal Fields — Sin labels, solo placeholders (1:1 with lab)
    <div key="e3" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flex: 1, textAlign: "center" }}>
      {editHeader}
      <span style={{ fontSize: 40 }}>{emojiChar}</span>
      {showShelf && <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-shelf, #e8c364)" }}>{shelfName}</div>}
      <div style={{ display: "flex", gap: 6, width: "100%", marginTop: 8 }}>
        <input type="number" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)}placeholder="Qty" className="input" style={{ width: 60, textAlign: "center" }} />
        <input type="text" value={unit} onChange={e => setUnit(e.target.value)}placeholder="Unit" className="input" style={{ width: 50, textAlign: "center" }} />
        <input type="text" value={note} onChange={e => setNote(e.target.value)}placeholder="Nota..." className="input" style={{ flex: 1 }} />
      </div>
      <div style={{ display: "flex", gap: 6, width: "100%" }}>
        <button type="button" onClick={() => onUpdate(item.id, { important: !item.important })}
          style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${item.important ? "rgba(255,92,92,0.2)" : "rgba(255,255,255,0.10)"}`, background: item.important ? "rgba(255,92,92,0.1)" : "var(--color-card, #161b26)", fontSize: 12, fontWeight: 600, color: item.important ? "#ff5c5c" : "#8b92a8", cursor: "pointer", fontFamily: "inherit" }}>
          ❗ Imp.
        </button>
        <button type="button" onClick={() => setEditingPhoto(true)}
          style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.10)", background: "var(--color-card, #161b26)", fontSize: 12, fontWeight: 600, color: "#8b92a8", cursor: "pointer", fontFamily: "inherit" }}>
          📷 Foto
        </button>
      </div>
      <div style={{ marginTop: "auto", width: "100%" }}>{saveBtn}</div>
    </div>,

    // v5: Quick Presets — Botones rapidos (1:1 with lab)
    <div key="e4" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
      {editHeader}
      <div style={{ textAlign: "center" }}>
        <span style={{ fontSize: 28 }}>{emojiChar}</span>{" "}
        <span style={{ fontSize: 18, fontWeight: 800, verticalAlign: "middle" }}>{displayName}</span>
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#555d74", textTransform: "uppercase", letterSpacing: "0.08em" }}>Cantidad rapida</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        {(unit === "L" || !unit ? ["1L","2L","3L","500ml","250ml","Custom"] : unit === "kg" ? ["100g","250g","500g","1kg","2kg","Custom"] : ["1×","2×","3×","6×","10×","Custom"]).map(p => {
          const isCustom = p === "Custom";
          const match = !isCustom && (p === `${qty}${unit}` || p === `${qty}×`);
          return (
            <button key={p} type="button" onClick={() => {
              if (isCustom) return;
              const num = p.replace(/[^0-9.]/g, ""); const u = p.replace(/[0-9.]/g, "");
              setQty(num); const mapped = u === "×" ? "x" : u; setUnit(mapped);
              onUpdate(item.id, { qty: num, unit: mapped, note });
            }}
              style={{ padding: 10, borderRadius: 10, textAlign: "center", fontSize: 12, fontWeight: 600, cursor: "pointer", background: match ? "rgba(240,136,62,0.12)" : "var(--color-card, #161b26)", color: match ? "var(--color-accent, #f0883e)" : "#8b92a8", border: `1px solid ${match ? "var(--color-accent, #f0883e)" : "var(--color-border, rgba(255,255,255,0.10))"}`, fontFamily: "inherit" }}>{p}</button>
          );
        })}
      </div>
      <div style={{ marginTop: 4 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#555d74", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Nota</div>
        <input type="text" value={note} onChange={e => setNote(e.target.value)}placeholder={t(lang, "notePlaceholder")} className="input" />
      </div>
      <div style={{ marginTop: "auto" }}>{saveBtn}</div>
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

  // ── PRICE / STATS / COMM / HIST PANES — REAL DATA from Supabase ────
  // Filter to only manual price entries (skip auto-logged purchases from "done")
  const pricedEntries = prices.filter(p => p.price_value !== null && p.store !== null);
  const cheapestId = stats.bestPrice !== null ? pricedEntries.find(p => Number(p.price_value) === stats.bestPrice)?.id : null;
  const displayPrices = pricedEntries.map(p => ({
    id: p.id,
    store: p.store as string,
    price: formatPrice(Number(p.price_value), p.currency),
    date: relativeTime(p.created_at),
    best: p.id === cheapestId,
  }));
  const emptyPriceMessage = (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: "#555d74", fontSize: 12, textAlign: "center", padding: 20 }}>
      <span style={{ fontSize: 32, opacity: 0.4 }}>💰</span>
      <span>No hay precios todavía.<br/>Añade el primero.</span>
    </div>
  );

  // Add price form (shown when user clicks "+ Añadir precio")
  const addPriceFormBlock = showAddPriceForm ? (
    <div style={{ padding: 10, background: "var(--color-card, #161b26)", borderRadius: 10, border: "1px solid var(--color-accent, #f0883e)", display: "flex", flexDirection: "column", gap: 6 }}>
      <input type="text" value={newPriceStore} onChange={e => setNewPriceStore(e.target.value)} placeholder={`Tienda (ej: ${userPopularStore})`} className="input" style={{ fontSize: 12, padding: "8px 10px" }} autoFocus />
      <div style={{ display: "flex", gap: 6 }}>
        <input type="number" inputMode="decimal" value={newPriceValue} onChange={e => setNewPriceValue(e.target.value)} placeholder="0.99" className="input" style={{ flex: 1, fontSize: 12, padding: "8px 10px", textAlign: "left" }} />
        <select
          value={newPriceCurrency}
          onChange={e => setNewPriceCurrency(e.target.value)}
          style={{
            fontSize: 12,
            padding: "8px 10px",
            width: 80,
            background: "#0d1017",
            color: "#e6e8ee",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 8,
            fontFamily: "inherit",
            cursor: "pointer",
            appearance: "none",
            WebkitAppearance: "none",
            MozAppearance: "none",
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%238b92a8' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 8px center",
            paddingRight: 22,
          }}
        >
          {["EUR", "USD", "GBP", "PLN", "CZK", "HUF", "RON", "SEK", "NOK", "DKK", "CHF", "JPY", "CNY", "CAD", "AUD", "MXN", "BRL", "ARS", "CLP", "COP", "PEN", "TRY", "INR", "ZAR"].map(c => (
            <option key={c} value={c} style={{ background: "#0d1017", color: "#e6e8ee" }}>
              {c} {c === "EUR" ? "€" : c === "USD" ? "$" : c === "GBP" ? "£" : c === "PLN" ? "zł" : c === "JPY" ? "¥" : ""}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" onClick={() => { setShowAddPriceForm(false); setNewPriceStore(""); setNewPriceValue(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.10)", color: "#8b92a8", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
        <button type="button" onClick={handleAddPrice} disabled={!newPriceStore.trim() || !newPriceValue.trim()} style={{ flex: 1, padding: "8px 0", borderRadius: 8, background: "linear-gradient(135deg,#f09848,#e07028)", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: (!newPriceStore.trim() || !newPriceValue.trim()) ? 0.5 : 1 }}>Guardar</button>
      </div>
    </div>
  ) : null;

  const addPriceButton = !showAddPriceForm ? (
    <button type="button" onClick={() => setShowAddPriceForm(true)} style={{ marginTop: "auto", width: "100%", padding: "10px 0", borderRadius: 10, background: "transparent", border: "1.5px solid rgba(255,255,255,0.10)", color: "#8b92a8", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ Añadir precio</button>
  ) : null;

  const priceVariants: React.ReactNode[] = [
    // v1: Simple List
    <div key="p0" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4, flex: 1, overflow: "auto" }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}><span style={{ fontSize: 24 }}>{emojiChar}</span> <span style={{ fontSize: 15, fontWeight: 700 }}>{displayName}</span></div>
      {displayPrices.length === 0 ? emptyPriceMessage : displayPrices.map(p => (
        <div key={p.id} onDoubleClick={() => handleDeletePrice(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: p.best ? "rgba(61,214,140,0.04)" : "var(--color-card, #161b26)", borderRadius: 10, border: `1px solid ${p.best ? "rgba(61,214,140,0.15)" : "var(--color-border, rgba(255,255,255,0.10))"}` }}>
          <span style={{ fontSize: 14 }}>{p.best ? "🏷" : "🏪"}</span>
          <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{p.store}</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: p.best ? "#3dd68c" : "var(--color-text)" }}>{p.price}</span>
          <span style={{ fontSize: 9, color: "#555d74" }}>{p.date}</span>
        </div>
      ))}
      {addPriceFormBlock}
      {addPriceButton}
    </div>,

    // v2: Best Deal
    <div key="p1" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10, flex: 1, overflow: "auto" }}>
      {stats.bestPrice !== null && stats.bestStore && (
        <div style={{ textAlign: "center", padding: 16, background: "rgba(61,214,140,0.06)", borderRadius: 14, border: "1px solid rgba(61,214,140,0.15)" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#3dd68c", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>🏷 Mejor precio</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#3dd68c" }}>{formatPrice(stats.bestPrice, stats.currency)}</div>
          <div style={{ fontSize: 13, color: "#8b92a8", marginTop: 2 }}>{stats.bestStore}</div>
        </div>
      )}
      {displayPrices.length === 0 ? emptyPriceMessage : (
        <div style={{ flex: 1 }}>
          {displayPrices.filter(p => !p.best).map(p => (
            <div key={p.id} onDoubleClick={() => handleDeletePrice(p.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", fontSize: 12 }}>
              <span style={{ flex: 1, color: "#8b92a8" }}>{p.store}</span>
              <span style={{ fontWeight: 700 }}>{p.price}</span>
              <span style={{ fontSize: 9, color: "#555d74" }}>{p.date}</span>
            </div>
          ))}
        </div>
      )}
      {stats.totalPurchases > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--color-card, #161b26)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.10)" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#555d74" }}>PRECIO MEDIO</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: "var(--color-accent, #f0883e)" }}>{formatPrice(stats.averagePrice, stats.currency)}</span>
        </div>
      )}
      {addPriceFormBlock}
      {addPriceButton}
    </div>,

    // v3: Store Cards
    <div key="p2" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1, overflow: "auto" }}>
      {displayPrices.length === 0 ? emptyPriceMessage : displayPrices.map(p => (
        <div key={p.id} onDoubleClick={() => handleDeletePrice(p.id)} style={{ padding: "10px 12px", background: "var(--color-card, #161b26)", borderRadius: 10, border: `1px solid ${p.best ? "rgba(61,214,140,0.2)" : "rgba(255,255,255,0.10)"}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: p.best ? "rgba(61,214,140,0.1)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{p.best ? "🏷" : "🏪"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{p.store}</div>
            <div style={{ fontSize: 9, color: "#555d74" }}>{p.date}</div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: p.best ? "#3dd68c" : "var(--color-text)" }}>{p.price}</div>
        </div>
      ))}
      {addPriceFormBlock}
      {addPriceButton}
    </div>,

    // v4: Savings Badge
    <div key="p3" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flex: 1, textAlign: "center", overflow: "auto" }}>
      <div style={{ fontSize: 32 }}>{emojiChar}</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{displayName}</div>
      {stats.totalPurchases >= 2 && stats.bestPrice !== null && stats.worstPrice !== null && stats.bestStore && stats.worstStore ? (
        <>
          <div style={{ display: "flex", gap: 8, margin: "8px 0" }}>
            <div style={{ padding: "14px 18px", background: "rgba(61,214,140,0.08)", borderRadius: 14, border: "2px solid rgba(61,214,140,0.2)", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#3dd68c", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Mejor</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#3dd68c" }}>{formatPrice(stats.bestPrice, stats.currency)}</div>
              <div style={{ fontSize: 10, color: "#8b92a8", marginTop: 2 }}>{stats.bestStore}</div>
            </div>
            <div style={{ padding: "14px 18px", background: "var(--color-card, #161b26)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#555d74", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Peor</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#ff5c5c" }}>{formatPrice(stats.worstPrice, stats.currency)}</div>
              <div style={{ fontSize: 10, color: "#8b92a8", marginTop: 2 }}>{stats.worstStore}</div>
            </div>
          </div>
          <div style={{ padding: "8px 16px", borderRadius: 10, background: "rgba(61,214,140,0.06)", fontSize: 12, color: "#3dd68c", fontWeight: 700 }}>Ahorras {formatPrice(stats.worstPrice - stats.bestPrice, stats.currency)} comprando en {stats.bestStore}</div>
        </>
      ) : displayPrices.length === 0 ? emptyPriceMessage : (
        <div style={{ fontSize: 11, color: "#555d74" }}>Añade al menos 2 precios para comparar</div>
      )}
      {addPriceFormBlock}
      {addPriceButton}
    </div>,

    // v5: Receipt Style
    <div key="p4" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", flex: 1, overflow: "auto" }}>
      {displayPrices.length === 0 ? emptyPriceMessage : (
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, background: "var(--color-card, #161b26)", borderRadius: 8, padding: 14, border: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ textAlign: "center", fontWeight: 700, marginBottom: 8, fontSize: 12 }}>💰 {displayName} — Historial</div>
          <div style={{ borderBottom: "1px dashed #555d74", marginBottom: 6, paddingBottom: 6 }}>
            {displayPrices.map(p => (
              <div key={p.id} onDoubleClick={() => handleDeletePrice(p.id)} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: p.best ? "#3dd68c" : "#8b92a8" }}>
                <span>{p.store}</span><span style={{ fontWeight: 700 }}>{p.price}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 12 }}>
            <span>MEDIA</span><span style={{ color: "var(--color-accent, #f0883e)" }}>{formatPrice(stats.averagePrice, stats.currency)}</span>
          </div>
        </div>
      )}
      {addPriceFormBlock}
      {addPriceButton}
    </div>,
  ];

  const pricePane = priceVariants[labSel.price] ?? priceVariants[0];

  // ── STATS PANE — Computed from real prices ───────────────────────────
  const emptyStatsMessage = (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: "#555d74", fontSize: 12, textAlign: "center", padding: 20 }}>
      <span style={{ fontSize: 32, opacity: 0.4 }}>📊</span>
      <span>Sin estadísticas todavía.<br/>Añade precios en la pestaña 💰</span>
    </div>
  );
  const userColors = ["var(--color-accent, #f0883e)", "#6c8aff", "#3dd68c", "#c76dff", "#e8c364"];

  const statsVariants: React.ReactNode[] = [
    // v1: Dashboard Grid
    <div key="s0" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
      <div style={{ textAlign: "center", marginBottom: 4 }}><span style={{ fontSize: 20 }}>{emojiChar}</span> <span style={{ fontSize: 14, fontWeight: 700 }}>{displayName}</span></div>
      {stats.totalPurchases === 0 ? emptyStatsMessage : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[
            { v: String(stats.totalPurchases), l: "Compras", c: "var(--color-accent, #f0883e)" },
            { v: stats.frequencyDays !== null ? `~${stats.frequencyDays}d` : "—", l: "Frecuencia", c: "#3dd68c" },
            { v: formatPrice(stats.totalSpent, stats.currency), l: "Total gastado", c: "#e8c364" },
            { v: formatPrice(stats.averagePrice, stats.currency), l: "Precio medio", c: "#6c8aff" },
          ].map((s, i) => (
            <div key={i} style={{ padding: 14, background: "var(--color-card, #161b26)", borderRadius: 12, textAlign: "center", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 9, color: "#555d74", marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      )}
    </div>,

    // v2: Spend Tracker
    <div key="s1" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: 32 }}>{emojiChar}</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{displayName}</div>
      {stats.totalPurchases === 0 ? emptyStatsMessage : (
        <>
          <div style={{ padding: "18px 24px", background: "var(--color-card, #161b26)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", textAlign: "center", width: "100%" }}>
            <div style={{ fontSize: 9, color: "#555d74", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Total gastado</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "var(--color-accent, #f0883e)" }}>{formatPrice(stats.totalSpent, stats.currency)}</div>
            <div style={{ fontSize: 11, color: "#8b92a8", marginTop: 4 }}>en {stats.totalPurchases} compra{stats.totalPurchases > 1 ? "s" : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 6, width: "100%" }}>
            <div style={{ flex: 1, padding: 10, background: "var(--color-card, #161b26)", borderRadius: 10, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#555d74" }}>Mejor precio</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#3dd68c" }}>{stats.bestPrice !== null ? formatPrice(stats.bestPrice, stats.currency) : "—"}</div>
            </div>
            <div style={{ flex: 1, padding: 10, background: "var(--color-card, #161b26)", borderRadius: 10, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#555d74" }}>Precio medio</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#6c8aff" }}>{formatPrice(stats.averagePrice, stats.currency)}</div>
            </div>
            <div style={{ flex: 1, padding: 10, background: "var(--color-card, #161b26)", borderRadius: 10, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#555d74" }}>Peor precio</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#ff5c5c" }}>{stats.worstPrice !== null ? formatPrice(stats.worstPrice, stats.currency) : "—"}</div>
            </div>
          </div>
        </>
      )}
    </div>,

    // v3: Compact Numbers
    <div key="s2" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ textAlign: "center", padding: "8px 0 12px" }}>
        <span style={{ fontSize: 28 }}>{emojiChar}</span>
        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{displayName}</div>
      </div>
      {stats.totalPurchases === 0 ? emptyStatsMessage : (() => {
        const rows: Array<{ l: string; v: string; c: string }> = [
          { l: "Compras totales", v: String(stats.totalPurchases), c: "var(--color-accent, #f0883e)" },
          { l: "Frecuencia", v: stats.frequencyDays !== null ? `cada ~${stats.frequencyDays} días` : "—", c: "#3dd68c" },
          { l: "Última compra", v: stats.lastPurchase ? relativeTime(stats.lastPurchase) : "—", c: "var(--color-text)" },
          { l: "Precio medio", v: formatPrice(stats.averagePrice, stats.currency), c: "#e8c364" },
          { l: "Total gastado", v: formatPrice(stats.totalSpent, stats.currency), c: "var(--color-accent, #f0883e)" },
          { l: "Mejor precio", v: stats.bestPrice !== null ? `${formatPrice(stats.bestPrice, stats.currency)} (${stats.bestStore})` : "—", c: "#3dd68c" },
          { l: "Tienda favorita", v: stats.favoriteStore ? `${stats.favoriteStore} (${stats.favoriteStoreCount}x)` : "—", c: "var(--color-accent, #f0883e)" },
        ];
        return rows.map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 6px", borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", fontSize: 12 }}>
            <span style={{ color: "#555d74" }}>{r.l}</span>
            <span style={{ fontWeight: 700, color: r.c }}>{r.v}</span>
          </div>
        ));
      })()}
    </div>,

    // v4: By Store
    <div key="s3" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: 32 }}>{emojiChar}</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{displayName}</div>
      {stats.totalPurchases === 0 ? emptyStatsMessage : (
        <>
          <div style={{ padding: 16, background: "var(--color-card, #161b26)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", textAlign: "center", width: "100%" }}>
            <div style={{ fontSize: 9, color: "var(--color-accent, #f0883e)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>🏪 Tienda favorita</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "var(--color-accent, #f0883e)" }}>{stats.favoriteStore ?? "—"}</div>
            <div style={{ fontSize: 11, color: "#8b92a8" }}>{stats.favoriteStoreCount} compra{stats.favoriteStoreCount !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
            {stats.byStore.map(s => {
              const pct = Math.round((s.count / stats.totalPurchases) * 100);
              return (
                <div key={s.store} style={{ padding: "8px 10px", background: "var(--color-card, #161b26)", borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                    <span>{s.store}</span><span style={{ fontWeight: 700 }}>{s.count}x</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "var(--color-accent, #f0883e)", borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>,

    // v5: Who Buys
    <div key="s4" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
      <div style={{ textAlign: "center" }}><span style={{ fontSize: 20 }}>{emojiChar}</span> <span style={{ fontSize: 14, fontWeight: 700 }}>{displayName}</span></div>
      {stats.byUser.length === 0 ? emptyStatsMessage : stats.byUser.map((m, i) => {
        const c = userColors[i % userColors.length];
        return (
          <div key={m.name} style={{ padding: 12, background: "var(--color-card, #161b26)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>{m.name[0]?.toUpperCase()}</div>
              <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{m.name}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: c }}>{m.count}x</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${m.pct}%`, background: c, borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 9, color: "#555d74", marginTop: 4, textAlign: "right" }}>{m.pct}% de las compras</div>
          </div>
        );
      })}
    </div>,
  ];

  const statsPane = statsVariants[labSel.stats] ?? statsVariants[0];

  // ── COMMENTS PANE — Real comments from Supabase ──────────────────────
  const myUserId = user?.id;
  const displayComments = comments.map(c => ({
    id: c.id,
    who: c.added_by_name || "Usuario",
    flag: c.added_by_lang ? getLangFlag(c.added_by_lang) : "",
    isMe: c.added_by === myUserId,
    text: c.text,
    t: relativeTime(c.created_at),
  }));
  const emptyCommMessage = (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: "#555d74", fontSize: 12, textAlign: "center", padding: 20 }}>
      <span style={{ fontSize: 32, opacity: 0.4 }}>💬</span>
      <span>Sin comentarios todavía.<br/>Sé el primero en comentar.</span>
    </div>
  );

  const commInputRow = (placeholder: string, btnBg: string, btnIcon: string) => (
    <div style={{ marginTop: "auto", display: "flex", gap: 6, paddingTop: 8 }}>
      <input
        className="input"
        placeholder={placeholder}
        value={newCommentText}
        onChange={e => setNewCommentText(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") handleAddComment(); }}
        style={{ flex: 1, fontSize: 12, padding: "8px 12px" }}
      />
      <button type="button" onClick={handleAddComment} disabled={!newCommentText.trim()} style={{ padding: "8px 14px", borderRadius: 10, background: btnBg, border: "none", color: "#fff", fontSize: 14, cursor: "pointer", opacity: newCommentText.trim() ? 1 : 0.5 }}>{btnIcon}</button>
    </div>
  );

  const commVariants: React.ReactNode[] = [
    // v1: Chat Bubbles
    <div key="c0" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1, overflow: "auto" }}>
      <div style={{ fontSize: 10, color: "#555d74", textAlign: "center", marginBottom: 4 }}>💬 Conversación sobre {displayName}</div>
      {displayComments.length === 0 ? emptyCommMessage : displayComments.map(c => (
        <div key={c.id} onDoubleClick={() => c.isMe && handleDeleteComment(c.id)} style={{ maxWidth: "85%", alignSelf: c.isMe ? "flex-end" : "flex-start", padding: "8px 12px", borderRadius: c.isMe ? "12px 12px 4px 12px" : "12px 12px 12px 4px", background: c.isMe ? "rgba(240,136,62,0.08)" : "rgba(108,138,255,0.08)", border: `1px solid ${c.isMe ? "rgba(240,136,62,0.12)" : "rgba(108,138,255,0.12)"}` }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: c.isMe ? "var(--color-accent, #f0883e)" : "#6c8aff" }}>{c.flag} {c.who}</div>
          <div style={{ fontSize: 12, color: "#8b92a8", marginTop: 2 }}>{c.text}</div>
          <div style={{ fontSize: 8, color: "#555d74", textAlign: "right", marginTop: 2 }}>{c.t}</div>
        </div>
      ))}
      {commInputRow("Escribe un comentario...", "linear-gradient(135deg,#f09848,#e07028)", "→")}
    </div>,

    // v2: Card Comments
    <div key="c1" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1, overflow: "auto" }}>
      {displayComments.length === 0 ? emptyCommMessage : displayComments.map(c => (
        <div key={c.id} onDoubleClick={() => c.isMe && handleDeleteComment(c.id)} style={{ padding: "10px 12px", background: "var(--color-card, #161b26)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: c.isMe ? "var(--color-accent, #f0883e)" : "#6c8aff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#fff" }}>{c.who[0]?.toUpperCase()}</div>
            <span style={{ fontSize: 11, fontWeight: 700 }}>{c.who}</span>
            <span style={{ fontSize: 9, color: "#555d74", marginLeft: "auto" }}>{c.t}</span>
          </div>
          <div style={{ fontSize: 12, color: "#8b92a8" }}>{c.text}</div>
        </div>
      ))}
      {commInputRow("💬 Comentar...", "var(--color-accent, #f0883e)", "→")}
    </div>,

    // v3: Minimal Lines
    <div key="c2" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", flex: 1, overflow: "auto" }}>
      {displayComments.length === 0 ? emptyCommMessage : displayComments.map(c => (
        <div key={c.id} onDoubleClick={() => c.isMe && handleDeleteComment(c.id)} style={{ padding: "8px 4px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 12, color: "#8b92a8" }}>{c.text}</div>
          <div style={{ fontSize: 9, color: "#555d74", marginTop: 2 }}>— {c.who} {c.flag} · {c.t}</div>
        </div>
      ))}
      {commInputRow("Añadir nota...", "var(--color-accent, #f0883e)", "→")}
    </div>,

    // v4: Color Left Bar
    <div key="c3" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4, flex: 1, overflow: "auto" }}>
      {displayComments.length === 0 ? emptyCommMessage : displayComments.map(c => (
        <div key={c.id} onDoubleClick={() => c.isMe && handleDeleteComment(c.id)} style={{ display: "flex", borderRadius: 8, overflow: "hidden", background: "var(--color-card, #161b26)" }}>
          <div style={{ width: 3, background: c.isMe ? "var(--color-accent, #f0883e)" : "#6c8aff", flexShrink: 0 }} />
          <div style={{ flex: 1, padding: "8px 12px" }}>
            <div style={{ fontSize: 12, color: "#8b92a8" }}>{c.text}</div>
            <div style={{ fontSize: 9, color: "#555d74", marginTop: 2 }}>{c.who} · {c.t}</div>
          </div>
        </div>
      ))}
      {commInputRow("Mensaje...", "var(--color-accent, #f0883e)", "→")}
    </div>,

    // v5: Sticky Notes
    <div key="c4" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, flex: 1, overflow: "auto" }}>
      {displayComments.length === 0 ? emptyCommMessage : displayComments.map((c, i) => (
        <div key={c.id} onDoubleClick={() => c.isMe && handleDeleteComment(c.id)} style={{ padding: "10px 12px", borderRadius: 4, background: c.isMe ? "rgba(240,136,62,0.08)" : "rgba(108,138,255,0.08)", transform: `rotate(${i % 2 ? "-1" : "0.5"}deg)`, boxShadow: "2px 3px 8px rgba(0,0,0,0.2)" }}>
          <div style={{ fontSize: 12, color: "var(--color-text)" }}>{c.text}</div>
          <div style={{ fontSize: 9, color: "#555d74", marginTop: 4, textAlign: "right" }}>— {c.who} · {c.t}</div>
        </div>
      ))}
      {commInputRow("Nueva nota...", "var(--color-accent, #f0883e)", "📌")}
    </div>,
  ];

  const commPane = commVariants[labSel.comm] ?? commVariants[0];

  // ── HISTORY PANE — Real events from Supabase ─────────────────────────
  // Color map for event types
  const eventColor = (type: string): string => {
    if (type === "created") return "#3dd68c";
    if (type === "qty_changed" || type === "unit_changed") return "#6c8aff";
    if (type === "important") return "#ff5c5c";
    if (type === "note_changed") return "#c76dff";
    if (type === "checked") return "#3dd68c";
    if (type === "translated") return "#34d6c0";
    if (type === "price_added") return "#e8c364";
    if (type === "comment") return "var(--color-accent, #f0883e)";
    return "#8b92a8";
  };
  const displayHistory = history.map(h => ({
    id: h.id,
    t: relativeTime(h.created_at),
    icon: h.icon || "📝",
    text: h.description,
    color: eventColor(h.event_type),
  }));
  const emptyHistMessage = (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: "#555d74", fontSize: 12, textAlign: "center", padding: 20 }}>
      <span style={{ fontSize: 32, opacity: 0.4 }}>📋</span>
      <span>Sin historial todavía.<br/>Las acciones se registrarán aquí.</span>
    </div>
  );

  const histVariants: React.ReactNode[] = [
    // v1: Timeline Dots
    <div key="h0" style={{ padding: "12px 16px 12px 32px", position: "relative", flex: 1, overflow: "auto" }}>
      {displayHistory.length === 0 ? emptyHistMessage : (
        <>
          <div style={{ position: "absolute", left: 22, top: 36, bottom: 16, width: 2, background: "rgba(255,255,255,0.06)" }} />
          {displayHistory.map(e => (
            <div key={e.id} style={{ position: "relative", padding: "6px 0 14px 16px" }}>
              <div style={{ position: "absolute", left: -6, top: 10, width: 10, height: 10, borderRadius: "50%", background: e.color, border: "2px solid var(--color-bg, #0d1017)" }} />
              <div style={{ fontSize: 9, color: "#555d74" }}>{e.t}</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{e.icon} {e.text}</div>
            </div>
          ))}
        </>
      )}
    </div>,

    // v2: Activity Feed
    <div key="h1" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1, overflow: "auto" }}>
      {displayHistory.length === 0 ? emptyHistMessage : displayHistory.map(e => (
        <div key={e.id} style={{ display: "flex", gap: 10, padding: "10px 12px", background: "var(--color-card, #161b26)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", alignItems: "flex-start" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${e.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{e.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{e.text}</div>
            <div style={{ fontSize: 9, color: "#555d74", marginTop: 1 }}>{e.t}</div>
          </div>
        </div>
      ))}
    </div>,

    // v3: Compact Log
    <div key="h2" style={{ padding: "12px 16px", flex: 1, overflow: "auto" }}>
      {displayHistory.length === 0 ? emptyHistMessage : (
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10 }}>
          {displayHistory.map(e => (
            <div key={e.id} style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
              <span style={{ color: "#555d74", whiteSpace: "nowrap", minWidth: 60 }}>{e.t}</span>
              <span>{e.icon}</span>
              <span style={{ color: "#8b92a8" }}>{e.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>,

    // v4: Color Bar Left
    <div key="h3" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4, flex: 1, overflow: "auto" }}>
      {displayHistory.length === 0 ? emptyHistMessage : displayHistory.map(e => (
        <div key={e.id} style={{ display: "flex", alignItems: "stretch", borderRadius: 8, overflow: "hidden", background: "var(--color-card, #161b26)" }}>
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
    <div key="h4" style={{ padding: "12px 16px", flex: 1, overflow: "auto" }}>
      {displayHistory.length === 0 ? emptyHistMessage : (
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, background: "#0a0a0a", borderRadius: 10, padding: 12, border: "1px solid #222" }}>
          <div style={{ color: "#666", marginBottom: 6 }}>--- {displayName.toLowerCase()}.history</div>
          {displayHistory.map((e, i) => (
            <div key={e.id}>
              <div style={{ color: "#3dd68c" }}>+ {e.text} <span style={{ color: "#666" }}>// {e.t}</span></div>
              {i < displayHistory.length - 1 && <div style={{ margin: "4px 0", borderTop: "1px solid #222" }} />}
            </div>
          ))}
        </div>
      )}
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
