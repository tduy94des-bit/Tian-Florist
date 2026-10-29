import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";
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

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account.trim() || !password) {
      toast.error("Vui lòng nhập đầy đủ tài khoản và mật khẩu");
      return;
    }
    setLoading(true);
    try {
      const { error } = await signIn(account, password);
      if (error) {
        toast.error(error.includes("Invalid login") ? "Tài khoản hoặc mật khẩu không đúng." : error);
      } else {
        toast.success("Đăng nhập thành công! Chào mừng trở lại 🌸");
        if (account.toLowerCase().includes("staff")) {
          navigate({ to: "/don-hang" });
        } else {
          navigate({ to: "/" });
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
          <p className="mt-1 text-sm text-muted-foreground">Đăng nhập hệ thống</p>
        </div>

        {/* Card Form */}
        <div className="card-soft bg-card p-6 rounded-3xl border border-border/70 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account / Username / Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Tài khoản</label>
              <input
                type="text"
                required
                className="field"
                placeholder="Nhập tên tài khoản hoặc email..."
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="field pr-10"
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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
                  Đang đăng nhập...
                </span>
              ) : (
                <>
                  <LogIn className="h-4 w-4" /> Đăng nhập
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          🌸 Tiệm Hoa — Hệ thống quản lý & bán hàng nội bộ
        </p>
      </div>
    </div>
  );
}
