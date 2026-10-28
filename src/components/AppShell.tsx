import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Flower2, LayoutDashboard, ClipboardList, Package, Wallet, Settings, LogOut, User, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import { useAuth, type UserRole } from "@/lib/auth";
import { toast } from "sonner";

type NavItem = {
  to: string;
  label: string;
  icon: React.ElementType;
  /** Roles allowed. Undefined = any authenticated user. */
  roles?: UserRole[];
};

const NAV: NavItem[] = [
  { to: "/", label: "Tổng quan", icon: LayoutDashboard, roles: ["admin"] },
  { to: "/don-hang", label: "Đơn hàng", icon: ClipboardList },
  { to: "/kho-hang", label: "Kho hàng", icon: Package },
  { to: "/so-quy", label: "Sổ quỹ", icon: Wallet },
  { to: "/cai-dat", label: "Cài đặt", icon: Settings, roles: ["admin"] },
] as const;

function useVisibleNav(role: UserRole | null) {
  // If role is admin or not yet resolved, show all tabs; if staff, only non-admin tabs
  if (role === "staff") {
    return NAV.filter((n) => !n.roles);
  }
  return NAV;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { storeInfo, loading: storeLoading } = useStore();
  const { user, role, loading: authLoading, signOut, switchRole } = useAuth();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const isLoginPage = routerState.location.pathname === "/login";

  const date = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
  });

  const visibleNav = useVisibleNav(role);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Đã đăng xuất thành công.");
    navigate({ to: "/login" });
  };

  const handleToggleRole = async () => {
    const nextRole: UserRole = role === "admin" ? "staff" : "admin";
    await switchRole(nextRole);
    toast.info(`Đã chuyển vai trò sang: ${nextRole === "admin" ? "👑 Chủ shop (Admin)" : "🧑‍💼 Nhân viên (Staff)"}`);
  };

  // Show loading while auth OR store is loading (only on non-login pages)
  if ((authLoading || storeLoading) && !isLoginPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Login page: render without shell
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Redirect unauthenticated users
  if (!user && !authLoading) {
    navigate({ to: "/login" });
    return null;
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      <header className="no-print border-b border-border/70 bg-card/95 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Tian Florist"
              className="h-10 w-10 rounded-2xl object-cover shadow-xs border border-border/40"
            />
            <div>
              <p className="font-display text-lg font-semibold leading-tight text-foreground">{storeInfo.name}</p>
              <p className="text-[11px] text-muted-foreground tracking-wide">Quản Lý Tiệm Hoa</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <p className="hidden text-sm capitalize text-muted-foreground md:block">{date}</p>

            {/* Role badge (Always visible + click to toggle for quick testing) */}
            <button
              type="button"
              onClick={handleToggleRole}
              title="Nhấp để đổi nhanh quyền giữa Admin và Staff để kiểm tra giao diện"
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border transition-all cursor-pointer shadow-2xs hover:scale-105 ${
                role === "admin"
                  ? "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-200"
                  : "bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:border-sky-700 dark:text-sky-200"
              }`}
            >
              <span>{role === "admin" ? "👑 Chủ shop" : "🧑‍💼 Nhân viên"}</span>
              <RefreshCw className="h-3 w-3 opacity-60 hover:opacity-100" />
            </button>

            {/* User email */}
            {user && (
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span className="max-w-[140px] truncate">{user.email}</span>
              </div>
            )}

            {/* Logout button */}
            {user && (
              <button
                type="button"
                onClick={handleSignOut}
                className="btn btn-ghost h-8 min-h-0 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
                title="Đăng xuất"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            )}
          </div>
        </div>

        {/* Desktop nav — filtered by role */}
        <nav className="mx-auto hidden max-w-6xl gap-1 px-4 pb-2.5 md:flex">
          {visibleNav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-muted/80 transition-colors"
              activeProps={{ className: "bg-primary/8 text-primary font-semibold" }}>
              <n.icon className="h-4 w-4" />{n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      {/* Mobile bottom nav — filtered by role */}
      <nav
        className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card/95 backdrop-blur-md grid lg:hidden"
        style={{ gridTemplateColumns: `repeat(${visibleNav.length}, minmax(0, 1fr))` }}>
        {visibleNav.map((n) => (
          <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground transition-colors"
            activeProps={{ className: "text-primary font-semibold" }}>
            <n.icon className="h-5 w-5" />{n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/25 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-card p-5 shadow-lg sm:rounded-3xl border border-border/60" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">{title}</h2>
          <button onClick={onClose} className="btn btn-ghost h-9 min-h-0 w-9 p-0" aria-label="Đóng">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-3xl">{title}</h1>
      {action}
    </div>
  );
}

export function Label({ text, children }: { text: string; children: ReactNode }) {
  return <label className="block space-y-1 text-sm"><span className="text-muted-foreground">{text}</span>{children}</label>;
}
