import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../ui/Modal";
import { t } from "../../data/i18n";
import { getEnabledLangs } from "../../lib/langConfig";
import { parseReceipt, uploadReceiptPhoto } from "../../lib/receiptImport";
import { matchLineToItem } from "../../lib/receiptMatch";
import {
  applyReceipt, rollbackReceipt,
  type ReviewedLine, type ApplyReceiptResult,
} from "../../lib/receiptApply";
import { formatPrice } from "../../lib/itemData";
import type { Item, ParsedReceipt } from "../../lib/supabase";

const UNIT_OPTIONS = ["", "pcs", "pack", "kg", "g", "l", "ml", "cl"];

type Stage = "pick" | "uploading" | "analyzing" | "review" | "applying" | "done" | "error";

interface Props {
  open: boolean;
  onClose: () => void;
  listId: string;
  items: Item[];
  userLang: string;
  shelfLang: string;
  userId: string;
  userName: string;
  onApplied: () => void;
}

export default function ImportReceiptModal({
  open, onClose, listId, items, userLang, shelfLang, userId, userName, onApplied,
}: Props) {
  const [stage, setStage] = useState<Stage>("pick");
  const [errorMsg, setErrorMsg] = useState("");
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [reviewed, setReviewed] = useState<ReviewedLine[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [lastResult, setLastResult] = useState<ApplyReceiptResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset state whenever the modal opens fresh.
  useEffect(() => {
    if (open) {
      setStage("pick");
      setErrorMsg("");
      setParsed(null);
      setReviewed([]);
      setPhotoUrl(null);
      setProgress({ done: 0, total: 0 });
      setLastResult(null);
    }
  }, [open]);

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setStage("uploading");
      const url = await uploadReceiptPhoto(file);
      setPhotoUrl(url);
      setStage("analyzing");
      const targetLangs = [...new Set([userLang, shelfLang, "en", ...getEnabledLangs()])];
      const result = await parseReceipt({ file, targetLangs });
      setParsed(result);
      // Auto-match each line against existing items.
      const rows: ReviewedLine[] = result.lines.map((l) => {
        const match = matchLineToItem(l, items);
        // Prefer the user's language for the display name.
        const displayName = l.translations?.[userLang] || l.expanded_name || l.raw_name;
        return {
          include: true,
          raw_name: l.raw_name,
          expanded_name: displayName,
          translations: l.translations ?? {},
          category: l.category ?? "other",
          brand: l.brand,
          qty: l.qty,
          unit: l.unit,
          unit_price: l.unit_price,
          total_price: l.total_price,
          discount: l.discount,
          tax_category: l.tax_category,
          confidence: l.confidence,
          matched_item_id: match?.item.id ?? null,
        };
      });
      setReviewed(rows);
      setStage("review");
    } catch (err) {
      console.error("[import receipt]", err);
      const msg = err instanceof Error ? err.message : "unknown";
      if (msg === "not_a_receipt") setErrorMsg(t(userLang, "receiptNotARecipe"));
      else if (msg === "receipt_too_long") setErrorMsg(t(userLang, "receiptTooLong"));
      else setErrorMsg(t(userLang, "receiptParseError"));
      setStage("error");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const patch = (idx: number, p: Partial<ReviewedLine>) => {
    setReviewed((rs) => rs.map((r, i) => (i === idx ? { ...r, ...p } : r)));
  };

  const handleApply = async () => {
    if (!parsed) return;
    try {
      setStage("applying");
      setProgress({ done: 0, total: reviewed.filter((r) => r.include).length });
      const result = await applyReceipt({
        listId, parsed, reviewed, photoUrl, userId, userName,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      setLastResult(result);
      onApplied();
      if (result.errors.length > 0) {
        setErrorMsg(
          `${result.errors.length}/${result.outcomes.length} ${t(userLang, "receiptPartialFail")}: ${result.errors[0].error ?? ""}`,
        );
        setStage("error");
      } else {
        setStage("done");
        setTimeout(onClose, 900);
      }
    } catch (err) {
      console.error("[apply receipt]", err);
      const msg = err instanceof Error ? err.message : JSON.stringify(err ?? {});
      setErrorMsg(msg || "unknown");
      setStage("error");
    }
  };

  const handleRollback = async () => {
    if (!lastResult) return;
    try {
      setStage("applying");
      await rollbackReceipt(lastResult);
      setLastResult(null);
      onApplied();
      onClose();
    } catch (err) {
      console.error("[rollback]", err);
      setErrorMsg(err instanceof Error ? err.message : "rollback failed");
      setStage("error");
    }
  };

  const includedCount = useMemo(() => reviewed.filter((r) => r.include).length, [reviewed]);
  const currency = parsed?.currency ?? "EUR";

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            📸 {t(userLang, "importReceipt")}
          </h3>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {stage === "pick" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 0" }}>
            <button onClick={() => fileRef.current?.click()} style={primaryBtn}>
              📷 {t(userLang, "importReceipt")}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePick}
              style={{ display: "none" }}
            />
          </div>
        )}

        {(stage === "uploading" || stage === "analyzing" || stage === "applying") && (
          <div style={{ padding: "24px 0", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.75)" }}>
              {stage === "uploading" && t(userLang, "receiptUploading")}
              {stage === "analyzing" && t(userLang, "receiptAnalyzing")}
              {stage === "applying" && (
                progress.total > 0
                  ? `${t(userLang, "receiptApply")}… ${progress.done}/${progress.total}`
                  : t(userLang, "receiptApply") + "…"
              )}
            </div>
          </div>
        )}

        {stage === "error" && (
          <div style={{ padding: "16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ color: "#ff6b6b", fontSize: 13, wordBreak: "break-word" }}>❌ {errorMsg}</div>
            {lastResult && (
              <div style={{
                padding: 8, borderRadius: 6,
                background: "rgba(255,255,255,0.04)",
                fontSize: 12, color: "rgba(255,255,255,0.75)",
                maxHeight: 180, overflowY: "auto",
              }}>
                <div style={{ marginBottom: 4, fontWeight: 600 }}>
                  {lastResult.outcomes.filter((o) => !o.error).length} / {lastResult.outcomes.length} ✅
                </div>
                {lastResult.outcomes.map((o) => (
                  <div key={o.index} style={{ opacity: o.error ? 0.6 : 1 }}>
                    {o.error ? "❌" : o.createdNew ? "🆕" : "↔"}{" "}
                    {o.line.expanded_name || o.line.raw_name}
                    {o.error && <span style={{ color: "#ff6b6b" }}> · {o.error}</span>}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStage("pick")} style={primaryBtn}>
                {t(userLang, "tryAgain")}
              </button>
              {lastResult && lastResult.outcomes.some((o) => !o.error) && (
                <button
                  onClick={handleRollback}
                  style={{ ...primaryBtn, background: "#c23030" }}
                >
                  {t(userLang, "receiptRollback")}
                </button>
              )}
            </div>
          </div>
        )}

        {stage === "done" && (
          <div style={{ padding: "24px 0", textAlign: "center" }}>
            <div style={{ fontSize: 32 }}>✅</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 6 }}>
              {includedCount} {t(userLang, "receiptItemsFound")}
            </div>
          </div>
        )}

        {stage === "review" && parsed && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={headerGrid}>
              <div>
                <label style={label}>{t(userLang, "receiptStore")}</label>
                <div style={headerValue}>{parsed.store ?? "—"}</div>
              </div>
              <div>
                <label style={label}>{t(userLang, "receiptDate")}</label>
                <div style={headerValue}>
                  {parsed.date ? new Date(parsed.date).toLocaleDateString() : "—"}
                </div>
              </div>
              <div>
                <label style={label}>{t(userLang, "receiptTotal")}</label>
                <div style={headerValue}>
                  {parsed.total != null ? formatPrice(parsed.total, currency) : "—"}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
              {includedCount} / {reviewed.length} {t(userLang, "receiptItemsFound")}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {reviewed.map((r, idx) => (
                <LineRow
                  key={idx}
                  line={r}
                  items={items}
                  currency={currency}
                  onChange={(p) => patch(idx, p)}
                />
              ))}
            </div>

            <button
              onClick={handleApply}
              disabled={includedCount === 0}
              style={{ ...primaryBtn, opacity: includedCount === 0 ? 0.4 : 1, marginTop: 4 }}
            >
              {t(userLang, "receiptApply")} ({includedCount})
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function LineRow({
  line, items, currency, onChange,
}: {
  line: ReviewedLine;
  items: Item[];
  currency: string;
  onChange: (p: Partial<ReviewedLine>) => void;
}) {
  const matched = line.matched_item_id
    ? items.find((i) => i.id === line.matched_item_id)
    : null;
  const confLow = line.confidence === "low";

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: 8,
        background: confLow ? "rgba(255,193,7,0.08)" : "rgba(255,255,255,0.03)",
        opacity: line.include ? 1 : 0.45,
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <input
          type="checkbox"
          checked={line.include}
          onChange={(e) => onChange({ include: e.target.checked })}
          style={{ marginTop: 4 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            type="text"
            value={line.expanded_name ?? ""}
            onChange={(e) => onChange({ expanded_name: e.target.value })}
            placeholder={line.raw_name}
            style={nameInput}
          />
          <input
            type="text"
            value={line.brand ?? ""}
            onChange={(e) => onChange({ brand: e.target.value || null })}
            placeholder="Marca / brand"
            style={{ ...nameInput, marginTop: 4, fontSize: 12 }}
          />
          <div style={{ display: "flex", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
            <span>{line.raw_name}</span>
            {confLow && <span style={{ color: "#ffc107" }}>· ⚠️ low</span>}
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="number"
              step="0.001"
              value={line.qty ?? ""}
              onChange={(e) => {
                const v = e.target.value === "" ? null : Number(e.target.value);
                onChange({ qty: v });
              }}
              style={{ ...smallInput, width: 64 }}
              placeholder="qty"
            />
            <select
              value={line.unit ?? ""}
              onChange={(e) => onChange({ unit: e.target.value || null })}
              style={{ ...select, minWidth: 64 }}
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u} style={optionStyle}>{u || "—"}</option>
              ))}
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <input
                type="number"
                step="0.01"
                value={line.total_price ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  onChange({ total_price: v });
                }}
                style={{ ...smallInput, width: 76 }}
                placeholder="total"
              />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{currency}</span>
            </div>
            {line.discount > 0 && (
              <span style={{ fontSize: 11, color: "#4caf50" }}>−{formatPrice(line.discount, currency)}</span>
            )}
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <select
              value={line.matched_item_id ?? ""}
              onChange={(e) => onChange({ matched_item_id: e.target.value || null })}
              style={select}
            >
              <option value="" style={optionStyle}>+ new item</option>
              {items.map((i) => (
                <option key={i.id} value={i.id} style={optionStyle}>{i.original}</option>
              ))}
            </select>
          </div>
          {matched && (
            <div style={{ fontSize: 11, color: "#4caf50", marginTop: 4 }}>
              ↔ {matched.original}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── styles ─────────────────────────────────────────────
const primaryBtn: React.CSSProperties = {
  padding: "10px 14px",
  background: "var(--color-accent, #3b82f6)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};
const closeBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6,
  background: "rgba(255,255,255,0.08)", color: "#fff",
  border: "none", cursor: "pointer", fontSize: 14,
};
const headerGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 8,
  padding: "10px 12px",
  background: "rgba(255,255,255,0.04)",
  borderRadius: 8,
};
const label: React.CSSProperties = {
  display: "block", fontSize: 10, color: "rgba(255,255,255,0.5)",
  textTransform: "uppercase", letterSpacing: 0.5,
};
const headerValue: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: "#fff", marginTop: 2,
};
const nameInput: React.CSSProperties = {
  width: "100%",
  padding: "4px 6px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6,
  color: "#fff",
  fontSize: 13,
};
const select: React.CSSProperties = {
  padding: "4px 6px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6,
  color: "#fff",
  fontSize: 12,
  minWidth: 120,
};
const smallInput: React.CSSProperties = {
  padding: "4px 6px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6,
  color: "#fff",
  fontSize: 12,
};
// Native <option> elements ignore the parent select's color/background in
// most browsers when the dropdown expands; setting them explicitly fixes
// white-on-white invisible text on dark themes.
const optionStyle: React.CSSProperties = {
  background: "#151922",
  color: "#fff",
};
