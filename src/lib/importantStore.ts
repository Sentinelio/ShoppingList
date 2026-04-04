// Local storage fallback for "important" flag, used when DB column isn't available
const KEY = "babelcart_important_items";

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

function save(set: Set<string>) {
  localStorage.setItem(KEY, JSON.stringify([...set]));
}

export function isLocallyImportant(itemId: string): boolean {
  return load().has(itemId);
}

export function setLocallyImportant(itemId: string, important: boolean) {
  const set = load();
  if (important) set.add(itemId);
  else set.delete(itemId);
  save(set);
}

export function getAllLocallyImportant(): Set<string> {
  return load();
}
