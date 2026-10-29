import type { ReactNode } from "react";

// Accent- and case-insensitive search helpers. "lech" matches "Lèche".

export function normalizeSearch(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

/** [start, end) of the first match of `query` inside `text`, in `text`'s own
 *  indexes, or null. Normalizes char by char so the indexes line up even
 *  when stripping accents changes the length. */
function findMatch(text: string, query: string): [number, number] | null {
  const q = normalizeSearch(query);
  if (!q) return null;
  let norm = "";
  const origin: number[] = []; // norm index → text index
  for (let i = 0; i < text.length; i++) {
    const n = text[i].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    for (let k = 0; k < n.length; k++) {
      norm += n[k];
      origin.push(i);
    }
  }
  const at = norm.indexOf(q);
  if (at < 0) return null;
  return [origin[at], origin[at + q.length - 1] + 1];
}

export function matchesSearch(text: string, query: string): boolean {
  return findMatch(text, query) !== null;
}

/** `text` with the matching part wrapped in a <mark>. */
export function highlight(text: string, query: string): ReactNode {
  const m = findMatch(text, query);
  if (!m) return text;
  return (
    <>
      {text.slice(0, m[0])}
      <mark className="rounded-sm px-px" style={{ background: "rgba(240,136,62,0.35)", color: "inherit" }}>
        {text.slice(m[0], m[1])}
      </mark>
      {text.slice(m[1])}
    </>
  );
}
