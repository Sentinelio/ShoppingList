import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { createElement } from "react";
import { isTokenExpired } from "pocketbase";
import { pb, IS_DEMO, type User } from "../lib/pocketbase";
import { demoCreateUser, demoGetUser, demoUpdateUser } from "../lib/demoStore";
import { getCountryLang } from "../data/countries";
import { isNetworkError, isRejectedCredentials } from "../lib/netError";

// Demo mode keeps the old local-only user id.
const STORAGE_KEY = "polyglot_user_id";

// Real mode: invisible PocketBase account. The first launch creates a user
// with a random email/password; both stay in localStorage and are reused to
// sign in on every later launch. The person never sees any of it.
const CREDS_KEY = "babelcart_pb_credentials";

interface Credentials { email: string; password: string }

function readCreds(): Credentials | null {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Credentials;
    return c.email && c.password ? c : null;
  } catch {
    return null;
  }
}

function randomPassword(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

/** The signed-in user, straight from pb.authStore. */
function currentUser(): User | null {
  return (pb.authStore.isValid ? (pb.authStore.record as unknown as User) : null) ?? null;
}

/** Why opening the invisible session failed (no usable session left). */
export type AuthError = "network" | "other" | null;

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authError: AuthError;
  /** Try opening the session again after an authError. */
  retryAuth: () => void;
  shelfLang: string;
  createUser: (name: string, lang: string, country: string) => Promise<void>;
  updateUser: (updates: Partial<Pick<User, "name" | "lang" | "country" | "avatar_color" | "notification_prefs">>) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<AuthError>(null);
  const [authAttempt, setAuthAttempt] = useState(0);
  const retryAuth = useCallback(() => {
    setLoading(true);
    setAuthAttempt(n => n + 1);
  }, []);

  useEffect(() => {
    if (IS_DEMO) {
      const storedId = localStorage.getItem(STORAGE_KEY);
      if (storedId) {
        const u = demoGetUser(storedId);
        if (u) setUser(u);
        else localStorage.removeItem(STORAGE_KEY);
      }
      setLoading(false);
      return;
    }

    const creds = readCreds();
    if (!creds) {
      pb.authStore.clear();
      setLoading(false);
      return;
    }

    setAuthError(null);
    pb.collection("users")
      .authWithPassword(creds.email, creds.password)
      .then(({ record }) => {
        setUser(record as unknown as User);
        // Update last_seen_at silently
        pb.collection("users").update(record.id, { last_seen_at: new Date().toISOString() }).catch(() => {});
      })
      .catch((err: unknown) => {
        console.error("[auth] could not open the session", err);
        if (isRejectedCredentials(err)) {
          // Account gone (e.g. server reset): start over with the setup wizard.
          localStorage.removeItem(CREDS_KEY);
          pb.authStore.clear();
          return;
        }
        // Network or server trouble: keep the credentials. Go on with the
        // cached session if there is one, otherwise ask to retry (never
        // fall through to the setup wizard, which would create a 2nd account).
        const cached = currentUser();
        if (cached) setUser(cached);
        else setAuthError(isNetworkError(err) ? "network" : "other");
      })
      .finally(() => setLoading(false));
  }, [authAttempt]);

  const createUser = useCallback(
    async (name: string, lang: string, country: string) => {
      if (IS_DEMO) {
        const newUser = demoCreateUser(name, lang, country);
        localStorage.setItem(STORAGE_KEY, newUser.id);
        setUser(newUser);
        return;
      }

      // A previous attempt may have created the account and then failed to
      // sign in: reuse it instead of creating another one.
      const saved = readCreds();
      if (saved) {
        try {
          const { record } = await pb.collection("users").authWithPassword(saved.email, saved.password);
          const updated = await pb.collection("users").update(record.id, { name, lang, country });
          setAuthError(null);
          setUser(updated as unknown as User);
          return;
        } catch (err) {
          if (!isRejectedCredentials(err)) throw err;
          localStorage.removeItem(CREDS_KEY); // stale: create a fresh account
        }
      }

      const creds: Credentials = {
        email: `${crypto.randomUUID()}@babelcart.app`,
        password: randomPassword(),
      };
      await pb.collection("users").create({
        email: creds.email,
        password: creds.password,
        passwordConfirm: creds.password,
        name,
        lang,
        country,
        avatar_color: "#f0883e",
      });
      localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
      const { record } = await pb.collection("users").authWithPassword(creds.email, creds.password);
      setAuthError(null);
      setUser(record as unknown as User);
    },
    [],
  );

  const updateUser = useCallback(
    async (updates: Partial<Pick<User, "name" | "lang" | "country" | "avatar_color" | "notification_prefs">>) => {
      if (!user) return;

      if (IS_DEMO) {
        const updated = demoUpdateUser(user.id, updates);
        if (updated) setUser(updated);
        return;
      }

      const updated = await pb.collection("users").update(pb.authStore.record!.id, updates);
      setUser(updated as unknown as User);
    },
    [user],
  );

  // Keep the session alive. The token lasts 5 days and the app only signed
  // in when it started: a phone keeps the page open for days, and with an
  // expired token the server answers as a guest — "no lists", silently.
  // Renew it when it has less than a day left (back to the app, back
  // online, every 30 min); if it already expired, sign in again with the
  // credentials saved on this device. Screens reload on the new token
  // (useRefreshOnReturn).
  useEffect(() => {
    if (IS_DEMO || !user) return;
    let busy = false;
    const keepAlive = async () => {
      const creds = readCreds();
      if (busy || !creds || (pb.authStore.token && !isTokenExpired(pb.authStore.token, 24 * 3600))) return;
      busy = true;
      try {
        if (pb.authStore.isValid) await pb.collection("users").authRefresh();
        else await pb.collection("users").authWithPassword(creds.email, creds.password);
      } catch (err) {
        try {
          await pb.collection("users").authWithPassword(creds.email, creds.password);
        } catch (err2) {
          console.error("[auth] could not renew the session", err, err2);
        }
      } finally {
        busy = false;
      }
    };
    void keepAlive();
    const onVisible = () => { if (document.visibilityState === "visible") void keepAlive(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", keepAlive);
    const timer = setInterval(keepAlive, 30 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", keepAlive);
      clearInterval(timer);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- re-arm per account, not per profile edit

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    if (!IS_DEMO) {
      localStorage.removeItem(CREDS_KEY);
      pb.authStore.clear();
    }
    setUser(null);
  }, []);

  const shelfLang = useMemo(
    () => (user ? getCountryLang(user.country) : "en"),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, authError, retryAuth, shelfLang, createUser, updateUser, logout }),
    [user, loading, authError, retryAuth, shelfLang, createUser, updateUser, logout],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
