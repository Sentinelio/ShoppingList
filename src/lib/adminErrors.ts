// Admin failures must never be silent: every failed write goes through
// reportAdminError(), which logs the full error and tells the banner in
// AdminPage (AdminErrorBanner) to show it until dismissed.

import { ClientResponseError } from "pocketbase";
import { isNetworkError } from "./netError";

export interface AdminError {
  id: number;
  action: string;
  message: string;
  network: boolean;
}

const EVENT = "babelcart-admin-error";
let nextId = 1;

/** Readable server message: "Failed to create record. key: Value must be unique". */
export function describeError(err: unknown): string {
  if (err instanceof ClientResponseError) {
    const fields = Object.entries((err.response?.data ?? {}) as Record<string, { message?: string }>)
      .map(([k, v]) => `${k}: ${v?.message ?? JSON.stringify(v)}`);
    const base = err.response?.message || err.message || `HTTP ${err.status}`;
    return [`${base}${err.status ? ` (HTTP ${err.status})` : ""}`, ...fields].join(" · ");
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export function reportAdminError(action: string, err: unknown): void {
  console.error(`[admin] ${action} failed`, err);
  const detail: AdminError = { id: nextId++, action, message: describeError(err), network: isNetworkError(err) };
  window.dispatchEvent(new CustomEvent<AdminError>(EVENT, { detail }));
}

export function onAdminError(fn: (e: AdminError) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<AdminError>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}
