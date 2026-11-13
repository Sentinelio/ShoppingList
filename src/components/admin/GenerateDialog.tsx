import { useRef, useState } from "react";
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
  /** Tokens this call used and the model, to count the cost. */
  usage?: { input: number; output: number };
  model?: string;
}

type RowState =
  | { state: "pending" }
  | { state: "running"; added: number; batch: number }
  | { state: "done"; added: number; updated: number; batches: number; why: "target" | "exhausted" | "stopped" | "budget" | "dry" }
  | { state: "error"; added: number; message: string };

interface Props {
  mode: GenerateMode;
  targets: GenerateTarget[];
  langs: string[];
  // Generates one batch for one category; throws on failure (the caller reports it).
  run: (target: GenerateTarget, count: number) => Promise<GenerateResult>;
  onClose: (ran: boolean) => void;
}

// $ per million tokens (input, output). Unknown models count as Sonnet so the
// estimate errs on the expensive side.
const PRICES: Record<string, [number, number]> = {
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-sonnet-5-5": [2, 10],
};
const DEFAULT_MODEL = "claude-haiku-5-5";
const priceOf = (model?: string) => PRICES[model || DEFAULT_MODEL] ?? PRICES["claude-sonnet-5-5"];
const costOf = (u: { input: number; output: number } | undefined, model?: string) => {
  if (!u) return 0;
  const [pin, pout] = priceOf(model);
  return (u.input * pin + u.output * pout) / 1e6;
};
// Rough output size of one entry: ~25 tokens per language (JSON included),
// plus some thinking. Only for the estimate shown before starting.
const TOKENS_PER_ENTRY_LANG = 30;
const MAX_BATCH = 60;
const PRESETS = [50, 300, 1000];
const money = (n: number) => (n < 0.01 ? "<$0.01" : `$${n < 10 ? n.toFixed(2) : Math.round(n)}`);

// Shows what "Generate" will do — how many entries per category, in which
// categories and languages, roughly what it costs — then generates in batches
// until each category reaches the target or runs out of new entries.
export default function GenerateDialog({ mode, targets, langs, run, onClose }: Props) {
  const [perCategory, setPerCategory] = useState(mode === "brands" ? 15 : 50);
  const [budget, setBudget] = useState(5);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [phase, setPhase] = useState<"plan" | "running" | "done">("plan");
  const [spent, setSpent] = useState(0);
  const stopRef = useRef(false);
  const [stopping, setStopping] = useState(false);
  // Back closes it — except while generating.
  useBackToClose(true, () => { if (phase !== "running") onClose(phase === "done"); });

  const langCodes = ["en", ...langs.filter(c => c !== "en")];
  const flag = (code: string) => ALL_LANGUAGES.find(l => l.code === code)?.flag ?? "";
  const batchSize = Math.max(10, Math.min(MAX_BATCH, Math.floor(9000 / (TOKENS_PER_ENTRY_LANG * langCodes.length))));
  const total = perCategory * targets.length;
  const estimate = (total * langCodes.length * TOKENS_PER_ENTRY_LANG * priceOf()[1]) / 1e6;

  const start = async () => {
    setPhase("running");
    stopRef.current = false;
    let spentSoFar = 0;
    for (const t of targets) {
      const id = t.seed.id;
      if (stopRef.current) { setRows(r => ({ ...r, [id]: { state: "done", added: 0, updated: 0, batches: 0, why: "stopped" } })); continue; }
      if (spentSoFar >= budget) { setRows(r => ({ ...r, [id]: { state: "done", added: 0, updated: 0, batches: 0, why: "budget" } })); continue; }
      let added = 0, updated = 0, batches = 0, lowStreak = 0;
      let why: "target" | "exhausted" | "stopped" | "budget" | "dry" = "target";
      setRows(r => ({ ...r, [id]: { state: "running", added: 0, batch: 1 } }));
      try {
        while (added < perCategory) {
          if (stopRef.current) { why = "stopped"; break; }
          if (spentSoFar >= budget) { why = "budget"; break; }
          const n = Math.min(batchSize, perCategory - added);
          batches++;
          setRows(r => ({ ...r, [id]: { state: "running", added, batch: batches } }));
          // The server already retries Anthropic's short outages; if the
          // batch still fails, wait a bit longer and try it once more.
          let res: GenerateResult;
          try {
            res = await run(t, n);
          } catch (firstErr) {
            if (stopRef.current) throw firstErr;
            setRows(r => ({ ...r, [id]: { state: "running", added, batch: batches } }));
            await new Promise(ok => setTimeout(ok, 20000));
            res = await run(t, n);
          }
          if (res.dryRun) { why = "dry"; break; }
          spentSoFar += costOf(res.usage, res.model);
          setSpent(spentSoFar);
          added += res.created;
          updated += res.updated;
          // Two batches in a row with (almost) nothing new: the section has
          // run out of real products — stop instead of paying for repeats.
          lowStreak = res.created < Math.max(2, Math.ceil(n * 0.1)) ? lowStreak + 1 : 0;
          if (lowStreak >= 2) { why = "exhausted"; break; }
        }
        setRows(r => ({ ...r, [id]: { state: "done", added, updated, batches, why } }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setRows(r => ({ ...r, [id]: { state: "error", added, message } }));
      }
    }
    setPhase("done");
    setStopping(false);
  };

  const finished = Object.values(rows).filter(r => r.state === "done" || r.state === "error").length;
  const addedAll = Object.values(rows).reduce((n, r) => n + (r.state === "running" || r.state === "done" || r.state === "error" ? r.added : 0), 0);
  const failed = Object.values(rows).filter(r => r.state === "error").length;
  const whyText = { target: "target reached", exhausted: "no more new ones", stopped: "stopped", budget: "spend cap reached", dry: "dry run: nothing saved" } as const;
  const numInput = "w-24 px-3 py-1.5 rounded-lg bg-bg border border-border-light text-text text-[13px] text-right";

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
              <>Up to <b className="text-text">{perCategory.toLocaleString()}</b> new {mode === "brands" ? "brands" : "entries"} in each of{" "}
                <b className="text-text">{targets.length}</b> {targets.length === 1 ? "category" : "categories"}, in batches of {batchSize}.
                Estimated cost ≈ <b className="text-text">{money(Math.min(estimate, budget))}</b>
                {estimate > budget && <> (the cap stops it at {money(budget)}; the full run would be ≈{money(estimate)})</>}.</>
            )}
            {phase === "running" && (
              <>Generating… {finished}/{targets.length} categories · +{addedAll.toLocaleString()} new · spent {money(spent)} of {money(budget)}. Keep this tab open.</>
            )}
            {phase === "done" && (
              <>Done: <b className="text-text">{addedAll.toLocaleString()}</b> new · spent {money(spent)}
                {failed ? <>, <span className="text-danger">{failed} failed</span></> : null}.</>
            )}
          </p>
        </div>

        <div className="px-5 overflow-y-auto flex-1 min-h-0">
          {phase === "plan" && (
            <div className="flex flex-col gap-2 mb-4">
              <label className="flex items-center gap-3">
                <span className="text-[12px] text-text-soft flex-1">New {mode === "brands" ? "brands" : "entries"} per category</span>
                <input type="number" min={1} max={100000} value={perCategory}
                  onChange={e => setPerCategory(Math.max(1, Math.min(100000, Math.floor(Number(e.target.value)) || 1)))}
                  className={numInput} />
              </label>
              <div className="flex gap-1.5 justify-end">
                {PRESETS.map(p => (
                  <button key={p} type="button" onClick={() => setPerCategory(p)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${perCategory === p ? "bg-accent text-white" : "bg-bg text-text-soft"}`}>
                    {p.toLocaleString()}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-3">
                <span className="text-[12px] text-text-soft flex-1">Spend cap for this run (USD)</span>
                <input type="number" min={0.1} max={500} step={0.5} value={budget}
                  onChange={e => setBudget(Math.max(0.1, Math.min(500, Number(e.target.value) || 0.1)))}
                  className={numInput} />
              </label>
              <p className="text-[11px] text-text-muted">
                Each batch tells Claude what the category already has, so it brings new entries. A category stops early when two
                batches in a row bring (almost) nothing new.
              </p>
            </div>
          )}

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
                    {row.state === "running" && (
                      <div className="text-[10px] text-text-soft">+{row.added}/{perCategory} · batch {row.batch}</div>
                    )}
                    {row.state === "done" && (
                      <div className="text-[10px] text-success">
                        +{row.added} new{row.updated ? ` · ${row.updated} completed` : ""} · {whyText[row.why]}
                      </div>
                    )}
                    {row.state === "error" && <div className="text-[10px] text-danger break-words">+{row.added} new · {row.message}</div>}
                  </div>
                  <span className="text-[11px] text-text-soft shrink-0 tabular-nums">
                    {row.state === "pending" && `≈${perCategory}`}
                    {row.state === "running" && "⏳"}
                    {row.state === "done" && "✅"}
                    {row.state === "error" && "❌"}
                  </span>
                </div>
              );
            })}
          </div>

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
          {phase === "plan" && (
            <>
              <button type="button" onClick={() => onClose(false)}
                className="flex-1 py-2.5 rounded-xl border border-border-light text-text-soft text-[13px] font-semibold cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={start}
                className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-bold cursor-pointer"
                style={{ background: mode === "brands" ? "#7c5cff" : "linear-gradient(135deg, #f09848, #e07028)" }}>
                Generate ≈{total.toLocaleString()}
              </button>
            </>
          )}
          {phase === "running" && (
            <button type="button" disabled={stopping} onClick={() => { stopRef.current = true; setStopping(true); }}
              className="flex-1 py-2.5 rounded-xl border border-border-light text-danger text-[13px] font-semibold cursor-pointer disabled:opacity-50">
              {stopping ? "Stopping after this batch…" : "Stop"}
            </button>
          )}
          {phase === "done" && (
            <button type="button" onClick={() => onClose(true)}
              className="flex-1 py-2.5 rounded-xl border border-border-light text-text text-[13px] font-semibold cursor-pointer">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
