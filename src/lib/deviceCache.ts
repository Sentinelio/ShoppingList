// Last copy of what this device saw (my lists, a list's items…), so the app
// shows it at once on open instead of a spinner while the server answers —
// over mobile data / Tailscale that can take many seconds. The server's
// answer replaces it as soon as it arrives. Never the source of truth.

const PREFIX = "bc_cache:";

export function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the app just won't open instantly next time.
  }
}

export function removeCache(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

/** On logout: nothing of this person stays on the device. */
export function clearCache(): void {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
  } catch {
    // ignore
  }
}
