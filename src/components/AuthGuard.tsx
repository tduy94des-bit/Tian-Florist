import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth, type UserRole } from "@/lib/auth";

interface AuthGuardProps {
  children: ReactNode;
  /** Roles allowed to access. If empty / undefined → any authenticated user. */
  allowedRoles?: UserRole[];
  /** Where to redirect when denied. Defaults to /don-hang for staff, /login for unauthenticated. */
  redirectTo?: string;
}

export function AuthGuard({ children, allowedRoles, redirectTo }: AuthGuardProps) {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    if (allowedRoles && role && !allowedRoles.includes(role)) {
      navigate({ to: redirectTo ?? "/don-hang" });
    }
  }, [user, role, loading, allowedRoles, redirectTo, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <span className="text-4xl">🔒</span>
        <h2 className="font-display text-xl font-bold text-foreground">Không có quyền truy cập</h2>
        <p className="text-sm text-muted-foreground">
          Trang này chỉ dành cho{" "}
          <strong>{allowedRoles.includes("admin") ? "Chủ shop (Admin)" : "Nhân viên"}</strong>.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

