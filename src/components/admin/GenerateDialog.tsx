import { useState } from "react";
import { useBackToClose } from "../../lib/router";
import { ALL_LANGUAGES } from "../../data/allLanguages";
import type { SeedCategory } from "../../data/seedCategories";

export type GenerateMode = "generic" | "brands";

export interface GenerateTarget {
  seed: SeedCategory;
  catLabel: string;
  catEmoji: string;
  storeLabel: string;
  storeEmoji: string;
  existing: number; // entries already in that category
}

export interface GenerateResult {
  created: number;
  updated: number;
  unchanged: number;
  dryRun?: boolean;
}

type RowState =
  | { state: "pending" }
  | { state: "running" }
  | { state: "done"; result: GenerateResult }
  | { state: "error"; message: string };

interface Props {
  mode: GenerateMode;
  targets: GenerateTarget[];
  langs: string[];
  // Generates one category; throws on failure (the caller reports it).
  run: (target: GenerateTarget, count: number) => Promise<GenerateResult>;
  onClose: (ran: boolean) => void;
}

const BRAND_COUNT = 15;

// Shows what "Generate" will do — how many products, in which categories
// (and store types), in which languages — before calling Claude, then the
// outcome of every category.
export default function GenerateDialog({ mode, targets, langs, run, onClose }: Props) {
  const single = targets.length === 1;
  const [count, setCount] = useState(mode === "brands" ? BRAND_COUNT : targets[0]?.seed.count ?? 30);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [phase, setPhase] = useState<"plan" | "running" | "done">("plan");
  // Back closes it — except while generating.
  useBackToClose(true, () => { if (phase !== "running") onClose(phase === "done"); });

  const countFor = (t: GenerateTarget) => (single ? count : mode === "brands" ? BRAND_COUNT : t.seed.count);
  const total = targets.reduce((n, t) => n + countFor(t), 0);
  const langCodes = ["en", ...langs.filter(c => c !== "en")];
  const flag = (code: string) => ALL_LANGUAGES.find(l => l.code === code)?.flag ?? "";

  const start = async () => {
    setPhase("running");
    for (const t of targets) {
      setRows(r => ({ ...r, [t.seed.id]: { state: "running" } }));
      try {
        const result = await run(t, countFor(t));
        setRows(r => ({ ...r, [t.seed.id]: { state: "done", result } }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setRows(r => ({ ...r, [t.seed.id]: { state: "error", message } }));
      }
    }
    setPhase("done");
  };

  const finished = Object.values(rows).filter(r => r.state === "done" || r.state === "error").length;
  const sum = (k: keyof GenerateResult) =>
    Object.values(rows).reduce((n, r) => n + (r.state === "done" ? Number(r.result[k] ?? 0) : 0), 0);
  const failed = Object.values(rows).filter(r => r.state === "error").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Generate with Claude">
      <div className="absolute inset-0 bg-black/60" onClick={() => phase !== "running" && onClose(phase === "done")} />
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-card border border-border-light rounded-2xl shadow-2xl">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-base font-bold text-text">
            {mode === "brands" ? "®️ Generate brands" : "🧠 Generate items"}
          </h3>
          <p className="text-[12px] text-text-soft mt-1">
            {phase === "plan" && (
              <>Claude will create about <b className="text-text">{total}</b> {mode === "brands" ? "brands" : "entries"} in{" "}
                <b className="text-text">{targets.length}</b> catalog {targets.length === 1 ? "category" : "categories"}.</>
            )}
            {phase === "running" && <>Generating… {finished}/{targets.length} categories (≈20–60 s each). Keep this tab open.</>}
            {phase === "done" && (
              <>Done: <b className="text-text">{sum("created")}</b> new, <b className="text-text">{sum("updated")}</b> completed with missing languages,{" "}
                {sum("unchanged")} already there{failed ? <>, <span className="text-danger">{failed} failed</span></> : null}.</>
            )}
          </p>
        </div>

        <div className="px-5 overflow-y-auto flex-1 min-h-0">
          <div className="text-[10px] font-bold tracking-wider text-text-muted uppercase mb-1.5">Where</div>
          <div className="flex flex-col gap-1 mb-4">
            {targets.map(t => {
              const row = rows[t.seed.id] ?? { state: "pending" };
              return (
                <div key={t.seed.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg">
                  <span className="text-base shrink-0">{t.catEmoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-text truncate">{t.catLabel}</div>
                    <div className="text-[10px] text-text-muted truncate">
                      {t.storeEmoji} {t.storeLabel} · {t.existing} now
                    </div>
                    {row.state === "done" && (
                      <div className="text-[10px] text-success">
                        {row.result.dryRun ? "Dry run: nothing saved"
                          : `+${row.result.created} new · ${row.result.updated} completed · ${row.result.unchanged} already there`}
                      </div>
                    )}
                    {row.state === "error" && <div className="text-[10px] text-danger break-words">{row.message}</div>}
                  </div>
                  <span className="text-[11px] text-text-soft shrink-0 tabular-nums">
                    {row.state === "pending" && `≈${countFor(t)}`}
                    {row.state === "running" && "⏳"}
                    {row.state === "done" && "✅"}
                    {row.state === "error" && "❌"}
                  </span>
                </div>
              );
            })}
          </div>

          {single && phase === "plan" && (
            <label className="flex items-center gap-3 mb-4">
              <span className="text-[12px] text-text-soft flex-1">How many {mode === "brands" ? "brands" : "entries"}</span>
              <input type="number" min={1} max={60} value={count}
                onChange={e => setCount(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                className="w-20 px-3 py-1.5 rounded-lg bg-bg border border-border-light text-text text-[13px] text-right" />
            </label>
          )}

          <div className="text-[10px] font-bold tracking-wider text-text-muted uppercase mb-1.5">
            Languages ({langCodes.length}) — the ones enabled in Languages
          </div>
          <div className="flex flex-wrap gap-1 mb-4">
            {langCodes.map(c => (
              <span key={c} className="px-2 py-0.5 rounded-md bg-bg text-[11px] text-text-soft">{flag(c)} {c}</span>
            ))}
          </div>

          {phase === "plan" && (
            <p className="text-[11px] text-text-muted mb-4">
              Existing entries are not duplicated or moved: they only get the languages they are missing.
              Your edits are kept.
            </p>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-border">
          {phase === "plan" ? (
            <>
              <button type="button" onClick={() => onClose(false)}
                className="flex-1 py-2.5 rounded-xl border border-border-light text-text-soft text-[13px] font-semibold cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={start}
                className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-bold cursor-pointer"
                style={{ background: mode === "brands" ? "#7c5cff" : "linear-gradient(135deg, #f09848, #e07028)" }}>
                Generate ≈{total}
              </button>
            </>
          ) : (
            <button type="button" disabled={phase === "running"} onClick={() => onClose(true)}
              className="flex-1 py-2.5 rounded-xl border border-border-light text-text text-[13px] font-semibold cursor-pointer disabled:opacity-40">
              {phase === "running" ? "Generating…" : "Close"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
