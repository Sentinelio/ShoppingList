// Invite links: <app>/#join=CODE opens the join dialog with the code filled in.

export function joinUrl(code: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}#join=${encodeURIComponent(code)}`;
}

/** Code from a #join=CODE hash, or null. */
export function readJoinHash(hash = window.location.hash): string | null {
  const m = /^#join=([A-Za-z0-9]+)$/.exec(hash);
  return m ? m[1].toUpperCase() : null;
}
