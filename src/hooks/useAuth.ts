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
import { supabase, IS_DEMO, type User } from "../lib/supabase";
import { demoCreateUser, demoGetUser, demoUpdateUser } from "../lib/demoStore";
import { getCountryLang } from "../data/countries";

const STORAGE_KEY = "polyglot_user_id";

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
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (!storedId) {
      setLoading(false);
      return;
    }

    if (IS_DEMO) {
      const u = demoGetUser(storedId);
      if (u) setUser(u);
      else localStorage.removeItem(STORAGE_KEY);
      setLoading(false);
      return;
    }

    supabase
      .from("users")
      .select("*")
      .eq("id", storedId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setUser(data as User);
          // Update last_seen_at silently
          supabase.from("users").update({ last_seen_at: new Date().toISOString() }).eq("id", storedId).then(() => {});
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
        setLoading(false);
      });
  }, []);

  const createUser = useCallback(
    async (name: string, lang: string, country: string) => {
      if (IS_DEMO) {
        const newUser = demoCreateUser(name, lang, country);
        localStorage.setItem(STORAGE_KEY, newUser.id);
        setUser(newUser);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .insert({ name, lang, country })
        .select()
        .single();

      if (error) throw error;
      const newUser = data as User;
      localStorage.setItem(STORAGE_KEY, newUser.id);
      setUser(newUser);
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

      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      setUser(data as User);
    },
    [user],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
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
