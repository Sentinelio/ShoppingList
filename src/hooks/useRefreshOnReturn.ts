import { useEffect, useRef } from "react";
import { pb, IS_DEMO } from "../lib/pocketbase";

// Reloads a screen's data when the session changes (renewed after it had
// expired, which made the server return nothing) and when the app comes
// back to the foreground (a phone can keep the page open for days).
export function useRefreshOnReturn(refresh: () => void) {
  const ref = useRef(refresh);
  useEffect(() => { ref.current = refresh; }, [refresh]);

  useEffect(() => {
    if (IS_DEMO) return;
    let lastToken = pb.authStore.token;
    const unsubscribe = pb.authStore.onChange(token => {
      if (token && token !== lastToken) ref.current();
      lastToken = token;
    });
    const onVisible = () => { if (document.visibilityState === "visible") ref.current(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
