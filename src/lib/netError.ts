import { ClientResponseError } from "pocketbase";

// True when the request never got an answer: server down, no network, or
// the browser blocked it (e.g. local-network access with Tailscale on).
// The SDK reports those as ClientResponseError with status 0.
export function isNetworkError(err: unknown): boolean {
  if (err instanceof ClientResponseError) return err.status === 0;
  return err instanceof TypeError; // raw fetch failure
}

// The server answered that these credentials don't exist / are wrong.
export function isRejectedCredentials(err: unknown): boolean {
  return err instanceof ClientResponseError && [400, 401, 403, 404].includes(err.status);
}
