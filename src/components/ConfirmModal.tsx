import { ReactNode } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description = "Bạn có chắc chắn muốn thực hiện hành động này? Dữ liệu đã xoá không thể khôi phục.",
  confirmLabel = "Xoá ngay",
  cancelLabel = "Huỷ bỏ",
  variant = "danger",
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-card p-6 shadow-lg border border-border/80 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              variant === "danger"
                ? "bg-destructive/10 text-destructive"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {variant === "danger" ? (
              <Trash2 className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-bold text-foreground">
              {title}
            </h3>
            <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {description}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="btn btn-ghost px-4 py-2 text-sm font-medium"
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn px-4 py-2 text-sm font-semibold text-white transition-all shadow-sm ${
              variant === "danger"
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-amber-600 hover:bg-amber-700"
            }`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
