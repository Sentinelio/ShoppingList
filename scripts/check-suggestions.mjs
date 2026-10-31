// Checks the add-sheet suggestions against the WHOLE dictionary, not a few
// hand-picked words: every word prefix (2–5 letters) of every product name in
// every language is searched as a user of each app language, and each result
// list must satisfy the rules in src/lib/suggestRank.ts.
//
// Usage: npm run check:suggest -- [path/to/data.db]
//   (default C:/pocketbase/pb_data/data.db, opened read-only)

import { DatabaseSync } from "node:sqlite";
import {
  normalize, rankSuggestions, matchTier, exactSuggestion, shownName, otherNames,
  localToEntry, remoteToEntry, mergeEntries,
} from "../src/lib/suggestRank.ts";
import { LOCAL_DICTIONARY } from "../src/data/localDictionary.ts";

const DB = process.argv[2] || "C:/pocketbase/pb_data/data.db";
const USER_LANGS = ["es", "en", "pl"];
const LIMIT = 8; // what the add sheet asks for

const db = new DatabaseSync(DB, { readOnly: true });
const remote = db.prepare("SELECT key, translations, category, store_type FROM dictionary").all()
  .map(r => remoteToEntry({ ...r, translations: JSON.parse(r.translations || "{}") }));
const entries = mergeEntries(LOCAL_DICTIONARY.map(localToEntry), remote);

const words = n => n.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const wordStarts = (n, q) => n.startsWith(q) || words(n).some(w => w.startsWith(q));
const names = e => Object.values(e.translations).filter(Boolean).map(normalize);

// Every word prefix of 2–5 letters, plus every whole name.
const queries = new Set();
for (const e of entries) {
  for (const n of names(e)) {
    queries.add(n.trim());
    for (const w of words(n)) for (let len = 2; len <= Math.min(5, w.length); len++) queries.add(w.slice(0, len));
  }
}

const violations = new Map();
const flag = (rule, detail) => {
  const list = violations.get(rule) ?? [];
  list.push(detail);
  violations.set(rule, list);
};
let lists = 0, withExact = 0, withTyped = 0, totalResults = 0;

for (const q of queries) {
  if (q.length < 2) continue;
  for (const ul of USER_LANGS) {
    const res = rankSuggestions(entries, q, ul, LIMIT);
    lists++;
    totalResults += res.length;
    const where = `"${q}" (${ul})`;
    const tiers = entries.map(e => matchTier(e, q, ul));
    const startsExist = tiers.some(t => t >= 0 && t <= 4);
    const eligible = tiers.filter(t => t >= 0 && (t <= 4 || (!startsExist && q.length >= 4))).length;
    const anyExact = entries.some(e => names(e).some(n => n === q));

    // 1. Tiers never go back up.
    for (let i = 1; i < res.length; i++) {
      if (res[i].tier < res[i - 1].tier) { flag("tier order", `${where}: ${res[i - 1].key}(${res[i - 1].tier}) before ${res[i].key}(${res[i].tier})`); break; }
    }
    // 2. The name shown big really matches what was typed, as its tier says.
    for (const r of res) {
      const shown = normalize(shownName(r, ul)).trim();
      const ok = r.tier <= 1 ? shown === q : r.tier === 2 ? shown.startsWith(q) : r.tier <= 4 ? wordStarts(shown, q) : shown.includes(q);
      if (!ok) flag("shown name matches", `${where}: tier ${r.tier} shows "${shownName(r, ul)}" (${r.matchLang})`);
      if (!shown) flag("shown name not empty", `${where}: ${r.key}`);
      const others = otherNames(r, ul, "pl");
      if (others.some(o => normalize(o).trim() === shown) || new Set(others).size !== others.length) {
        flag("small names: no repeats", `${where}: ${shownName(r, ul)} / ${others.join(" · ")}`);
      }
    }
    // 3. My language wins: tiers 0, 2, 3 show my language's name.
    for (const r of res) if ([0, 2, 3].includes(r.tier) && r.matchLang !== ul) flag("my language shown", `${where}: ${r.key} tier ${r.tier} shows ${r.matchLang}`);
    // 4. Exact match ⇔ it comes first and «as typed» is hidden.
    const exact = exactSuggestion(res);
    if (anyExact && (!res[0] || !res[0].exact)) flag("exact match first", `${where}: first is ${res[0]?.key ?? "nothing"}`);
    if (!anyExact && exact) flag("no false exact", `${where}: ${exact.key}`);
    if (exact) withExact++; else withTyped++;
    // 5. No mid-word matches while something starts with the query.
    if (startsExist && res.some(r => r.tier === 5)) flag("no mid-word noise", `${where}: ${res.find(r => r.tier === 5).key}`);
    // 6. Supermarket first within a tier.
    for (let i = 1; i < res.length; i++) {
      const a = res[i - 1], b = res[i];
      if (a.tier === b.tier && a.storeType !== "grocery" && b.storeType === "grocery") { flag("grocery first", `${where}: ${a.key} (${a.storeType}) before ${b.key}`); break; }
    }
    // 7. Nothing missing: as many results as allowed and available.
    if (res.length !== Math.min(LIMIT, eligible)) flag("result count", `${where}: ${res.length} shown, ${eligible} eligible`);
  }
}

console.log(`Dictionary: ${entries.length} entries (${remote.length} from the server, ${LOCAL_DICTIONARY.length} built in)`);
console.log(`Checked ${lists} result lists (${queries.size} queries × ${USER_LANGS.length} user languages), ${(totalResults / lists).toFixed(1)} results each on average`);
console.log(`Exact match first: ${withExact} · «as typed» row shown: ${withTyped}`);
if (violations.size === 0) {
  console.log("All rules hold.");
} else {
  for (const [rule, list] of violations) {
    console.log(`\n✗ ${rule}: ${list.length}`);
    for (const d of list.slice(0, 5)) console.log(`   ${d}`);
  }
  process.exit(1);
}
