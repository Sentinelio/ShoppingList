// Moves this device's session to the copy of the app the server serves
// itself (SERVER_APP_URL), without creating a second account: the app asks
// the server for a one-time code carrying its saved credentials, opens the
// other address with #transfer=CODE, and that address redeems it once
// (within 5 minutes). See pocketbase/pb_hooks/babelcart_transfer.pb.js.

import { pb, IS_DEMO, CREDS_KEY, SERVER_APP_URL, callRoute } from "./pocketbase";

/** Opens the server's copy of the app, signed in as me. */
export async function openOnServer(): Promise<void> {
  const raw = localStorage.getItem(CREDS_KEY);
  if (IS_DEMO || !raw || !SERVER_APP_URL) throw new Error("No saved session to move");
  const creds = JSON.parse(raw) as { email: string; password: string };
  const { code } = await callRoute<{ code: string }>("transfer/create", creds);
  window.location.href = `${SERVER_APP_URL}#transfer=${code}`;
}

export type TransferResult = "none" | "done" | "failed";

/** On arrival: redeem #transfer=CODE, if any, before the app starts. */
export async function redeemTransferFromUrl(): Promise<TransferResult> {
  const m = /^#transfer=([0-9A-Za-z]{8})$/.exec(window.location.hash);
  if (!m || IS_DEMO) return "none";
  // The code is single-use; take it out of the address and the history now.
  history.replaceState(null, "", window.location.pathname + window.location.search + "#/");
  try {
    const creds = await pb.send<{ email: string; password: string }>("/api/babelcart/transfer/redeem", {
      method: "POST",
      body: { code: m[1] },
    });
    const previous = localStorage.getItem(CREDS_KEY);
    if (previous && previous !== JSON.stringify(creds)) {
      // Another account was signed in at this address: keep its credentials
      // aside instead of losing them.
      localStorage.setItem(`${CREDS_KEY}_previous`, previous);
    }
    localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
    pb.authStore.clear();
    return "done";
  } catch (err) {
    console.error("[transfer] could not redeem the code", err);
    return "failed";
  }
}
