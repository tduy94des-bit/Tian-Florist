import { createFileRoute } from "@tanstack/react-router";
import { Plus, Minus, Pencil, Trash2, AlertTriangle, ShieldCheck, Flame, LayoutGrid, List } from "lucide-react";
import { useState, useEffect } from "react";
import { Label, Modal, PageTitle } from "@/components/AppShell";
import { ConfirmModal } from "@/components/ConfirmModal";
import { PaginationBar } from "@/components/PaginationBar";
import { toast } from "sonner";
import { InventoryStatusBadge } from "@/components/StatusBadges";
import { AuthGuard } from "@/components/AuthGuard";
import { useStore, vnd, uid, INV_CATS, todayStr, type InvItem, type InvCategory } from "@/lib/store";

export const Route = createFileRoute("/kho-hang")({
  head: () => ({
    meta: [
      { title: "Kho hàng | Quản Lý Tiệm Hoa" },
      { name: "description", content: "Theo dõi hoa tươi, phụ kiện và mẫu hoa trong kho." },
      { property: "og:title", content: "Kho hàng | Quản Lý Tiệm Hoa" },
      { property: "og:description", content: "Theo dõi hoa tươi, phụ kiện và mẫu hoa trong kho." },
    ],
  }),
  component: () => (
    <AuthGuard>
      <InventoryPage />
    </AuthGuard>
  ),
});

const PAGE_SIZE = 10;
type StockFilter = "ALL" | "LOW_ONLY" | "EXPIRING_ONLY";

function InventoryPage() {
  const { inventory, adjustStock, deleteItem } = useStore();
  const [cat, setCat] = useState<InvCategory | "ALL">("ALL");
  const [stockFilter, setStockFilter] = useState<StockFilter>("ALL");
  const [editing, setEditing] = useState<InvItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InvItem | null>(null);
  const [step, setStep] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Reset về trang 1 khi đổi danh mục hoặc bộ lọc tồn kho
  useEffect(() => {
    setCurrentPage(1);
  }, [cat, stockFilter]);

  const lowCount = inventory.filter((i) => i.quantity < i.minThreshold).length;
  const expiringCount = inventory.filter((i) => i.expiryDate && i.expiryDate <= todayStr()).length;

  const list = inventory.filter((i) => {
    const matchCat = cat === "ALL" || i.category === cat;
    const isLow = i.quantity < i.minThreshold;
    const isExpiring = i.expiryDate && i.expiryDate <= todayStr();
    if (!matchCat) return false;
    if (stockFilter === "LOW_ONLY") return isLow;
    if (stockFilter === "EXPIRING_ONLY") return isExpiring;
    return true;
  });

  const totalPages = Math.ceil(list.length / PAGE_SIZE) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedList = list.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <>
      <PageTitle title="Kho hàng" action={
        <button className="btn btn-primary" onClick={() => setEditing({ id: uid("INV"), name: "", category: "Hoa Tươi", unit: "cành", quantity: 0, minThreshold: 10, costPrice: 0, sellingPrice: 0 })}>
          <Plus className="h-4 w-4" />Thêm mặt hàng
        </button>} />

      {/* Quick Alerts Banner / Filters */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {(["ALL", ...INV_CATS] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`btn h-8 min-h-0 rounded-full px-3.5 text-xs font-semibold transition-all ${
                cat === c
                  ? "btn-primary shadow-sm"
                  : "bg-white border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 shadow-2xs"
              }`}
            >
              {c === "ALL" ? "Tất cả danh mục" : c}
            </button>
          ))}
        </div>

        {/* Status Quick Filters (Clean default styling) */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setStockFilter(stockFilter === "LOW_ONLY" ? "ALL" : "LOW_ONLY")}
            className={`btn h-8 min-h-0 rounded-full px-3.5 text-xs font-semibold transition-all ${
              stockFilter === "LOW_ONLY"
                ? "btn-primary shadow-sm"
                : "bg-white border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 shadow-2xs"
            }`}
          >
            Sắp hết ({lowCount})
          </button>
          {expiringCount > 0 && (
            <button
              type="button"
              onClick={() => setStockFilter(stockFilter === "EXPIRING_ONLY" ? "ALL" : "EXPIRING_ONLY")}
              className={`btn h-8 min-h-0 rounded-full px-3.5 text-xs font-semibold transition-all ${
                stockFilter === "EXPIRING_ONLY"
                  ? "btn-primary shadow-sm"
                  : "bg-white border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 shadow-2xs"
              }`}
            >
              Cần dùng ngay ({expiringCount})
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Bước nhập/xuất:
          <input type="number" min={1} className="field w-16 py-1 px-2 text-xs text-center" value={step} onChange={(e) => setStep(Math.max(1, +e.target.value))} />
        </label>

        {/* View Mode Toggle: Grid vs List (Cột) */}
        <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1 border border-border/60">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
              viewMode === "grid"
                ? "bg-card text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Xem dạng lưới"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Lưới</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
              viewMode === "list"
                ? "bg-card text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Xem dạng cột / danh sách"
          >
            <List className="h-3.5 w-3.5" />
            <span>Cột</span>
          </button>
        </div>
      </div>

      <div className={viewMode === "grid" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-2.5"}>
        {paginatedList.map((i) => {
          const isOut = i.quantity === 0;
          const isLow = i.quantity > 0 && i.quantity < i.minThreshold;
          const expiring = !!(i.expiryDate && i.expiryDate <= todayStr());
          const stockRatio = i.minThreshold > 0 ? Math.min(100, Math.round((i.quantity / (i.minThreshold * 2)) * 100)) : 100;

          return (
            <article
              key={i.id}
              className={`card-soft transition-all hover:shadow-card ${
                isOut
                  ? "border-rose-300 bg-rose-50/30 ring-1 ring-rose-300/40"
                  : isLow
                  ? "border-amber-400 bg-amber-50/25 ring-1 ring-amber-400/40"
                  : "border-border/80 bg-card"
              } ${
                viewMode === "list"
                  ? "p-3 sm:p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3"
                  : "p-4 sm:p-5 rounded-3xl flex flex-col justify-between"
              }`}
            >
              {viewMode === "list" ? (
                <>
                  {/* Col 1: Category & Name */}
                  <div className="min-w-[200px] flex items-center gap-3">
                    <span className="inline-block rounded-lg bg-secondary/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground shrink-0">
                      {i.category}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground text-sm sm:text-base leading-snug">{i.name}</p>
                      <p className="text-[11px] text-muted-foreground">Tối thiểu: {i.minThreshold} {i.unit}</p>
                    </div>
                  </div>

                  {/* Col 2: Prices */}
                  <div className="flex items-center gap-4 text-xs min-w-[170px]">
                    <div>
                      <span className="text-muted-foreground">Nhập: </span>
                      <b className="text-foreground">{vnd(i.costPrice)}</b>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Bán: </span>
                      <b className="text-primary font-bold">{vnd(i.sellingPrice)}</b>
                    </div>
                  </div>

                  {/* Col 3: Stock Progress & Badge */}
                  <div className="min-w-[170px] flex-1 max-w-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Mức tồn kho:</span>
                      <span className={isOut ? "text-rose-600 font-bold" : isLow ? "text-amber-800 font-bold" : "text-emerald-700 font-bold"}>
                        {isOut ? "Hết sạch (0)" : `${i.quantity} / ${i.minThreshold} ${i.unit}`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOut ? "bg-rose-500 w-0" : isLow ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${isOut ? 0 : Math.max(8, stockRatio)}%` }}
                      />
                    </div>
                  </div>

                  {/* Col 4: Quick Adjust Buttons & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/80">
                    <div className="flex items-center gap-1.5">
                      <button className="btn btn-ghost h-8 w-8 p-0 rounded-xl border border-border/80 hover:border-primary/40" title={`Xuất -${step}`} aria-label="Xuất kho" onClick={() => adjustStock(i.id, -step)}><Minus className="h-3.5 w-3.5" /></button>
                      <span className={`min-w-14 text-center font-display text-base font-bold ${isOut ? "text-rose-600" : isLow ? "text-amber-800" : "text-emerald-800"}`}>
                        {i.quantity} <span className="text-xs font-normal text-muted-foreground">{i.unit}</span>
                      </span>
                      <button className="btn btn-ghost h-8 w-8 p-0 rounded-xl border border-border/80 hover:border-primary/40" title={`Nhập +${step}`} aria-label="Nhập kho" onClick={() => adjustStock(i.id, step)}><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="flex gap-1 ml-1">
                      <button type="button" className="btn btn-ghost h-8 w-8 p-0" title="Chỉnh sửa" aria-label="Sửa" onClick={() => setEditing(i)}><Pencil className="h-3.5 w-3.5" /></button>
                      <button
                        type="button"
                        className="btn btn-ghost h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        title="Xoá"
                        aria-label="Xoá mặt hàng"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingItem(i);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block rounded-lg bg-secondary/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground">
                        {i.category}
                      </span>
                      <p className="font-semibold text-foreground text-base mt-1.5">{i.name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <InventoryStatusBadge quantity={i.quantity} minThreshold={i.minThreshold} expiring={expiring} />
                    </div>
                  </div>

                  {/* Price & Threshold */}
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border/70 pt-2.5">
                    <span>Nhập: <b className="text-foreground">{vnd(i.costPrice)}</b></span>
                    <span>Bán: <b className="text-primary font-bold">{vnd(i.sellingPrice)}</b></span>
                    <span>Tối thiểu: <b className="text-foreground">{i.minThreshold} {i.unit}</b></span>
                  </div>

                  {/* Visual Stock Level Progress Bar */}
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                      <span>Mức tồn kho</span>
                      <span className={isOut ? "text-rose-600 font-bold" : isLow ? "text-amber-800 font-bold" : "text-emerald-700 font-bold"}>
                        {isOut ? "Hết sạch (0)" : `${i.quantity} / ${i.minThreshold} ${i.unit}`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOut ? "bg-rose-500 w-0" : isLow ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${isOut ? 0 : Math.max(8, stockRatio)}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions & Adjustments */}
                  <div className="mt-3.5 pt-2.5 border-t border-border/70 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button className="btn btn-ghost h-8 w-8 p-0 rounded-xl border border-border/80 hover:border-primary/40" title={`Xuất -${step}`} aria-label="Xuất kho" onClick={() => adjustStock(i.id, -step)}><Minus className="h-3.5 w-3.5" /></button>
                      <span className={`min-w-16 text-center font-display text-lg font-bold ${isOut ? "text-rose-600" : isLow ? "text-amber-800" : "text-emerald-800"}`}>
                        {i.quantity} <span className="text-xs font-normal text-muted-foreground">{i.unit}</span>
                      </span>
                      <button className="btn btn-ghost h-8 w-8 p-0 rounded-xl border border-border/80 hover:border-primary/40" title={`Nhập +${step}`} aria-label="Nhập kho" onClick={() => adjustStock(i.id, step)}><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" className="btn btn-ghost h-8 w-8 p-0" title="Chỉnh sửa" aria-label="Sửa" onClick={() => setEditing(i)}><Pencil className="h-3.5 w-3.5" /></button>
                      <button
                        type="button"
                        className="btn btn-ghost h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        title="Xoá"
                        aria-label="Xoá mặt hàng"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingItem(i);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>

      {/* Pagination Controls */}
      <PaginationBar
        currentPage={currentPage}
        totalItems={list.length}
        pageSize={PAGE_SIZE}
        itemName="mặt hàng"
        onPageChange={setCurrentPage}
      />

      {editing && <ItemForm initial={editing} onClose={() => setEditing(null)} />}

      <ConfirmModal
        open={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={() => {
          if (deletingItem) {
            deleteItem(deletingItem.id);
            toast.success(`Đã xoá mặt hàng ${deletingItem.name}`);
            setDeletingItem(null);
          }
        }}
        title="Xác nhận xoá mặt hàng"
        description={
          deletingItem ? (
            <p>
              Bạn có chắc chắn muốn xoá mặt hàng <strong className="text-foreground">{deletingItem.name}</strong> ({deletingItem.category}) khỏi kho không? Dữ liệu tồn kho này sẽ bị xoá hoàn toàn.
            </p>
          ) : undefined
        }
        confirmLabel="Xoá mặt hàng"
      />
    </>
  );
}

function ItemForm({ initial, onClose }: { initial: InvItem; onClose: () => void }) {
  const { saveItem } = useStore();
  const [i, setI] = useState(initial);
  const set = <K extends keyof InvItem>(k: K, v: InvItem[K]) => setI((p) => ({ ...p, [k]: v }));
  return (
    <Modal open onClose={onClose} title={initial.name ? "Sửa mặt hàng" : "Thêm mặt hàng"}>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); saveItem(i); onClose(); }}>
        <Label text="Tên *"><input required className="field" value={i.name} onChange={(e) => set("name", e.target.value)} /></Label>
        <Label text="Danh mục">
          <select className="field" value={i.category} onChange={(e) => set("category", e.target.value as InvCategory)}>
            {INV_CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Label>
        <Label text="Đơn vị"><input className="field" value={i.unit} onChange={(e) => set("unit", e.target.value)} /></Label>
        <Label text="Số lượng"><input type="number" min={0} className="field" value={i.quantity} onChange={(e) => set("quantity", +e.target.value)} /></Label>
        <Label text="Giá nhập"><input type="number" min={0} className="field" value={i.costPrice} onChange={(e) => set("costPrice", +e.target.value)} /></Label>
        <Label text="Giá bán"><input type="number" min={0} className="field" value={i.sellingPrice} onChange={(e) => set("sellingPrice", +e.target.value)} /></Label>
        <Label text="Ngưỡng tối thiểu"><input type="number" min={0} className="field" value={i.minThreshold} onChange={(e) => set("minThreshold", +e.target.value)} /></Label>
        {i.category === "Hoa Tươi" && <Label text="Hạn dùng"><input type="date" className="field" value={i.expiryDate ?? ""} onChange={(e) => set("expiryDate", e.target.value)} /></Label>}
        <div className="flex justify-end sm:col-span-2"><button className="btn btn-primary">Lưu</button></div>
      </form>
    </Modal>
  );
}
