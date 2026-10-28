import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Flower2, Eye, EyeOff, LogIn, UserPlus, ShieldCheck, UserCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Đăng nhập | Quản Lý Tiệm Hoa" },
      { name: "description", content: "Đăng nhập vào hệ thống quản lý tiệm hoa." },
    ],
  }),
  component: LoginPage,
});

type Mode = "login" | "register";

function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const fillCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setMode("login");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.includes("Invalid login") ? "Email hoặc mật khẩu không đúng." : error);
        } else {
          toast.success("Đăng nhập thành công! Chào mừng trở lại 🌸");
          // Check role if staff vs admin
          if (email.toLowerCase().includes("staff")) {
            navigate({ to: "/don-hang" });
          } else {
            navigate({ to: "/" });
          }
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          toast.error(error);
        } else {
          toast.success("Đã tạo tài khoản thành công! Bạn có thể đăng nhập ngay.");
          setMode("login");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo + Brand */}
        <div className="mb-6 text-center">
          <img
            src="/logo.png"
            alt="Tian Florist"
            className="mx-auto h-20 w-20 rounded-3xl object-cover shadow-md border border-border/40 mb-3"
          />
          <h1 className="font-display text-2xl font-bold text-foreground">Quản Lý Tiệm Hoa</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Đăng nhập hệ thống phân quyền" : "Tạo tài khoản nhân viên / quản lý"}
          </p>
        </div>

        {/* Quick Test Accounts Card */}
        <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-xs">
          <p className="font-semibold text-primary flex items-center gap-1.5 mb-2">
            <span>⚡ Tài khoản thử nghiệm có sẵn:</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials("admin@tiemhoa.vn", "AdminPassword123!")}
              className="flex flex-col items-start p-2 rounded-xl bg-card border border-border hover:border-primary transition-all text-left shadow-2xs group"
            >
              <span className="font-bold text-foreground group-hover:text-primary flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Admin
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">Toàn quyền tiệm hoa</span>
            </button>
            <button
              type="button"
              onClick={() => fillCredentials("staff@tiemhoa.vn", "StaffPassword123!")}
              className="flex flex-col items-start p-2 rounded-xl bg-card border border-border hover:border-sky-500 transition-all text-left shadow-2xs group"
            >
              <span className="font-bold text-foreground group-hover:text-sky-600 flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5 text-sky-500" /> Staff
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">Đơn hàng, Kho & Sổ quỹ</span>
            </button>
          </div>
        </div>

        {/* Card */}
        <div className="card-soft bg-card p-6 rounded-3xl border border-border/70 shadow-lg">
          {/* Mode Toggle */}
          <div className="mb-5 flex rounded-2xl bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-all ${
                mode === "login"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LogIn className="h-4 w-4" />
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-all ${
                mode === "register"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Đăng ký
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                required
                className="field"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  className="field pr-10"
                  placeholder="Tối thiểu 6 ký tự"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  {mode === "login" ? "Đang đăng nhập..." : "Đang tạo tài khoản..."}
                </span>
              ) : mode === "login" ? (
                <>
                  <LogIn className="h-4 w-4" /> Đăng nhập
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" /> Tạo tài khoản
                </>
              )}
            </button>
          </form>

          {mode === "register" && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Tài khoản mới sẽ được tự động thiết lập với vai trò{" "}
              <code className="rounded bg-muted px-1 font-mono text-[11px]">staff</code> (Nhân viên).
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          🌸 Tiệm Hoa — Hệ thống quản lý & bán hàng nội bộ
        </p>
      </div>
    </div>
  );
}
