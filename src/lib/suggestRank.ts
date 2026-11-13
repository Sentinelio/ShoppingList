// Dictionary suggestions: matching, ranking and which name to show.
// Pure (no imports) so scripts/check-suggestions.mjs can check it against
// the whole dictionary with plain Node.

export interface SuggestEntry {
  key: string;                          // canonical english/original text
  translations: Record<string, string>; // language code → localized name
  category: string;
  /** Store type of the entry ("grocery", "hardware"…); grocery ranks first. */
  storeType?: string;
  /** Lowercased, accent-stripped concatenation of all language values — used
   *  for the substring match. Never shown to the user. */
  haystack: string;
}

export interface RankedSuggestion extends SuggestEntry {
  /** Language whose name matched the query: that name is the one shown. */
  matchLang: string;
  /** The matched name equals the query (ignoring case and accents). */
  exact: boolean;
  /** 0–5, see matchTier. */
  tier: number;
  /** Set when the match is the singular/plural of what was typed ("tomates"
   *  → tomate): the row shows, and the item keeps, the typed form. */
  typed?: string;
}

export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function buildHaystack(translations: Record<string, string>): string {
  return Object.values(translations).map(normalize).join(" | ");
}

const words = (n: string) => n.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const wordStarts = (n: string, q: string) => n.startsWith(q) || words(n).some(w => w.startsWith(q));

// ── Singular / plural ────────────────────────────────────────────────────
// The dictionary keeps one form (mostly singular: "tomate", "manzana"; some
// plural: "patatas"), people type either. Without a full grammar, two words
// count as the same when the longer one is the shorter one plus a plural
// ending that the name's language ADDS to the singular. Endings that
// replace a vowel (it "mela/mele") are left out: they would make half-typed
// words ("tomat") match. The singular needs 4+ letters, so short words
// ("pan", "té") never pair up. Per language, so Spanish "taco" never
// pairs with "tacón" through the German -n.
const ENDINGS_BY_LANG: Record<string, string[]> = {
  es: ["s", "es"], pt: ["s", "es"], en: ["s", "es"], fr: ["s", "x"], ca: ["s", "os"],
  de: ["n", "en", "s"], nl: ["en", "s"], pl: ["y"],
};
const DEFAULT_ENDINGS = ["s", "es"];
const ALL_ENDINGS = [...new Set(Object.values(ENDINGS_BY_LANG).flat())];
function stems(w: string): Set<string> {
  const out = new Set([w]);
  for (const e of ALL_ENDINGS) if (w.endsWith(e) && w.length - e.length >= 4) out.add(w.slice(0, -e.length));
  return out;
}
function sameWord(a: string, b: string, lang?: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length < 4) return false;
  return (ENDINGS_BY_LANG[lang ?? ""] ?? DEFAULT_ENDINGS).some(e => long === short + e);
}
// Stems of each word of the query, computed once per query (matchTier runs
// for every dictionary entry).
let stemCache: { q: string; stems: string[][] } = { q: "", stems: [] };
function queryStems(q: string): string[][] {
  if (stemCache.q !== q) stemCache = { q, stems: words(q).map(w => [...stems(w)]) };
  return stemCache.stems;
}

/** Same name up to singular/plural, word by word ("huevos de corral" =
 *  "huevo de corral"). Both normalized; `lang` is the language of the
 *  dictionary name (its plural endings are the ones that count). */
export function sameName(a: string, b: string, lang?: string): boolean {
  if (a === b) return true;
  const wa = words(a), wb = words(b);
  if (!wa.length || wa.length !== wb.length) return false;
  return wa.every((w, i) => w === wb[i] || sameWord(w, wb[i], lang));
}

/** Tier of `entry` for the normalized query `q` (lower is better), or -1
 *  when it doesn't match. The user's own language comes first, and only
 *  names (or words of them) that START with the query count:
 *    0. exact match in `userLang`
 *    1. exact match in another language
 *    2. the name in `userLang` starts with the query
 *    3. a word of the name in `userLang` starts with the query
 *    4. a name in another language, or one of its words, starts with it
 *    5. contained mid-word — only used when nothing else matched and the
 *       query has 4+ letters (see rankSuggestions). */
export function matchTier(entry: SuggestEntry, q: string, userLang: string): number {
  const contains = entry.haystack.includes(q);
  // A name that is the singular of what was typed is contained in it with
  // the ending removed ("tomates" → "tomate"); the other way round (typed
  // the singular) the plural contains the query itself.
  if (!contains && !queryStems(q).every(ws => ws.some(x => entry.haystack.includes(x)))) return -1;
  const mine = entry.translations[userLang] ? normalize(entry.translations[userLang]) : "";
  const names = Object.values(entry.translations).map(normalize);
  // 0 and 1 also take the singular/plural of what was typed.
  if (mine && sameName(mine, q, userLang)) return 0;
  if (Object.entries(entry.translations).some(([l, n]) => n && sameName(normalize(n), q, l))) return 1;
  if (!contains) return -1;
  if (mine.startsWith(q)) return 2;
  if (mine && wordStarts(mine, q)) return 3;
  if (names.some(n => wordStarts(n, q))) return 4;
  return 5;
}

/** The language whose name explains `tier` — the one shown big:
 *  tiers 0, 2, 3 → mine; 1 → the exact one; 4 → the one whose name (or a
 *  word of it) starts with `q`; 5 → the one containing it. */
export function matchedLang(entry: SuggestEntry, q: string, userLang: string, tier: number): { lang: string; exact: boolean } {
  if (tier === 0 || tier === 2 || tier === 3) return { lang: userLang, exact: tier === 0 };
  if (tier === 1) {
    // The name equal to what was typed, else its singular/plural.
    for (const test of [(n: string) => n === q, (n: string, l: string) => sameName(n, q, l)]) {
      for (const [lang, name] of Object.entries(entry.translations)) {
        if (name && test(normalize(name), lang)) return { lang, exact: true };
      }
    }
  }
  const test: (n: string) => boolean = tier === 4 ? n => wordStarts(n, q) : n => n.includes(q);
  for (const [lang, name] of Object.entries(entry.translations)) {
    if (name && test(normalize(name))) return { lang, exact: tier === 1 };
  }
  return { lang: userLang, exact: false };
}

const isExactName = (e: SuggestEntry, q: string) => Object.values(e.translations).some(n => n && normalize(n).trim() === q);

export function rankSuggestions(entries: SuggestEntry[], query: string, userLang: string, limit: number): RankedSuggestion[] {
  const q = normalize(query).trim();
  if (q.length < 2) return [];
  const tiers: SuggestEntry[][] = [[], [], [], [], [], []];
  for (const entry of entries) {
    const tier = matchTier(entry, q, userLang);
    if (tier >= 0) tiers[tier].push(entry);
  }
  // Within a tier, supermarket products before hardware, pharmacy…
  // (sort is stable, so the dictionary order is kept otherwise).
  const nonGrocery = (e: SuggestEntry) => (e.storeType && e.storeType !== "grocery" ? 1 : 0);
  for (const tier of tiers) tier.sort((a, b) => nonGrocery(a) - nonGrocery(b));
  // Mid-word matches are noise unless nothing starts with the query.
  const startsCount = tiers.slice(0, 5).reduce((n, t) => n + t.length, 0);
  const useMidWord = startsCount === 0 && q.length >= 4;
  const out: RankedSuggestion[] = [];
  // Several entries can collapse to the same typed form (the dictionary has
  // both "patata" and "patatas"): show it once, the exact one first.
  for (const t of [0, 1]) {
    tiers[t].sort((a, b) => Number(!isExactName(a, q)) - Number(!isExactName(b, q)));
  }
  let typedShown = false;
  for (let tier = 0; tier < tiers.length && out.length < limit; tier++) {
    if (tier === 5 && !useMidWord) break;
    for (const e of tiers[tier]) {
      if (out.length >= limit) break;
      const m = matchedLang(e, q, userLang, tier);
      const row: RankedSuggestion = { ...e, matchLang: m.lang, exact: m.exact, tier };
      if (tier <= 1) {
        // Singular/plural of the name: keep the form that was typed.
        if (normalize(e.translations[m.lang] || "").trim() !== q) row.typed = query.trim();
        if (typedShown) continue; // what was typed is already offered
        typedShown = true;
      }
      out.push(row);
    }
  }
  return out;
}

/** The name a suggestion row shows big: the one in the language that was
 *  typed, else mine. */
export function shownName(s: RankedSuggestion, userLang: string): string {
  if (s.typed) return s.typed;
  return s.translations[s.matchLang] || s.translations[userLang] || s.key;
}

/** Names shown small under it: the list country's and mine, when different. */
export function otherNames(s: RankedSuggestion, userLang: string, shelfLang: string): string[] {
  const shown = normalize(shownName(s, userLang)).trim();
  // Typed as a plural of mine: mine adds nothing ("tomates" / "tomate").
  const mine = s.typed && s.matchLang === userLang ? undefined : s.translations[userLang] || s.key;
  return [...new Set([s.translations[shelfLang], mine].filter((n): n is string => !!n))]
    .filter(n => normalize(n).trim() !== shown);
}

/** The suggestion that equals what was typed, in any language (then no
 *  «as typed» row is shown and Enter adds it). */
export function exactSuggestion(suggestions: RankedSuggestion[]): RankedSuggestion | undefined {
  return suggestions.find(s => s.exact);
}

// ── Building the searchable entries (the app and the check script) ──────

const LANG_KEYS = ["en", "es", "pl", "de", "fr", "it", "pt"] as const;

/** An entry of LOCAL_DICTIONARY (src/data/localDictionary.ts). */
export function localToEntry(e: { en: string; cat: string } & Partial<Record<(typeof LANG_KEYS)[number], string>>): SuggestEntry {
  const tr: Record<string, string> = {};
  for (const k of LANG_KEYS) {
    const v = e[k];
    if (typeof v === "string" && v.trim()) tr[k] = v;
  }
  return { key: e.en || Object.values(tr)[0] || "", translations: tr, category: e.cat, storeType: "grocery", haystack: buildHaystack(tr) };
}

/** A row of the dictionary collection. */
export function remoteToEntry(row: { key: string; translations?: Record<string, string> | null; category: string; store_type?: string }): SuggestEntry {
  const translations = row.translations || {};
  return { key: row.key, translations, category: row.category, storeType: row.store_type || "grocery", haystack: buildHaystack(translations) };
}

/** Local + remote, deduplicated by the English name (remote keys are often
 *  in another language: "puerro" = "leek"); remote entries win. */
export function mergeEntries(local: SuggestEntry[], remote: SuggestEntry[]): SuggestEntry[] {
  const byKey = new Map<string, SuggestEntry>();
  const dedupeKey = (s: SuggestEntry) => normalize(s.translations.en || s.key).trim();
  for (const s of local) if (s.key) byKey.set(dedupeKey(s), s);
  for (const s of remote) if (s.key) byKey.set(dedupeKey(s), s);
  return Array.from(byKey.values());
}
