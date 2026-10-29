import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase";
import type { User, Session } from "@supabase/supabase-js";

export type UserRole = "admin" | "staff";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (accountOrEmail: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  createStaffAccount: (accountOrEmail: string, password: string, name?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  switchRole: (newRole: UserRole) => Promise<void>;
  isAdmin: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchRole(user: User): Promise<UserRole> {
  const userId = user.id;
  const email = (user.email || "").toLowerCase();
  const fullName = ((user.user_metadata?.["full_name"] as string) || "").toLowerCase();
  const metaRole = (user.user_metadata?.["role"] as string) || (user.app_metadata?.["role"] as string);

  // Xóa các key override test cũ trong localStorage để không bao giờ bị kẹt quyền sai
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(`tiemhoa_role_${userId}`);
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith("tiemhoa_role_")) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // ignore
    }
  }

  // 1. Kiểm tra nếu là nhân viên (Staff):
  // - Email chứa "staff"
  // - Hoặc metadata role là "staff"
  // - Hoặc tên có chữ "nhân viên" (như trong tài khoản mẫu: "Nhân Viên Tiệm Hoa")
  // - Hoặc tài khoản nằm trong danh sách Staff đã cấp trong Cài đặt
  let isCreatedStaff = false;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("tiemhoa_staff_accounts");
      if (raw) {
        const staffList: Array<{ account: string }> = JSON.parse(raw);
        isCreatedStaff = staffList.some(
          (s) =>
            s.account.toLowerCase() === email ||
            s.account.toLowerCase() === email.replace("@tiemhoa.vn", "")
        );
      }
    } catch {
      // ignore
    }
  }

  if (
    email.includes("staff") ||
    metaRole === "staff" ||
    fullName.includes("nhân viên") ||
    isCreatedStaff
  ) {
    return "staff";
  }

  // 2. Nếu email chứa "admin" hoặc metadata role là "admin" -> Chủ shop (Admin)
  if (email.includes("admin") || metaRole === "admin") {
    return "admin";
  }

  // 3. Kiểm tra bảng user_roles trong Supabase
  try {
    const { data: ur, error: urErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (!urErr && ur?.role && (ur.role === "admin" || ur.role === "staff")) {
      return ur.role as UserRole;
    }
  } catch {
    // ignore
  }

  // 4. Kiểm tra bảng profiles trong Supabase
  try {
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (!profErr && prof?.role && (prof.role === "admin" || prof.role === "staff")) {
      return prof.role as UserRole;
    }
  } catch {
    // ignore
  }

  return "staff"; // Mặc định là nhân viên
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

  const signIn = useCallback(async (accountOrEmail: string, password: string) => {
    setState((s) => ({ ...s, loading: true }));
    const trimmed = accountOrEmail.trim();
    const email = trimmed.includes("@") ? trimmed : `${trimmed.toLowerCase()}@tiemhoa.vn`;
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

  const createStaffAccount = useCallback(async (accountOrEmail: string, password: string, name?: string) => {
    const trimmed = accountOrEmail.trim();
    const cleanEmail = trimmed.includes("@") ? trimmed : `${trimmed.toLowerCase()}@tiemhoa.vn`;
    try {
      // Dùng client riêng biệt không lưu session để Admin không bị out đăng nhập
      const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      const { data, error } = await tempClient.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            role: "staff",
            full_name: name || trimmed,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        try {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            role: "staff",
          });
        } catch {
          // ignore
        }
      }
      return { error: null };
    } catch (err: any) {
      return { error: err?.message || "Lỗi tạo tài khoản nhân viên" };
    }
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
    if (typeof window !== "undefined") {
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith("tiemhoa_role_")) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // ignore
      }
    }
    await supabase.auth.signOut();
    setState({ user: null, session: null, role: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        createStaffAccount,
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
