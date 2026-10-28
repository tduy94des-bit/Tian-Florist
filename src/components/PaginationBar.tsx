import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, "...", total];
  }
  if (current >= total - 2) {
    return [1, "...", total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

interface PaginationBarProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  itemName?: string;
  onPageChange: (page: number) => void;
}

export function PaginationBar({
  currentPage,
  totalItems,
  pageSize = 10,
  itemName = "mục",
  onPageChange,
}: PaginationBarProps) {
  if (totalItems === 0) return null;

  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return (
    <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl bg-card border border-border/80 px-5 py-3 shadow-card">
      <p className="text-sm text-muted-foreground">
        Hiển thị <span className="font-semibold text-foreground">{startIndex + 1}</span>–<span className="font-semibold text-foreground">{endIndex}</span> trên tổng số <span className="font-semibold text-foreground">{totalItems}</span> {itemName}
        {totalPages > 1 && (
          <span className="ml-1.5 text-xs text-muted-foreground">
            (Trang {safePage}/{totalPages})
          </span>
        )}
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => onPageChange(1)}
            className="btn btn-ghost h-8 w-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
            title="Trang đầu"
            aria-label="Trang đầu"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            className="btn btn-ghost h-8 w-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
            title="Trang trước"
            aria-label="Trang trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1 mx-1">
            {getPageNumbers(safePage, totalPages).map((p, idx) =>
              p === "..." ? (
                <span key={`dots-${idx}`} className="px-1 text-muted-foreground text-xs">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(Number(p))}
                  className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition-all ${
                    safePage === p
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "btn-ghost text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            disabled={safePage === totalPages}
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            className="btn btn-ghost h-8 w-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
            title="Trang sau"
            aria-label="Trang sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={safePage === totalPages}
            onClick={() => onPageChange(totalPages)}
            className="btn btn-ghost h-8 w-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
            title="Trang cuối"
            aria-label="Trang cuối"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
