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
import { ClientResponseError } from "pocketbase";
import { pb, IS_DEMO, type User } from "../lib/pocketbase";
import { demoCreateUser, demoGetUser, demoUpdateUser } from "../lib/demoStore";
import { getCountryLang } from "../data/countries";

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

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  shelfLang: string;
  createUser: (name: string, lang: string, country: string) => Promise<void>;
  updateUser: (updates: Partial<Pick<User, "name" | "lang" | "country" | "avatar_color">>) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

    pb.collection("users")
      .authWithPassword(creds.email, creds.password)
      .then(({ record }) => {
        setUser(record as unknown as User);
        // Update last_seen_at silently
        pb.collection("users").update(record.id, { last_seen_at: new Date().toISOString() }).catch(() => {});
      })
      .catch((err: unknown) => {
        if (err instanceof ClientResponseError && err.status === 0) {
          // Offline: keep going with the cached session, if any.
          setUser(currentUser());
        } else {
          // Account gone (e.g. server reset): start over with the setup wizard.
          console.warn("[auth] stored credentials rejected", err);
          localStorage.removeItem(CREDS_KEY);
          pb.authStore.clear();
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const createUser = useCallback(
    async (name: string, lang: string, country: string) => {
      if (IS_DEMO) {
        const newUser = demoCreateUser(name, lang, country);
        localStorage.setItem(STORAGE_KEY, newUser.id);
        setUser(newUser);
        return;
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
      setUser(record as unknown as User);
    },
    [],
  );

  const updateUser = useCallback(
    async (updates: Partial<Pick<User, "name" | "lang" | "country" | "avatar_color">>) => {
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
    () => ({ user, loading, shelfLang, createUser, updateUser, logout }),
    [user, loading, shelfLang, createUser, updateUser, logout],
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
