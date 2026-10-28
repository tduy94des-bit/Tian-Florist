import type { OrderStatus, PaymentStatus } from "@/lib/store";
import { STATUS_LABEL, PAY_LABEL } from "@/lib/store";
import { CheckCircle2, Clock, Truck, Palette, FileEdit, XCircle, AlertTriangle, ShieldCheck, Flame } from "lucide-react";

export interface StatusConfig {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
  icon: typeof CheckCircle2;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  COMPLETED: {
    label: STATUS_LABEL.COMPLETED,
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-300",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  DELIVERING: {
    label: STATUS_LABEL.DELIVERING,
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-300",
    dot: "bg-blue-500",
    icon: Truck,
  },
  PREPARING: {
    label: STATUS_LABEL.PREPARING,
    bg: "bg-purple-50",
    text: "text-purple-800",
    border: "border-purple-300",
    dot: "bg-purple-500",
    icon: Palette,
  },
  PENDING_PAYMENT: {
    label: STATUS_LABEL.PENDING_PAYMENT,
    bg: "bg-amber-50",
    text: "text-amber-900",
    border: "border-amber-400",
    dot: "bg-amber-600",
    icon: Clock,
  },
  DRAFT: {
    label: STATUS_LABEL.DRAFT,
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-300",
    dot: "bg-slate-400",
    icon: FileEdit,
  },
  CANCELLED: {
    label: STATUS_LABEL.CANCELLED,
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-300",
    dot: "bg-rose-500",
    icon: XCircle,
  },
};

export function OrderStatusBadge({ status, size = "md" }: { status: OrderStatus; size?: "sm" | "md" }) {
  const cfg = ORDER_STATUS_CONFIG[status] || ORDER_STATUS_CONFIG.DRAFT;
  const Icon = cfg.icon;
  const isSm = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide ${cfg.bg} ${cfg.text} ${cfg.border} ${
        isSm ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      <span className={`inline-block rounded-full ${cfg.dot} ${isSm ? "h-1.5 w-1.5" : "h-2 w-2"}`} />
      <Icon className={isSm ? "h-3 w-3" : "h-3.5 w-3.5"} />
      <span>{cfg.label}</span>
    </span>
  );
}

export function PaymentStatusBadge({ status, size = "md" }: { status: PaymentStatus; size?: "sm" | "md" }) {
  const isSm = size === "sm";

  if (status === "PAID") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold ${
          isSm ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {PAY_LABEL.PAID}
      </span>
    );
  }

  if (status === "DEPOSIT") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 text-amber-800 font-semibold ${
          isSm ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        {PAY_LABEL.DEPOSIT}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 text-rose-800 font-semibold ${
        isSm ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
      {PAY_LABEL.UNPAID}
    </span>
  );
}

export function InventoryStatusBadge({
  quantity,
  minThreshold,
  expiring,
}: {
  quantity: number;
  minThreshold: number;
  expiring?: boolean;
}) {
  if (expiring) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-800">
        <Flame className="h-3 w-3 text-rose-600 animate-pulse" />
        Cần dùng ngay
      </span>
    );
  }

  if (quantity === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-800">
        <XCircle className="h-3 w-3 text-rose-600" />
        Hết hàng
      </span>
    );
  }

  if (quantity < minThreshold) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-900 shadow-2xs">
        <AlertTriangle className="h-3 w-3 text-amber-700" />
        Sắp hết hàng
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
      <ShieldCheck className="h-3 w-3 text-emerald-600" />
      Còn hàng
    </span>
  );
}
