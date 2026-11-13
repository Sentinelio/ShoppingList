import { useRef, useState } from "react";
import { useBackToClose } from "../../lib/router";
import { callRoute } from "../../lib/pocketbase";

interface Entry { key: string; translations: Record<string, string> }

interface Props {
  lang: { code: string; name: string; flag: string; countries: { code: string; name: string; flag: string }[] };
  entries: Entry[];
  onClose: (changed: boolean) => void;
}

// $ per million tokens (input, output); unknown models count as Sonnet.
const PRICES: Record<string, [number, number]> = { "claude-haiku-5-5": [0.1, 0.5], "claude-sonnet-5-5": [2, 10] };
const costOf = (u?: { input: number; output: number }, model?: string) => {
  const [pin, pout] = PRICES[model || "claude-haiku-5-5"] ?? PRICES["claude-sonnet-5-5"];
  return u ? (u.input * pin + u.output * pout) / 1e6 : 0;
};
const money = (n: number) => (n < 0.01 ? "<$0.01" : `$${n.toFixed(2)}`);
const BATCH = 40;

// Asks Claude, in batches, for the word each country of a language uses when
// it differs from the catalog's one (en-US "candy" vs "sweets"), and stores
// only those. Existing regional words are never overwritten.
export default function RegionalDialog({ lang, entries, onClose }: Props) {
  const prefix = `${lang.code}-`;
  const withBase = entries.filter(e => e.translations?.[lang.code]);
  const notDone = withBase.filter(e => !Object.keys(e.translations).some(k => k.startsWith(prefix)));
  const [onlyNew, setOnlyNew] = useState(true);
  const [budget, setBudget] = useState(1);
  const [phase, setPhase] = useState<"plan" | "running" | "done">("plan");
  const [progress, setProgress] = useState({ done: 0, total: 0, updated: 0, variants: 0, spent: 0, errors: 0 });
  const [why, setWhy] = useState("");
  const stopRef = useRef(false);
  const [stopping, setStopping] = useState(false);
  useBackToClose(true, () => { if (phase !== "running") onClose(phase === "done"); });

  const todo = onlyNew ? notDone : withBase;
  const batches = Math.ceil(todo.length / BATCH);
  // ~25 output tokens per product (only the differences come back) plus the prompt.
  const estimate = (todo.length * 25 * 0.5 + todo.length * 12 * 0.1) / 1e6 * 4;

  const start = async () => {
    setPhase("running");
    stopRef.current = false;
    const p = { done: 0, total: todo.length, updated: 0, variants: 0, spent: 0, errors: 0 };
    setProgress({ ...p });
    let end = "Finished";
    for (let i = 0; i < todo.length; i += BATCH) {
      if (stopRef.current) { end = "Stopped"; break; }
      if (p.spent >= budget) { end = "Spend cap reached"; break; }
      const keys = todo.slice(i, i + BATCH).map(e => e.key);
      try {
        const res = await callRoute<{ processed: number; updated: number; variants: number; usage?: { input: number; output: number }; model?: string; dry_run?: boolean }>(
          "regional-variants", { lang: lang.code, langName: lang.name, countries: lang.countries.map(c => ({ code: c.code, name: c.name })), keys });
        if (res.dry_run) { end = "Dry run: nothing saved"; break; }
        p.updated += res.updated; p.variants += res.variants; p.spent += costOf(res.usage, res.model);
      } catch {
        p.errors++;
      }
      p.done = Math.min(todo.length, i + BATCH);
      setProgress({ ...p });
    }
    setWhy(end);
    setPhase("done");
    setStopping(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Regional words">
      <div className="absolute inset-0 bg-black/60" onClick={() => phase !== "running" && onClose(phase === "done")} />
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-card border border-border-light rounded-2xl shadow-2xl">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-base font-bold text-text">{lang.flag} Regional words · {lang.name}</h3>
          <p className="text-[12px] text-text-soft mt-1">
            For each catalog entry, Claude gives the word used in each of these countries <b className="text-text">only when it is different</b>
            {" "}(e.g. en-US «candy» vs «sweets»). Existing regional words are kept.
          </p>
        </div>
        <div className="px-5 overflow-y-auto flex-1 min-h-0 flex flex-col gap-3 pb-3">
          <div className="flex flex-wrap gap-1.5">
            {lang.countries.map(c => <span key={c.code} className="px-2 py-0.5 rounded-md bg-bg text-[11px] text-text-soft">{c.flag} {c.name}</span>)}
          </div>
          {phase === "plan" && (
            <>
              <label className="flex items-center gap-2.5 text-[12px] text-text-soft cursor-pointer">
                <input type="checkbox" checked={onlyNew} onChange={e => setOnlyNew(e.target.checked)} />
                Only entries without regional words yet ({notDone.length.toLocaleString()} of {withBase.length.toLocaleString()})
              </label>
              <label className="flex items-center gap-3">
                <span className="text-[12px] text-text-soft flex-1">Spend cap for this run (USD)</span>
                <input type="number" min={0.1} max={50} step={0.5} value={budget}
                  onChange={e => setBudget(Math.max(0.1, Math.min(50, Number(e.target.value) || 0.1)))}
                  className="w-24 px-3 py-1.5 rounded-lg bg-bg border border-border-light text-text text-[13px] text-right" />
              </label>
              <p className="text-[12px] text-text-soft">
                {todo.length.toLocaleString()} entries in {batches} batches of {BATCH} · estimated ≈ <b className="text-text">{money(estimate)}</b>
              </p>
            </>
          )}
          {phase !== "plan" && (
            <div>
              <div className="text-[13px] text-text mb-2">
                {progress.done.toLocaleString()} / {progress.total.toLocaleString()} checked · {progress.updated} entries with {progress.variants} regional words · spent {money(progress.spent)}
                {progress.errors ? <span className="text-danger"> · {progress.errors} batches failed</span> : null}
              </div>
              <div className="h-2 rounded-full bg-bg overflow-hidden">
                <div className="h-full bg-accent transition-[width]" style={{ width: `${progress.total ? (100 * progress.done) / progress.total : 0}%` }} />
              </div>
              {phase === "done" && <div className="text-[12px] text-text-soft mt-2">{why}.</div>}
            </div>
          )}
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-border">
          {phase === "plan" && (
            <>
              <button type="button" onClick={() => onClose(false)}
                className="flex-1 py-2.5 rounded-xl border border-border-light text-text-soft text-[13px] font-semibold cursor-pointer">Cancel</button>
              <button type="button" onClick={start} disabled={!todo.length || lang.countries.length < 2}
                className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-bold cursor-pointer disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #3dd68c, #1f9e63)" }}>
                Check {todo.length.toLocaleString()}
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
              className="flex-1 py-2.5 rounded-xl border border-border-light text-text text-[13px] font-semibold cursor-pointer">Close</button>
          )}
        </div>
      </div>
    </div>
  );
}
