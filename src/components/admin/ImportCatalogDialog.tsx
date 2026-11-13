import { useMemo, useRef, useState } from "react";
import { useBackToClose } from "../../lib/router";
import { pb } from "../../lib/pocketbase";
import { planImport, applyImport, type ParsedCatalog, type ExistingEntry, type ImportMode, type ApplyResult } from "../../lib/catalogIO";
import { getCustomStoreTypes, saveCustomStoreTypes, getCustomCategories, saveCustomCategories } from "../../lib/customStoreConfig";

interface Props {
  filename: string;
  parsed: ParsedCatalog;
  existing: ExistingEntry[];
  onClose: (changed: boolean) => void;
}

// Shows what importing a catalog file will do — new, changed, unchanged,
// unreadable rows — before writing anything; nothing is ever deleted.
export default function ImportCatalogDialog({ filename, parsed, existing, onClose }: Props) {
  const [mode, setMode] = useState<ImportMode>("merge");
  const [phase, setPhase] = useState<"plan" | "running" | "done">("plan");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [extrasAdded, setExtrasAdded] = useState({ stores: 0, cats: 0 });
  const stopRef = useRef(false);
  const [stopped, setStopped] = useState(false);
  useBackToClose(true, () => { if (phase !== "running") onClose(phase === "done"); });

  const plan = useMemo(() => planImport(parsed.entries, existing, mode), [parsed, existing, mode]);
  const newStores = parsed.storeTypes.filter(s => !getCustomStoreTypes().some(c => c.id === s.id));
  const newCats = parsed.categories.filter(s => !getCustomCategories().some(c => c.id === s.id));
  const writes = plan.create.length + plan.update.length;

  const start = async () => {
    setPhase("running");
    // Custom store types / categories first (only the ones I don't have).
    if (newStores.length) saveCustomStoreTypes([...getCustomStoreTypes(), ...newStores]);
    if (newCats.length) saveCustomCategories([...getCustomCategories(), ...newCats]);
    setExtrasAdded({ stores: newStores.length, cats: newCats.length });
    const res = await applyImport(plan, {
      create: e => pb.collection("dictionary").create(e),
      update: (id, data) => pb.collection("dictionary").update(id, data),
    }, (done, total) => setProgress({ done, total }), () => stopRef.current);
    setResult(res);
    setPhase("done");
  };

  const box = "px-3 py-2 rounded-lg bg-bg";
  const stat = (n: number, label: string, tone = "text-text") => (
    <div className={`${box} flex-1 min-w-[90px]`}>
      <div className={`text-[18px] font-extrabold tabular-nums ${tone}`}>{n.toLocaleString()}</div>
      <div className="text-[10px] text-text-muted">{label}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Import catalog">
      <div className="absolute inset-0 bg-black/60" onClick={() => phase !== "running" && onClose(phase === "done")} />
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-card border border-border-light rounded-2xl shadow-2xl">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-base font-bold text-text">⬆️ Import catalog</h3>
          <p className="text-[12px] text-text-soft mt-1 break-all">
            {filename} · {parsed.kind.toUpperCase()} · {parsed.entries.length.toLocaleString()} entries read
          </p>
        </div>

        <div className="px-5 overflow-y-auto flex-1 min-h-0">
          {phase === "plan" && (
            <>
              <div className="text-[10px] font-bold tracking-wider text-text-muted uppercase mb-1.5">How</div>
              <div className="flex flex-col gap-1.5 mb-4">
                {([
                  ["merge", "Merge (recommended)", "Adds new entries. Existing ones only get the languages they are missing; your edits, categories and stores are kept."],
                  ["overwrite", "Overwrite", "Adds new entries. For existing ones, the file wins: translations, category, store and brand are replaced by the file's values (languages the file doesn't have are kept)."],
                ] as const).map(([id, title, text]) => (
                  <label key={id} className={`${box} flex gap-2.5 cursor-pointer border ${mode === id ? "border-accent" : "border-transparent"}`}>
                    <input type="radio" name="import-mode" checked={mode === id} onChange={() => setMode(id)} className="mt-1" />
                    <span>
                      <span className="block text-[13px] font-semibold text-text">{title}</span>
                      <span className="block text-[11px] text-text-soft">{text}</span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="text-[10px] font-bold tracking-wider text-text-muted uppercase mb-1.5">What will happen</div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {stat(plan.create.length, "new", "text-success")}
                {stat(plan.update.length, "updated", "text-accent")}
                {stat(plan.unchanged, "already the same")}
                {stat(parsed.invalid.length, "unreadable rows", parsed.invalid.length ? "text-danger" : "text-text")}
              </div>
              {(newStores.length > 0 || newCats.length > 0) && (
                <p className="text-[11px] text-text-soft mb-3">
                  Also adds {newStores.length} custom store type{newStores.length === 1 ? "" : "s"} and {newCats.length} custom categor{newCats.length === 1 ? "y" : "ies"} you don't have.
                </p>
              )}
              {plan.duplicatesInFile > 0 && (
                <p className="text-[11px] text-text-soft mb-3">{plan.duplicatesInFile} entries appear twice in the file: the last one is used.</p>
              )}

              {plan.update.length > 0 && (
                <details className="mb-3">
                  <summary className="text-[12px] font-semibold text-text cursor-pointer">Changes ({plan.update.length})</summary>
                  <div className="mt-1.5 flex flex-col gap-1 max-h-48 overflow-y-auto">
                    {plan.update.slice(0, 200).map(u => (
                      <div key={u.id} className={`${box} text-[11px]`}>
                        <b className="text-text">{u.key}</b> <span className="text-text-soft">{u.changes.join(" · ")}</span>
                      </div>
                    ))}
                    {plan.update.length > 200 && <div className="text-[11px] text-text-muted">…and {plan.update.length - 200} more</div>}
                  </div>
                </details>
              )}
              {plan.create.length > 0 && (
                <details className="mb-3">
                  <summary className="text-[12px] font-semibold text-text cursor-pointer">New ({plan.create.length})</summary>
                  <div className="mt-1.5 text-[11px] text-text-soft max-h-40 overflow-y-auto">
                    {plan.create.slice(0, 300).map(e => e.key).join(" · ")}
                    {plan.create.length > 300 && ` …and ${plan.create.length - 300} more`}
                  </div>
                </details>
              )}
              {parsed.invalid.length > 0 && (
                <details className="mb-3">
                  <summary className="text-[12px] font-semibold text-danger cursor-pointer">Unreadable rows ({parsed.invalid.length}) — they are skipped</summary>
                  <div className="mt-1.5 flex flex-col gap-0.5 max-h-40 overflow-y-auto text-[11px] text-text-soft">
                    {parsed.invalid.slice(0, 100).map((x, i) => <div key={i}>{x.where}: {x.why}</div>)}
                  </div>
                </details>
              )}
              <p className="text-[11px] text-text-muted mb-4">Nothing is deleted: entries that are not in the file stay as they are.</p>
            </>
          )}

          {phase === "running" && (
            <div className="mb-4">
              <div className="text-[13px] text-text mb-2">Importing… {progress.done.toLocaleString()} / {progress.total.toLocaleString()}</div>
              <div className="h-2 rounded-full bg-bg overflow-hidden">
                <div className="h-full bg-accent transition-[width]" style={{ width: `${progress.total ? (100 * progress.done) / progress.total : 0}%` }} />
              </div>
            </div>
          )}

          {phase === "done" && result && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {stat(result.created, "added", "text-success")}
                {stat(result.updated, "updated", "text-accent")}
                {stat(result.failed.length, "failed", result.failed.length ? "text-danger" : "text-text")}
              </div>
              {(extrasAdded.stores > 0 || extrasAdded.cats > 0) && (
                <p className="text-[11px] text-text-soft mb-2">Custom store types added: {extrasAdded.stores} · custom categories added: {extrasAdded.cats}.</p>
              )}
              {stopped && <p className="text-[11px] text-text-soft mb-2">Stopped before the end: the rest was not imported.</p>}
              {result.failed.length > 0 && (
                <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto text-[11px] text-danger">
                  {result.failed.slice(0, 100).map((f, i) => <div key={i}>{f.key}: {f.why}</div>)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-border">
          {phase === "plan" && (
            <>
              <button type="button" onClick={() => onClose(false)}
                className="flex-1 py-2.5 rounded-xl border border-border-light text-text-soft text-[13px] font-semibold cursor-pointer">Cancel</button>
              <button type="button" onClick={start} disabled={writes === 0 && newStores.length === 0 && newCats.length === 0}
                className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-bold cursor-pointer disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}>
                {writes ? `Import ${writes.toLocaleString()}` : "Nothing to import"}
              </button>
            </>
          )}
          {phase === "running" && (
            <button type="button" onClick={() => { stopRef.current = true; setStopped(true); }}
              className="flex-1 py-2.5 rounded-xl border border-border-light text-danger text-[13px] font-semibold cursor-pointer">Stop</button>
          )}
          {phase === "done" && (
            <button type="button" onClick={() => onClose(true)}
              className="flex-1 py-2.5 rounded-xl border border-border-light text-text text-[13px] font-semibold cursor-pointer">Close</button>
          )}
        </div>
      </div>
    </div>
  );
}
