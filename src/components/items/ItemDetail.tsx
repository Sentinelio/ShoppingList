import { useState, useEffect, useRef, type ChangeEvent } from "react";
import type { Item } from "../../lib/pocketbase";
import { getLangFlag } from "../../data/langs";
import { t, formatQtyUnit } from "../../data/i18n";
import { useStorePhrases } from "../../hooks/useStorePhrases";
import { incrementPhraseUsage } from "../../lib/storePhrasesStore";
import { matchProductEmoji } from "../../lib/emojiMatcher";
import { useItemPrices, useItemComments, useItemHistory } from "../../hooks/useItemData";
import { addItemPrice, deleteItemPrice, addItemComment, deleteItemComment, computeItemStats, relativeTime, formatPrice, getCountryCurrency, getCountryPopularStore } from "../../lib/itemData";
import { useAuth } from "../../hooks/useAuth";
import { translateProduct } from "../../lib/translate";
import { getEnabledLangs } from "../../lib/langConfig";
import { uploadItemPhoto } from "../../lib/photoUpload";
import { primaryName, secondaryName } from "../../lib/names";
import ItemIcon from "./ItemIcon";
import EmojiImage from "../ui/EmojiImage";

interface ItemDetailProps {
  item: Item | null;
  open: boolean;
  onClose: () => void;
  userLang: string;
  shelfLang: string;
  countryFlag?: string;
  onUpdate: (itemId: string, updates: Partial<Pick<Item, "qty" | "unit" | "note" | "photo" | "important" | "original" | "translations" | "brand" | "checked_at">>) => void;
  onDelete: (itemId: string) => void;
  /** Opens the Store tab (3.7) on this product. */
  onShowStore: (item: Item) => void;
  /** "No hay" ↔ to buy (also takes the item out of the cart). */
  onSetUnavailable: (itemId: string, unavailable: boolean) => void;
  lang?: string;
}

function getUnits(lang: string) {
  return [
    { value: "", label: t(lang, "unitNone") },
    { value: "x", label: t(lang, "unitPcs") },
    { value: "kg", label: "kg" },
    { value: "g", label: "g" },
    { value: "L", label: "L" },
    { value: "ml", label: "ml" },
    { value: "cl", label: "cl" },
    { value: "pack", label: t(lang, "unitPack") },
  ];
}

// "Mostrar en tienda" look (the old lab's default, the only one ever used).
const SHOW_STYLE = {
  shelfFontSize: 32, shelfFontWeight: 900, shelfLetterSpacing: undefined as string | undefined, shelfTextShadow: undefined as string | undefined,
  mineFontSize: 13, mineBg: undefined as string | undefined, mineBorderRadius: undefined as string | undefined,
  emojiFilter: undefined as string | undefined, emojiOpacity: undefined as number | undefined,
  toggleBorderTop: "1px solid var(--color-border)", toggleBg: undefined as string | undefined, toggleBorderRadius: undefined as string | undefined,
  toggleBorder: undefined as string | undefined, toggleLabelColor: "var(--color-text-muted)", toggleLabelSize: 11, toggleLabelWeight: 700,
  bodyBg: undefined as string | undefined, listBorderRadius: undefined as string | undefined, listBorder: undefined as string | undefined, listMargin: undefined as string | undefined,
};

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
  background: "var(--color-bg)",
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: "12px 3px 10px",
  borderRight: "1px solid color-mix(in srgb, var(--color-text) 6%, transparent)",
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
  onShowStore,
  onSetUnavailable,
}: ItemDetailProps) {
  const lang = userLang;
  const UNITS = getUnits(lang);
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");
  const [editName, setEditName] = useState("");
  const [brand, setBrand] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const detailFileRef = useRef<HTMLInputElement>(null);

  const handlePhotoFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadItemPhoto(file);
      if (url && item) onUpdate(item.id, { photo: url });
    } catch (err) {
      console.error("[photo upload]", err);
    }
    setUploadingPhoto(false);
    if (detailFileRef.current) detailFileRef.current.value = "";
  };
  const [_deleteStep, setDeleteStep] = useState<0 | 1>(0);
  void _deleteStep; // used only for reset in useEffect
  const [activeTab, setActiveTab] = useState<DetailTab>("show");
  const [activePhrase, setActivePhrase] = useState<string | null>(null);
  const [showPhraseList, setShowPhraseList] = useState(false);
  const phrases = useStorePhrases();
  const sv = SHOW_STYLE;

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

  useEffect(() => {
    if (item) {
      setQty(item.qty || "");
      setUnit(item.unit || "");
      setNote(item.note || "");
      setEditName(item.original || "");
      setBrand(item.brand || "");
      setEditingPhoto(false);
      setPhotoUrl("");
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
  // Language rule: primary (gold) in the list country's language, secondary
  // (grey) in mine.
  const primary = primaryName(item, shelfLang);
  const mine = secondaryName(item, shelfLang, userLang);
  const isUnavailable = !!item.unavailable;
  const emojiChar = matchProductEmoji(item.original).emoji || "🛒";
  const activePhraseObj = activePhrase ? phrases.find(p => p.key === activePhrase) : null;
  const activePhraseShelf = activePhraseObj
    ? (activePhraseObj.translations[shelfLang] || activePhraseObj.translations.en)
    : null;
  // Under the chosen phrase: my language, when it says something different.
  const activePhraseMine = activePhraseObj && shelfLang !== userLang
    ? activePhraseObj.translations[userLang] || null
    : null;

  // Check if any edit field has changed
  const nameChanged = editName.trim() !== "" && editName.trim() !== item.original;
  const brandChanged = brand.trim() !== (item.brand || "");
  const qtyChanged = qty !== (item.qty || "");
  const unitChanged = unit !== (item.unit || "");
  const noteChanged = note !== (item.note || "");

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
          style={{ textAlign: "center", padding: "16px 16px 12px", background: "linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 85%, #fff), color-mix(in srgb, var(--color-accent) 85%, #000))", cursor: "pointer", flexShrink: 0 }}>
          <span style={{ fontSize: 24, display: "block", marginBottom: 4 }}>{activePhraseObj?.emoji}</span>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{activePhraseShelf}</div>
          {activePhraseMine && activePhraseMine !== activePhraseShelf && (
            <div style={{ fontSize: 12, color: "color-mix(in srgb, var(--color-text) 80%, transparent)", marginTop: 4 }}>{activePhraseMine}</div>
          )}
          <div style={{ fontSize: 9, color: "color-mix(in srgb, var(--color-text) 50%, transparent)", marginTop: 6 }}>tap para ocultar</div>
        </div>
      )}
      {/* Shelf name */}
      <div style={{ textAlign: "center", padding: "2px 16px 0", flexShrink: 0 }}>
        <div style={{ fontSize: sv.shelfFontSize, fontWeight: sv.shelfFontWeight, color: "var(--color-primary-name)", marginTop: 10, letterSpacing: sv.shelfLetterSpacing, textShadow: sv.shelfTextShadow }}>
          {primary}
        </div>
        {mine && (
          <div style={{ fontSize: sv.mineFontSize, color: "var(--color-secondary-name)", marginTop: 4, ...(sv.mineBg ? { padding: "4px 12px", background: sv.mineBg, borderRadius: sv.mineBorderRadius || "8px", display: "inline-block" } : {}) }}>
            ({mine})
          </div>
        )}
        {item.brand && (
          <div style={{ fontSize: 11, color: "var(--color-text-soft)", marginTop: 4, fontStyle: "italic" }}>
            {item.brand}
          </div>
        )}
      </div>
      {/* Emoji centered */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {item.photo ? (
          <img src={item.photo} style={{ maxWidth: "70%", maxHeight: "30vh", borderRadius: 16, objectFit: "contain" }} alt={shelfName} />
        ) : (
          <span style={{ filter: sv.emojiFilter, opacity: sv.emojiOpacity }}>
            <ItemIcon name={item.original} category={item.category} size={150} />
          </span>
        )}
      </div>
      {/* Qty + note */}
      {(qty || item.note) && (
        <div style={{ textAlign: "center", flexShrink: 0, padding: "0 16px 4px" }}>
          {qty && <p style={{ fontSize: 20, fontWeight: 800, color: "var(--color-accent)" }}>{formatQtyUnit(qty, unit, lang)}</p>}
          {item.note && <p style={{ fontSize: 13, color: "var(--color-text-soft)", fontStyle: "italic", marginTop: 4 }}>{item.note}</p>}
        </div>
      )}
      {/* No hay (toggle) + open this product in the Store tab */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "6px 12px 4px", flexShrink: 0 }}>
        <button
          type="button"
          aria-pressed={isUnavailable}
          onClick={() => { onSetUnavailable(item.id, !isUnavailable); onClose(); }}
          style={{
            minHeight: 48, borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
            fontSize: 15, fontWeight: 700, background: "var(--color-danger-soft)", color: "var(--color-danger-ink)",
            border: isUnavailable ? "2px solid var(--color-danger-ink)" : "2px solid transparent",
          }}
        >
          🚫 {t(lang, "markUnavailable")}
        </button>
        <button
          type="button"
          onClick={() => { onShowStore(item); onClose(); }}
          style={{
            minHeight: 44, borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
            fontSize: 14, fontWeight: 700, background: "var(--color-accent-soft)", color: "var(--color-accent-ink)",
            border: "2px solid transparent",
          }}
        >
          🛍️ {t(lang, "showInStoreFull")}
        </button>
      </div>
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
              const phraseMine = phrase.translations[userLang] || phraseShelf;
              return (
                <div key={phrase.key} onClick={() => { setActivePhrase(phrase.key); setShowPhraseList(false); void incrementPhraseUsage(phrase.key); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer", borderBottom: "1px solid color-mix(in srgb, var(--color-text) 6%, transparent)" }}>
                  <span style={{ fontSize: 18 }}>{phrase.emoji}</span>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>{phraseMine}</span>
                    {phraseMine !== phraseShelf && (
                      <span style={{ fontSize: 11, color: "var(--color-secondary-name)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{phraseShelf}</span>
                    )}
                  </span>
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
          🔍 {t(lang, "googleImages")}
        </a>
      </div>
    </div>
  );

  // ── EDIT PANE ───────────────────────────────────────────────────────────
  const labLabel: React.CSSProperties = { fontSize: 9, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 };
  const labInput: React.CSSProperties = { background: "var(--color-card)", border: "1px solid color-mix(in srgb, var(--color-text) 10%, transparent)", borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "var(--color-text)", width: "100%", fontFamily: "inherit", outline: "none" };
  const labBtn: React.CSSProperties = { padding: 14, borderRadius: 12, background: "linear-gradient(135deg,color-mix(in srgb, var(--color-accent) 85%, #fff),color-mix(in srgb, var(--color-accent) 85%, #000))", color: "#fff", fontWeight: 700, fontSize: 15, border: "none", width: "100%", cursor: "pointer", fontFamily: "inherit" };

  // Shared edit header: name input + photo button (matches lab editHeader)
  const editHeader = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ display: "inline-flex", verticalAlign: "middle" }}><EmojiImage emoji={emojiChar} size={32} /></span>
        <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
          style={{ ...labInput, flex: 1, fontSize: 16, fontWeight: 700, padding: "6px 10px" }} />
      </div>
      {/* Photo: file upload + URL */}
      <input ref={detailFileRef} type="file" accept="image/*" onChange={handlePhotoFile} style={{ display: "none" }} />
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <button type="button" onClick={() => detailFileRef.current?.click()} disabled={uploadingPhoto}
          style={{ flex: 1, padding: "8px 0", borderRadius: 10, background: "transparent", border: "1.5px solid color-mix(in srgb, var(--color-text) 10%, transparent)", color: "var(--color-text-soft)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          {uploadingPhoto ? "⏳..." : `📷 ${t(lang, "addPhotoUrl")}`}
        </button>
        {!editingPhoto ? (
          <button type="button" onClick={() => setEditingPhoto(true)}
            style={{ flex: 1, padding: "8px 0", borderRadius: 10, background: "transparent", border: "1.5px solid color-mix(in srgb, var(--color-text) 10%, transparent)", color: "var(--color-text-soft)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            🔗 URL
          </button>
        ) : (
          <>
            <input type="text" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://..."
              onKeyDown={e => { if (e.key === "Enter") savePhotoUrl(); if (e.key === "Escape") setEditingPhoto(false); }}
              style={{ ...labInput, flex: 2, fontSize: 11, padding: "8px 10px" }} />
            <button type="button" onClick={savePhotoUrl} style={{ padding: "8px 12px", borderRadius: 10, background: "linear-gradient(135deg,color-mix(in srgb, var(--color-accent) 85%, #fff),color-mix(in srgb, var(--color-accent) 85%, #000))", color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>OK</button>
          </>
        )}
      </div>
      {item.photo && <img src={item.photo} style={{ width: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 10, border: "1px solid color-mix(in srgb, var(--color-text) 10%, transparent)", marginBottom: 6 }} alt="" />}
      <div style={labLabel}>{t(lang, "brand")}</div>
      <input type="text" value={brand} onChange={e => setBrand(e.target.value)}
        placeholder="Ej: Hacendado, Lidl, Himalaya..."
        style={{ ...labInput, marginBottom: 6, fontSize: 13, padding: "10px 14px" }} />
      {item.checked && (
        <>
          <div style={labLabel}>{t(lang, "done")}</div>
          <input type="datetime-local"
            value={item.checked_at ? new Date(new Date(item.checked_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
            onChange={e => {
              const val = e.target.value;
              if (val) onUpdate(item.id, { checked_at: new Date(val).toISOString() } as Parameters<typeof onUpdate>[1]);
            }}
            style={{ ...labInput, marginBottom: 6, fontSize: 13, padding: "10px 14px", colorScheme: "dark" }} />
        </>
      )}
    </>
  );

  const editPane = (
    // v1: Classic Form — pixel-perfect match with lab HTML
    <div key="e0" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
      {editHeader}
      <div>
        <div style={labLabel}>{t(lang, "quantity")}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="number" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)}placeholder="1"
            style={{ ...labInput, width: 70, textAlign: "center", flex: "none" }} />
          <select value={unit} onChange={e => { setUnit(e.target.value); setTimeout(() => onUpdate(item.id, { qty, unit: e.target.value, note }), 0); }}
            style={{ ...labInput, flex: 1, appearance: "none", WebkitAppearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath fill='%238b92a8' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: 30 }}>
            {UNITS.map(u => <option key={u.value} value={u.value} style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>{u.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <div style={labLabel}>Nota</div>
        <input type="text" value={note} onChange={e => setNote(e.target.value)}placeholder={t(lang, "notePlaceholder")}
          style={labInput} />
      </div>
      <div>
        <div style={labLabel}>{t(lang, "priority")}</div>
        <button type="button" onClick={() => onUpdate(item.id, { important: !item.important })}
          style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 11, width: "100%",
            border: `1.5px solid ${item.important ? "color-mix(in srgb, var(--color-danger) 20%, transparent)" : "color-mix(in srgb, var(--color-text) 10%, transparent)"}`,
            background: item.important ? "color-mix(in srgb, var(--color-danger) 4%, transparent)" : "transparent", cursor: "pointer", fontFamily: "inherit",
          }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: item.important ? "var(--color-danger)" : "var(--color-text-muted)", boxShadow: item.important ? "0 0 6px color-mix(in srgb, var(--color-danger) 40%, transparent)" : "none" }} />
          <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: item.important ? "var(--color-danger)" : "var(--color-text)", textAlign: "left" }}>{t(lang, "important")}</span>
          {/* Toggle switch */}
          <span style={{
            width: 40, height: 22, borderRadius: 11, position: "relative",
            background: item.important ? "var(--color-danger)" : "color-mix(in srgb, var(--color-text) 12%, transparent)",
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
        <button type="button" onClick={handleSave} style={labBtn}>💾 {t(lang, "save")}</button>
      </div>
    </div>
  );


  // ── TRANSLATIONS PANE (5 variants from the lab) ─────────────────────────
  const otherLangs = Object.entries(item.translations || {}).filter(([c]) => c !== userLang && c !== shelfLang);

  const transPane = (
    // v1: Flag List — yours + shelf highlighted, others below divider
    <div key="t0" style={{ padding: "12px 16px", flex: 1 }}>
      <div style={{ textAlign: "center", marginBottom: 10 }}><span style={{ display: "inline-flex", verticalAlign: "middle" }}><EmojiImage emoji={emojiChar} size={32} /></span>{" "}<span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-accent)" }}>{formatQtyUnit(qty, unit, lang)}</span></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 6 }}>
        {[{ flag: getLangFlag(userLang), word: displayName, label: "Tu idioma", bg: "color-mix(in srgb, var(--color-info) 8%, transparent)", border: "color-mix(in srgb, var(--color-info) 20%, transparent)", color: "var(--color-text)" },
          ...(showShelf ? [{ flag: getLangFlag(shelfLang) || countryFlag, word: shelfName, label: "Estante", bg: "color-mix(in srgb, var(--color-shelf) 8%, transparent)", border: "color-mix(in srgb, var(--color-shelf) 20%, transparent)", color: "var(--color-shelf)" }] : []),
        ].map((row, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: row.bg, border: `1.5px solid ${row.border}` }}>
            <span style={{ fontSize: 20 }}>{row.flag}</span><span style={{ fontSize: 17, fontWeight: 800, flex: 1, color: row.color }}>{row.word}</span><span style={{ fontSize: 9, color: "var(--color-text-muted)", fontWeight: 600 }}>{row.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0 8px" }}><div style={{ flex: 1, height: 1, background: "color-mix(in srgb, var(--color-text) 6%, transparent)" }} /><span style={{ fontSize: 9, color: "var(--color-text-muted)", fontWeight: 600 }}>Otros idiomas</span><div style={{ flex: 1, height: 1, background: "color-mix(in srgb, var(--color-text) 6%, transparent)" }} /></div>
      {otherLangs.map(([code, word]) => (
        <div key={code} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", borderRadius: 8 }}><span style={{ fontSize: 14 }}>{getLangFlag(code)}</span><span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-soft)" }}>{word}</span></div>
      ))}
    </div>
  );


  // ── DELETE PANE ────────────────────────────────────────────────────────
  const delPane = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 14, padding: "40px 24px" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "color-mix(in srgb, var(--color-danger) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--color-danger) 15%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🗑</div>
      <div style={{ fontSize: 17, fontWeight: 800 }}>¿Eliminar {displayName}?</div>
      <div style={{ fontSize: 12, color: "var(--color-text-soft)", lineHeight: 1.4 }}>Se eliminará de la lista para todos los miembros. Esta acción no se puede deshacer.</div>
      <div style={{ display: "flex", gap: 8, width: "100%", marginTop: 8 }}>
        <button type="button" onClick={() => setActiveTab("show")}
          style={{ flex: 1, padding: 13, borderRadius: 12, background: "var(--color-card)", border: "1px solid color-mix(in srgb, var(--color-text) 10%, transparent)", color: "var(--color-text-soft)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{t(lang, "cancel")}</button>
        <button type="button" onClick={() => { onDelete(item.id); onClose(); }}
          style={{ flex: 1, padding: 13, borderRadius: 12, background: "var(--color-danger)", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Eliminar</button>
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
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: "var(--color-text-muted)", fontSize: 12, textAlign: "center", padding: 20 }}>
      <span style={{ fontSize: 32, opacity: 0.4 }}>💰</span>
      <span>No hay precios todavía.<br/>Añade el primero.</span>
    </div>
  );

  // Add price form (shown when user clicks "+ Añadir precio")
  const addPriceFormBlock = showAddPriceForm ? (
    <div style={{ padding: 10, background: "var(--color-card)", borderRadius: 10, border: "1px solid var(--color-accent)", display: "flex", flexDirection: "column", gap: 6 }}>
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
            background: "var(--color-bg)",
            color: "var(--color-text)",
            border: "1px solid color-mix(in srgb, var(--color-text) 10%, transparent)",
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
            <option key={c} value={c} style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
              {c} {c === "EUR" ? "€" : c === "USD" ? "$" : c === "GBP" ? "£" : c === "PLN" ? "zł" : c === "JPY" ? "¥" : ""}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" onClick={() => { setShowAddPriceForm(false); setNewPriceStore(""); setNewPriceValue(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 8, background: "transparent", border: "1px solid color-mix(in srgb, var(--color-text) 10%, transparent)", color: "var(--color-text-soft)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{t(lang, "cancel")}</button>
        <button type="button" onClick={handleAddPrice} disabled={!newPriceStore.trim() || !newPriceValue.trim()} style={{ flex: 1, padding: "8px 0", borderRadius: 8, background: "linear-gradient(135deg,color-mix(in srgb, var(--color-accent) 85%, #fff),color-mix(in srgb, var(--color-accent) 85%, #000))", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: (!newPriceStore.trim() || !newPriceValue.trim()) ? 0.5 : 1 }}>{t(lang, "save")}</button>
      </div>
    </div>
  ) : null;

  const addPriceButton = !showAddPriceForm ? (
    <button type="button" onClick={() => setShowAddPriceForm(true)} style={{ marginTop: "auto", width: "100%", padding: "10px 0", borderRadius: 10, background: "transparent", border: "1.5px solid color-mix(in srgb, var(--color-text) 10%, transparent)", color: "var(--color-text-soft)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ Añadir precio</button>
  ) : null;

  const pricePane = (
    // v1: Simple List
    <div key="p0" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4, flex: 1, overflow: "auto" }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}><span style={{ display: "inline-flex", verticalAlign: "middle" }}><EmojiImage emoji={emojiChar} size={28} /></span> <span style={{ fontSize: 15, fontWeight: 700 }}>{displayName}</span></div>
      {displayPrices.length === 0 ? emptyPriceMessage : displayPrices.map(p => (
        <div key={p.id} onDoubleClick={() => handleDeletePrice(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: p.best ? "color-mix(in srgb, var(--color-success) 4%, transparent)" : "var(--color-card)", borderRadius: 10, border: `1px solid ${p.best ? "color-mix(in srgb, var(--color-success) 15%, transparent)" : "var(--color-border)"}` }}>
          <span style={{ fontSize: 14 }}>{p.best ? "🏷" : "🏪"}</span>
          <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{p.store}</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: p.best ? "var(--color-success)" : "var(--color-text)" }}>{p.price}</span>
          <span style={{ fontSize: 9, color: "var(--color-text-muted)" }}>{p.date}</span>
        </div>
      ))}
      {addPriceFormBlock}
      {addPriceButton}
    </div>
  );


  // ── STATS PANE — Computed from real prices ───────────────────────────
  const emptyStatsMessage = (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: "var(--color-text-muted)", fontSize: 12, textAlign: "center", padding: 20 }}>
      <span style={{ fontSize: 32, opacity: 0.4 }}>📊</span>
      <span>Sin estadísticas todavía.<br/>Añade precios en la pestaña 💰</span>
    </div>
  );

  const statsPane = (
    // v1: Dashboard Grid
    <div key="s0" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
      <div style={{ textAlign: "center", marginBottom: 4 }}><span style={{ display: "inline-flex", verticalAlign: "middle" }}><EmojiImage emoji={emojiChar} size={23} /></span> <span style={{ fontSize: 14, fontWeight: 700 }}>{displayName}</span></div>
      {stats.totalPurchases === 0 ? emptyStatsMessage : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[
            { v: String(stats.totalPurchases), l: "Compras", c: "var(--color-accent)" },
            { v: stats.frequencyDays !== null ? `~${stats.frequencyDays}d` : "—", l: "Frecuencia", c: "var(--color-success)" },
            { v: formatPrice(stats.totalSpent, stats.currency), l: "Total gastado", c: "var(--color-shelf)" },
            { v: formatPrice(stats.averagePrice, stats.currency), l: "Precio medio", c: "var(--color-info)" },
          ].map((s, i) => (
            <div key={i} style={{ padding: 14, background: "var(--color-card)", borderRadius: 12, textAlign: "center", border: "1px solid color-mix(in srgb, var(--color-text) 10%, transparent)" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 9, color: "var(--color-text-muted)", marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );


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
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: "var(--color-text-muted)", fontSize: 12, textAlign: "center", padding: 20 }}>
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

  const commPane = (
    // v1: Chat Bubbles
    <div key="c0" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1, overflow: "auto" }}>
      <div style={{ fontSize: 10, color: "var(--color-text-muted)", textAlign: "center", marginBottom: 4 }}>💬 Conversación sobre {displayName}</div>
      {displayComments.length === 0 ? emptyCommMessage : displayComments.map(c => (
        <div key={c.id} onDoubleClick={() => c.isMe && handleDeleteComment(c.id)} style={{ maxWidth: "85%", alignSelf: c.isMe ? "flex-end" : "flex-start", padding: "8px 12px", borderRadius: c.isMe ? "12px 12px 4px 12px" : "12px 12px 12px 4px", background: c.isMe ? "color-mix(in srgb, var(--color-accent) 8%, transparent)" : "color-mix(in srgb, var(--color-info) 8%, transparent)", border: `1px solid ${c.isMe ? "color-mix(in srgb, var(--color-accent) 12%, transparent)" : "color-mix(in srgb, var(--color-info) 12%, transparent)"}` }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: c.isMe ? "var(--color-accent)" : "var(--color-info)" }}>{c.flag} {c.who}</div>
          <div style={{ fontSize: 12, color: "var(--color-text-soft)", marginTop: 2 }}>{c.text}</div>
          <div style={{ fontSize: 8, color: "var(--color-text-muted)", textAlign: "right", marginTop: 2 }}>{c.t}</div>
        </div>
      ))}
      {commInputRow("Escribe un comentario...", "linear-gradient(135deg,color-mix(in srgb, var(--color-accent) 85%, #fff),color-mix(in srgb, var(--color-accent) 85%, #000))", "→")}
    </div>
  );


  // ── HISTORY PANE — Real events from Supabase ─────────────────────────
  // Color map for event types
  const eventColor = (type: string): string => {
    if (type === "created") return "var(--color-success)";
    if (type === "qty_changed" || type === "unit_changed") return "var(--color-info)";
    if (type === "important") return "var(--color-danger)";
    if (type === "note_changed") return "#c76dff";
    if (type === "checked") return "var(--color-success)";
    if (type === "translated") return "#34d6c0";
    if (type === "price_added") return "var(--color-shelf)";
    if (type === "comment") return "var(--color-accent)";
    return "var(--color-text-soft)";
  };
  const displayHistory = history.map(h => ({
    id: h.id,
    t: relativeTime(h.created_at),
    icon: h.icon || "📝",
    text: h.description,
    color: eventColor(h.event_type),
  }));
  const emptyHistMessage = (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: "var(--color-text-muted)", fontSize: 12, textAlign: "center", padding: 20 }}>
      <span style={{ fontSize: 32, opacity: 0.4 }}>📋</span>
      <span>Sin historial todavía.<br/>Las acciones se registrarán aquí.</span>
    </div>
  );

  const histPane = (
    // v1: Timeline Dots
    <div key="h0" style={{ padding: "12px 16px 12px 32px", position: "relative", flex: 1, overflow: "auto" }}>
      {displayHistory.length === 0 ? emptyHistMessage : (
        <>
          <div style={{ position: "absolute", left: 22, top: 36, bottom: 16, width: 2, background: "color-mix(in srgb, var(--color-text) 6%, transparent)" }} />
          {displayHistory.map(e => (
            <div key={e.id} style={{ position: "relative", padding: "6px 0 14px 16px" }}>
              <div style={{ position: "absolute", left: -6, top: 10, width: 10, height: 10, borderRadius: "50%", background: e.color, border: "2px solid var(--color-bg, #0d1017)" }} />
              <div style={{ fontSize: 9, color: "var(--color-text-muted)" }}>{e.t}</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{e.icon} {e.text}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );


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
      data-theme-view="details"
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
          border: "1px solid color-mix(in srgb, var(--color-text) 10%, transparent)",
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
                background: activeTab === tab.key ? "var(--color-card)" : "transparent",
                border: activeTab === tab.key ? "1px solid color-mix(in srgb, var(--color-text) 10%, transparent)" : "none",
              }}
            >
              {tab.icon}
              {activeTab === tab.key && (
                <span style={{ position: "absolute", right: -2, top: "50%", transform: "translateY(-50%)", width: 3, height: 12, background: "var(--color-accent)", borderRadius: 2 }} />
              )}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => setActiveTab("del")}
            style={{
              ...tabBtnBase,
              color: "var(--color-danger)",
              background: activeTab === "del" ? "var(--color-card)" : "transparent",
              border: activeTab === "del" ? "1px solid color-mix(in srgb, var(--color-danger) 20%, transparent)" : "none",
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
            aria-label={t(lang, "close")}
            style={{
              position: "absolute", top: 8, right: 10, zIndex: 10,
              width: 28, height: 28, borderRadius: 9,
              background: "color-mix(in srgb, var(--color-text) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--color-text) 10%, transparent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, color: "var(--color-text-soft)", cursor: "pointer",
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
