import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";
import type { User, Session } from "@supabase/supabase-js";

export type UserRole = "admin" | "staff";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  switchRole: (newRole: UserRole) => Promise<void>;
  isAdmin: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchRole(user: User): Promise<UserRole> {
  const userId = user.id;
  const email = (user.email || "").toLowerCase();

  // 1. If email contains "admin", always grant admin role
  if (email.includes("admin")) {
    try {
      // Sync to database in background
      supabase.from("profiles").update({ role: "admin" }).eq("id", userId).then();
    } catch {
      // ignore
    }
    return "admin";
  }

  // 2. Check localStorage override if user toggled roles for testing
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(`tiemhoa_role_${userId}`);
    if (saved === "admin" || saved === "staff") {
      return saved as UserRole;
    }
  }

  // 3. Check profiles table in Supabase
  try {
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (!profErr && prof?.role) {
      return prof.role as UserRole;
    }
  } catch {
    // ignore
  }

  // 4. Check user_roles table
  try {
    const { data: ur, error: urErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (!urErr && ur?.role) {
      return ur.role as UserRole;
    }
  } catch {
    // ignore
  }

  // 5. Fallback to user metadata
  const metaRole = (user.user_metadata?.["role"] as string) || (user.app_metadata?.["role"] as string);
  if (metaRole === "admin" || metaRole === "staff") {
    return metaRole as UserRole;
  }

  return "staff"; // Default role
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const role = await fetchRole(session.user);
        setState({ user: session.user, session, role, loading: false });
      } else {
        setState({ user: null, session: null, role: null, loading: false });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const role = await fetchRole(session.user);
          setState({ user: session.user, session, role, loading: false });
        } else {
          setState({ user: null, session: null, role: null, loading: false });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, loading: true }));
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setState((s) => ({ ...s, loading: false }));
      return { error: error.message };
    }
    if (data.session?.user) {
      const role = await fetchRole(data.session.user);
      setState({ user: data.session.user, session: data.session, role, loading: false });
    }
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const isAdmin = email.toLowerCase().includes("admin");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: isAdmin ? "admin" : "staff",
          full_name: isAdmin ? "Chủ Tiệm Hoa" : "Nhân Viên Tiệm Hoa",
        },
      },
    });
    if (error) return { error: error.message };
    if (data.user && isAdmin) {
      try {
        await supabase.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
      } catch {
        // ignore
      }
    }
    return { error: null };
  }, []);

  const switchRole = useCallback(async (newRole: UserRole) => {
    if (!state.user) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(`tiemhoa_role_${state.user.id}`, newRole);
    }
    try {
      await supabase.from("profiles").update({ role: newRole }).eq("id", state.user.id);
    } catch {
      // ignore
    }
    setState((s) => ({ ...s, role: newRole }));
  }, [state.user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, session: null, role: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signOut,
        switchRole,
        isAdmin: state.role === "admin",
        isStaff: state.role === "staff",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
