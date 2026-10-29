import { createFileRoute } from "@tanstack/react-router";
import {
  Plus, Search, Printer, Pencil, Trash2, Camera, Image as ImageIcon, X, ExternalLink,
  Sparkles, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Phone, Clock, MapPin, ChevronDown, LayoutGrid, List,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Label, Modal, PageTitle } from "@/components/AppShell";
import { ConfirmModal } from "@/components/ConfirmModal";
import { PaginationBar } from "@/components/PaginationBar";
import { toast } from "sonner";
import { OrderStatusBadge, PaymentStatusBadge, ORDER_STATUS_CONFIG } from "@/components/StatusBadges";
import { AuthGuard } from "@/components/AuthGuard";
import { DropdownSelect } from "@/components/DropdownSelect";
import {
  useStore, vnd, uid, orderTotal, todayStr, STATUS_LABEL, PAY_LABEL, METHOD_LABEL, FLOWER_PRESET_IMAGES,
  type Order, type OrderStatus, type PaymentStatus, type PaymentMethod,
} from "@/lib/store";

export const Route = createFileRoute("/don-hang")({
  head: () => ({
    meta: [
      { title: "Đơn hàng | Quản Lý Tiệm Hoa" },
      { name: "description", content: "Tạo, theo dõi, quản lý ảnh hoa và in hoá đơn đơn hàng." },
      { property: "og:title", content: "Đơn hàng | Quản Lý Tiệm Hoa" },
      { property: "og:description", content: "Tạo, theo dõi, quản lý ảnh hoa và in hoá đơn đơn hàng." },
    ],
  }),
  component: () => (
    <AuthGuard>
      <OrdersPage />
    </AuthGuard>
  ),
});

function formatShortDate(str?: string): string {
  if (!str) return "";
  try {
    const d = new Date(str.includes("T") ? str : `${str}T00:00:00`);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}`;
  } catch {
    return "";
  }
}

function formatDeliveryTime(str?: string): string {
  if (!str) return "Trong ngày";
  try {
    if (str.includes("T")) {
      const [datePart, timePart] = str.split("T");
      const time = timePart?.slice(0, 5) || "";
      return time ? `${time} - ${datePart}` : datePart || str;
    }
    return str;
  } catch {
    return str;
  }
}

const PAGE_SIZE = 10;

const blank = (): Order => ({
  id: uid("ORD"), customerName: "", customerPhone: "", recipientName: "", recipientPhone: "", deliveryAddress: "",
  deliveryTime: `${todayStr()}T10:00`, cardMessage: "", items: [], discount: 0, paymentStatus: "UNPAID",
  paymentMethod: "CASH", orderStatus: "DRAFT", createdAt: todayStr(),
  image: "", imageType: "SAMPLE",
});

function OrdersPage() {
  const { orders, saveOrder, deleteOrder } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<Order | null>(null);
  const [printing, setPrinting] = useState<Order | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; type?: string } | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const handleQuickStatusChange = async (order: Order, newStatus: OrderStatus) => {
    if (order.orderStatus === newStatus) return;
    try {
      await saveOrder({ ...order, orderStatus: newStatus });
      toast.success(`Đã chuyển đơn #${order.id.replace(/^ORD-/, "")} sang: ${STATUS_LABEL[newStatus]}`);
    } catch {
      toast.error("Không thể cập nhật trạng thái đơn hàng");
    }
  };

  // Tự động trở về trang 1 khi thay đổi bộ lọc tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [q, status, from, to]);

  const list = orders.filter((o) => {
    const d = o.deliveryTime.slice(0, 10);
    const text = `${o.customerName} ${o.customerPhone} ${o.recipientName} ${o.id}`.toLowerCase();
    return (status === "ALL" || o.orderStatus === status) && (!from || d >= from) && (!to || d <= to) && text.includes(q.toLowerCase());
  }).sort((a, b) => b.deliveryTime.localeCompare(a.deliveryTime));

  const totalPages = Math.ceil(list.length / PAGE_SIZE) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedList = list.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <>
      <PageTitle title="Đơn hàng" action={<button className="btn btn-primary" onClick={() => setEditing(blank())}><Plus className="h-4 w-4" />Tạo đơn</button>} />
      
      {/* Quick Status Filter Pills (Scroll ngang tren mobile, khong wrap) */}
      <div className="mb-4 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => setStatus("ALL")}
          className={`btn h-8 min-h-0 rounded-full px-3.5 text-xs font-semibold shrink-0 transition-all ${
            status === "ALL"
              ? "btn-primary shadow-sm"
              : "bg-white border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 shadow-2xs"
          }`}
        >
          Tất cả ({orders.length})
        </button>
        {(Object.keys(ORDER_STATUS_CONFIG) as OrderStatus[]).map((st) => {
          const count = orders.filter((o) => o.orderStatus === st).length;
          const cfg = ORDER_STATUS_CONFIG[st];
          const isSelected = status === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() => setStatus(st)}
              className={`btn h-8 min-h-0 rounded-full px-3.5 text-xs font-semibold shrink-0 transition-all ${
                isSelected
                  ? "btn-primary shadow-sm"
                  : "bg-white border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 shadow-2xs"
              }`}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="card-soft mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 p-4">
        <div className="grid flex-1 gap-2.5 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input className="field pl-9" placeholder="Tên hoặc SĐT khách, người nhận..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <input type="date" className="field" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Từ ngày" />
          <input type="date" className="field" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Đến ngày" />
        </div>

        {/* View Mode Toggle: Grid vs List (Cột) */}
        <div className="flex items-center gap-1 self-end md:self-center rounded-xl bg-muted/60 p-1 border border-border/60 shrink-0">
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

      <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"}>
        {paginatedList.map((o) => (
          <article
            key={o.id}
            className={`card-soft transition-all hover:shadow-card border border-border/80 bg-card ${
              viewMode === "list"
                ? "p-4 sm:p-5 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                : "p-4 sm:p-5 rounded-3xl flex flex-col justify-between gap-3.5"
            }`}
          >
            {viewMode === "list" ? (
              <>
                {/* Col 1: Code, Date, Customer & Phone */}
                <div className="min-w-[210px] space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-primary">#{o.id.replace(/^ORD-/, "")}</span>
                    <span className="text-xs font-medium text-muted-foreground">{formatShortDate(o.deliveryTime || o.createdAt)}</span>
                    <OrderStatusBadge status={o.orderStatus} size="sm" />
                  </div>
                  <h3 className="font-display text-base font-bold text-foreground leading-tight">{o.customerName || "Khách lẻ"}</h3>
                  {o.customerPhone && (
                    <a href={`tel:${o.customerPhone}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
                      <Phone className="h-3 w-3" />
                      <span>{o.customerPhone}</span>
                    </a>
                  )}
                </div>

                {/* Col 2: Items, Card message & Attached Image */}
                <div className="flex-1 min-w-[240px] flex items-center gap-3">
                  {o.image && (
                    <div
                      onClick={() => setPreviewImage({ url: o.image!, title: `${o.id} - ${o.recipientName || o.customerName}`, ...(o.imageType ? { type: o.imageType } : {}) })}
                      className="group relative h-13 w-13 shrink-0 overflow-hidden rounded-xl border border-border bg-card cursor-pointer shadow-2xs hover:ring-2 hover:ring-primary/50"
                      title="Xem ảnh hoa"
                    >
                      <img src={o.image} alt="Hoa" className="h-full w-full object-cover group-hover:scale-110 transition-transform" />
                    </div>
                  )}
                  <div className="space-y-1">
                    {o.items.length > 0 ? (
                      <p className="text-sm font-medium text-foreground leading-snug">
                        🌸 {o.items.map((it) => `${it.name} (x${it.quantity})`).join(", ")}
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-foreground">🌸 Bó hoa theo yêu cầu</p>
                    )}
                    {o.cardMessage && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 italic font-medium line-clamp-1">
                        💌 "{o.cardMessage}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Col 3: Delivery time & Address */}
                <div className="min-w-[210px] text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
                    <span>Giao: <strong className="text-foreground font-semibold">{formatDeliveryTime(o.deliveryTime)}</strong></span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{o.recipientName && o.recipientName !== o.customerName ? `${o.recipientName} — ` : ""}{o.deliveryAddress || "Nhận tại tiệm"}</span>
                  </div>
                </div>

                {/* Col 4: Price, Quick Status & Action Buttons */}
                <div className="flex flex-wrap lg:flex-nowrap items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-border">
                  <div className="text-left lg:text-right min-w-[95px]">
                    <p className="font-display text-base font-bold text-foreground">{vnd(orderTotal(o))}</p>
                    <p className="text-[10px] text-muted-foreground">{METHOD_LABEL[o.paymentMethod]}</p>
                  </div>

                  {/* Quick Status Dropdown */}
                  <DropdownSelect
                    value={o.orderStatus}
                    onChange={(val) => handleQuickStatusChange(o, val as OrderStatus)}
                    options={Object.entries(STATUS_LABEL).map(([val, label]) => ({
                      value: val,
                      label,
                    }))}
                    variant="compact"
                    title="Trạng thái đơn hàng"
                    align="right"
                  />

                  {/* Action Buttons */}
                  <div className="flex items-center gap-0.5">
                    <button type="button" className="btn btn-ghost h-8.5 w-8.5 p-0 text-muted-foreground hover:text-foreground" title="In hoá đơn" onClick={() => setPrinting(o)}><Printer className="h-4 w-4" /></button>
                    <button type="button" className="btn btn-ghost h-8.5 w-8.5 p-0 text-muted-foreground hover:text-foreground" title="Chỉnh sửa đơn" onClick={() => setEditing(o)}><Pencil className="h-4 w-4" /></button>
                    <button type="button" className="btn btn-ghost h-8.5 w-8.5 p-0 text-destructive hover:bg-destructive/10" title="Xoá đơn" onClick={(e) => { e.stopPropagation(); setDeletingOrder(o); }}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Top Row: #Code + Date and Status Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-sm font-bold text-primary">
                      #{o.id.replace(/^ORD-/, "")}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatShortDate(o.deliveryTime || o.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <OrderStatusBadge status={o.orderStatus} size="sm" />
                    {o.paymentStatus === "PAID" && (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                        Đã TT
                      </span>
                    )}
                  </div>
                </div>

                {/* Customer Details */}
                <div>
                  <h3 className="font-display text-base font-bold text-foreground leading-tight">
                    {o.customerName || "Khách lẻ"}
                  </h3>
                  {o.customerPhone && (
                    <a
                      href={`tel:${o.customerPhone}`}
                      className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Phone className="h-3 w-3 text-muted-foreground/80" />
                      <span>{o.customerPhone}</span>
                    </a>
                  )}
                </div>

                {/* Items & Total Price Box */}
                <div className="rounded-2xl bg-muted/40 p-3.5 border border-border/60">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex-1">
                      {o.items.length > 0 ? (
                        <div className="space-y-1">
                          {o.items.map((it, idx) => (
                            <p key={idx} className="text-sm font-medium text-foreground leading-snug">
                              {it.name}{" "}
                              {it.quantity > 1 && (
                                <span className="text-xs font-normal text-muted-foreground">
                                  (x{it.quantity})
                                </span>
                              )}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-foreground">Bó hoa theo yêu cầu</p>
                      )}
                      <p className="mt-2 font-display text-base font-bold text-foreground">
                        {vnd(orderTotal(o))}
                      </p>
                    </div>

                    {/* Attached Image Thumbnail */}
                    {o.image ? (
                      <div
                        onClick={() =>
                          setPreviewImage({
                            url: o.image!,
                            title: `${o.id} - ${o.recipientName || o.customerName}`,
                            ...(o.imageType ? { type: o.imageType } : {}),
                          })
                        }
                        className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-card cursor-pointer shadow-2xs hover:ring-2 hover:ring-primary/50 transition-all"
                        title="Nhấn để phóng to ảnh hoa"
                      >
                        <img
                          src={o.image}
                          alt="Hoa đơn hàng"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <Eye className="h-3.5 w-3.5 drop-shadow" />
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditing(o)}
                        className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card text-muted-foreground/70 hover:border-primary hover:text-primary hover:bg-secondary/30 transition-all"
                        title="Thêm ảnh chụp cho đơn này"
                      >
                        <Camera className="h-4 w-4 mb-0.5" />
                        <span className="text-[9px] font-medium">+ Ảnh</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Message Box (Thiệp chúc) */}
                {o.cardMessage && (
                  <div className="rounded-2xl bg-rose-50/70 border border-rose-100/80 p-3 text-rose-950 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-200">
                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 italic">
                      💌 Thiệp chúc:
                    </p>
                    <p className="text-xs italic mt-0.5 font-medium leading-relaxed">
                      "{o.cardMessage}"
                    </p>
                  </div>
                )}

                {/* Delivery Time & Address */}
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                    <span>
                      Giao: <strong className="text-foreground font-semibold">{formatDeliveryTime(o.deliveryTime)}</strong>
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/80" />
                    <span className="leading-snug">
                      {o.recipientName && o.recipientName !== o.customerName && (
                        <span className="font-semibold text-foreground">{o.recipientName} — </span>
                      )}
                      {o.deliveryAddress || "Nhận tại tiệm"}
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Quick Status Selector + Action Buttons */}
                <div className="mt-1 pt-3 border-t border-border flex items-center justify-between gap-2">
                  {/* Quick Status Dropdown outside */}
                  <DropdownSelect
                    value={o.orderStatus}
                    onChange={(val) => handleQuickStatusChange(o, val as OrderStatus)}
                    options={Object.entries(STATUS_LABEL).map(([val, label]) => ({
                      value: val,
                      label,
                    }))}
                    variant="compact"
                    title="Trạng thái đơn hàng"
                  />

                  {/* Action Buttons */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className="btn btn-ghost h-8.5 w-8.5 p-0 text-muted-foreground hover:text-foreground"
                      title="In hoá đơn"
                      aria-label="In hoá đơn"
                      onClick={() => setPrinting(o)}
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost h-8.5 w-8.5 p-0 text-muted-foreground hover:text-foreground"
                      title="Chỉnh sửa đơn"
                      aria-label="Sửa đơn"
                      onClick={() => setEditing(o)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost h-8.5 w-8.5 p-0 text-destructive hover:bg-destructive/10"
                      title="Xoá đơn"
                      aria-label="Xoá đơn hàng"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingOrder(o);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </article>
        ))}
        {list.length === 0 && <p className="col-span-full py-10 text-center text-muted-foreground">Không tìm thấy đơn hàng.</p>}
      </div>

      {/* Pagination Controls */}
      <PaginationBar
        currentPage={currentPage}
        totalItems={list.length}
        pageSize={PAGE_SIZE}
        itemName="đơn hàng"
        onPageChange={setCurrentPage}
      />

      {editing && <OrderForm initial={editing} onClose={() => setEditing(null)} />}
      {printing && <Receipt order={printing} onClose={() => setPrinting(null)} />}

      <ConfirmModal
        open={!!deletingOrder}
        onClose={() => setDeletingOrder(null)}
        onConfirm={() => {
          if (deletingOrder) {
            deleteOrder(deletingOrder.id);
            toast.success(`Đã xoá đơn hàng ${deletingOrder.id}`);
            setDeletingOrder(null);
          }
        }}
        title="Xác nhận xoá đơn hàng"
        description={
          deletingOrder ? (
            <p>
              Bạn có chắc chắn muốn xoá đơn hàng <strong className="text-foreground">{deletingOrder.id}</strong> của khách hàng <strong className="text-foreground">{deletingOrder.customerName || "Khách lẻ"}</strong> không? Thao tác này sẽ xoá đơn vĩnh viễn và hoàn lại số lượng tồn kho.
            </p>
          ) : undefined
        }
        confirmLabel="Xoá đơn này"
      />

      {/* Full-size Image Zoom Modal */}
      {previewImage && (
        <Modal open onClose={() => setPreviewImage(null)} title={previewImage.title}>
          <div className="flex flex-col items-center">
            <div className="relative max-h-[70vh] w-full overflow-hidden rounded-2xl bg-black/5 flex items-center justify-center">
              <img src={previewImage.url} alt={previewImage.title} className="max-h-[65vh] w-auto max-w-full rounded-xl object-contain shadow-md" />
              <div className="absolute top-3 left-3">
                <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  {previewImage.type === "FINISHED" ? "💐 Ảnh thành phẩm chụp tại tiệm" : "📸 Ảnh mẫu khách gửi tham khảo"}
                </span>
              </div>
            </div>
            <div className="mt-4 flex w-full justify-between items-center text-xs text-muted-foreground">
              <span>Được lưu trữ cho đơn hàng này</span>
              <a href={previewImage.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                Mở ảnh gốc trong tab mới <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function OrderForm({ initial, onClose }: { initial: Order; onClose: () => void }) {
  const { inventory, saveOrder } = useStore();
  const [o, setO] = useState<Order>(initial);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlField, setShowUrlField] = useState(false);

  const set = <K extends keyof Order>(k: K, v: Order[K]) => setO((p) => ({ ...p, [k]: v }));
  
  const addItem = (id: string) => {
    const inv = inventory.find((i) => i.id === id);
    if (inv) set("items", [...o.items, { itemId: inv.id, name: inv.name, quantity: 1, price: inv.sellingPrice }]);
  };
  
  const updItem = (idx: number, k: "quantity" | "price", v: number) =>
    set("items", o.items.map((it, i) => (i === idx ? { ...it, [k]: v } : it)));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert file to base64 Data URL for persistent local storage
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        set("image", base64);
        if (!o.imageType) set("imageType", "FINISHED");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (urlInput.trim()) {
      set("image", urlInput.trim());
      setUrlInput("");
      setShowUrlField(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={initial.customerName ? `Sửa đơn ${o.id}` : "Tạo đơn mới"}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveOrder(o); onClose(); }}>
        {/* Customer & Delivery Information */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Label text="Tên khách *"><input required className="field" value={o.customerName} onChange={(e) => set("customerName", e.target.value)} /></Label>
          <Label text="SĐT khách"><input className="field" inputMode="tel" value={o.customerPhone} onChange={(e) => set("customerPhone", e.target.value)} /></Label>
          <Label text="Người nhận"><input className="field" value={o.recipientName} onChange={(e) => set("recipientName", e.target.value)} /></Label>
          <Label text="SĐT người nhận"><input className="field" inputMode="tel" value={o.recipientPhone} onChange={(e) => set("recipientPhone", e.target.value)} /></Label>
          <Label text="Địa chỉ giao"><input className="field" value={o.deliveryAddress} onChange={(e) => set("deliveryAddress", e.target.value)} /></Label>
          <Label text="Ngày & giờ giao"><input type="datetime-local" className="field" value={o.deliveryTime} onChange={(e) => set("deliveryTime", e.target.value)} /></Label>
        </div>

        {/* LỜI NHẮN TRÊN THIỆP */}
        <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <span>💌 Lời nhắn trên thiệp / Băng rôn</span>
              <span className="text-[11px] font-normal text-muted-foreground">(Hiển thị rõ khi in hoá đơn)</span>
            </label>
            <span className="text-xs text-muted-foreground font-mono">{(o.cardMessage || "").length} ký tự</span>
          </div>

          {/* Quick template suggestions */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground font-medium">Gợi ý mẫu:</span>
            {[
              "Chúc mừng sinh nhật em yêu! Mãi xinh đẹp và hạnh phúc nhé 🎂",
              "Chúc mừng khai trương hồng phát, kinh doanh đại phát tài! 🌺",
              "Kỷ niệm ngày cưới hạnh phúc, yêu em mãi mãi 💍",
              "Kính chúc Quý khách hàng vạn sự như ý, an khang thịnh vượng 🌸",
              "Cảm ơn bạn vì tất cả! Chúc bạn luôn vui tươi và may mắn 💖",
            ].map((msg, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => set("cardMessage", msg)}
                className="btn btn-ghost h-6 min-h-0 px-2 text-[10px] rounded-full border border-border hover:border-primary hover:text-primary transition-colors"
              >
                {msg.slice(0, 24)}…
              </button>
            ))}
          </div>

          <textarea
            rows={3}
            className="field text-sm font-medium"
            placeholder="Nhập nội dung lời nhắn trên thiệp hoặc lời chúc in trên băng rôn..."
            value={o.cardMessage}
            onChange={(e) => set("cardMessage", e.target.value)}
          />
        </div>

        {/* FLOWER IMAGE SECTION (Ảnh mẫu / Ảnh chụp thành phẩm) */}
        <div className="rounded-2xl border border-border bg-card p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
            <div>
              <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-primary" />
                Hình ảnh hoa đơn hàng
              </p>
              <p className="text-[11px] text-muted-foreground">
                Tải ảnh mẫu khách gửi hoặc ảnh thành phẩm chụp tại tiệm trước khi giao
              </p>
            </div>

            {/* Type selector: Sample vs Finished photo */}
            {o.image && (
              <div className="flex items-center gap-1 bg-muted rounded-full p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => set("imageType", "SAMPLE")}
                  className={`rounded-full px-2.5 py-1 font-semibold transition-all ${
                    (o.imageType || "SAMPLE") === "SAMPLE"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  📸 Ảnh mẫu
                </button>
                <button
                  type="button"
                  onClick={() => set("imageType", "FINISHED")}
                  className={`rounded-full px-2.5 py-1 font-semibold transition-all ${
                    o.imageType === "FINISHED"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  💐 Ảnh chụp thật
                </button>
              </div>
            )}
          </div>

          {/* Current Image Preview or Upload Interface */}
          {o.image ? (
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/40 p-3 rounded-xl border border-border">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-border bg-black/5 shadow-xs">
                <img src={o.image} alt="Xem trước hoa" className="h-full w-full object-cover" />
                <span className="absolute bottom-0 inset-x-0 bg-foreground/70 py-0.5 text-center text-[9px] font-semibold text-white">
                  {o.imageType === "FINISHED" ? "Ảnh chụp thật" : "Ảnh mẫu"}
                </span>
              </div>
              <div className="flex-1 space-y-2 text-xs">
                <p className="font-semibold text-foreground">Đã thêm ảnh cho đơn hàng</p>
                <p className="text-muted-foreground">
                  Loại ảnh: <b className="text-foreground">{o.imageType === "FINISHED" ? "Ảnh thành phẩm chụp thực tế tại tiệm" : "Ảnh mẫu khách gửi tham khảo"}</b>
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-ghost h-7 min-h-0 px-2.5 text-xs border border-border"
                  >
                    Đổi ảnh khác
                  </button>
                  <button
                    type="button"
                    onClick={() => { set("image", ""); set("imageType", "SAMPLE"); }}
                    className="btn btn-ghost h-7 min-h-0 px-2.5 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Xoá ảnh
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Upload & Camera Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-primary h-9 min-h-0 px-3.5 text-xs"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Tải ảnh / Chụp ảnh từ máy
                </button>
                <button
                  type="button"
                  onClick={() => setShowUrlField(!showUrlField)}
                  className="btn btn-ghost h-9 min-h-0 px-3 text-xs border border-border"
                >
                  Dán link ảnh (URL)
                </button>
              </div>

              {/* Paste URL Input Field */}
              {showUrlField && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="url"
                    placeholder="https://example.com/anh-hoa.jpg"
                    className="field py-1 px-3 text-xs flex-1"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="btn btn-primary h-8 min-h-0 px-3 text-xs"
                  >
                    Áp dụng
                  </button>
                </div>
              )}

              {/* Quick Presets Picker */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Hoặc chọn nhanh ảnh mẫu hoa phổ biến:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {FLOWER_PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => { set("image", preset.url); set("imageType", "SAMPLE"); }}
                      className="group flex flex-col items-center rounded-xl border border-border p-1.5 text-center hover:border-primary hover:bg-secondary/30 transition-all text-[11px]"
                    >
                      <img src={preset.url} alt={preset.name} className="h-14 w-full rounded-lg object-cover mb-1 group-hover:scale-105 transition-transform" />
                      <span className="line-clamp-1 font-medium text-foreground">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Order Products & Inventory Deduction */}
        <div className="rounded-2xl bg-muted p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Sản phẩm</p>
            <span className="text-[11px] text-primary font-medium bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
              ⚡ Tự động trừ kho khi lưu đơn
            </span>
          </div>

          {o.items.map((it, idx) => {
            const inv = inventory.find((i) => i.id === it.itemId);
            const remaining = inv ? inv.quantity : null;
            const isOver = remaining !== null && it.quantity > remaining;

            return (
              <div key={idx} className="rounded-xl border border-border bg-card p-3 space-y-2 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-foreground truncate">{it.name}</span>
                  {remaining !== null && (
                    <span className={`text-[11px] font-medium ${isOver ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                      Kho hiện còn: <b className="text-foreground">{remaining} {inv?.unit}</b> {isOver && <span className="text-destructive font-bold">(⚠️ Vượt tồn kho)</span>}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-[1fr_5.5rem_7.5rem_2rem] items-center gap-2 text-xs">
                  <span className="text-muted-foreground truncate">Đơn giá: {vnd(it.price)}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-muted-foreground">SL:</span>
                    <input
                      type="number"
                      min={1}
                      className="field px-2 py-1 text-center font-bold"
                      value={it.quantity}
                      onChange={(e) => updItem(idx, "quantity", Math.max(1, +e.target.value))}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-muted-foreground">Giá:</span>
                    <input
                      type="number"
                      min={0}
                      className="field px-2 py-1 font-semibold"
                      value={it.price}
                      onChange={(e) => updItem(idx, "price", +e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                    title="Xoá mục này"
                    onClick={() => set("items", o.items.filter((_, i) => i !== idx))}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}

          <DropdownSelect
            value=""
            onChange={(val) => val && addItem(val)}
            options={[
              { value: "", label: "+ Thêm sản phẩm từ kho…" },
              ...inventory.map((i) => ({
                value: i.id,
                label: `${i.name} — ${vnd(i.sellingPrice)}`,
                badge: (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    Kho: {i.quantity} {i.unit}
                  </span>
                ),
              })),
            ]}
            title="Thêm sản phẩm từ kho"
            placeholder="+ Thêm sản phẩm từ kho…"
          />
        </div>

        {/* Pricing & Statuses */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Label text="Giảm giá (đ)"><input type="number" min={0} className="field" value={o.discount} onChange={(e) => set("discount", +e.target.value)} /></Label>
          <Label text="Trạng thái đơn">
            <DropdownSelect
              value={o.orderStatus}
              onChange={(val) => set("orderStatus", val as OrderStatus)}
              options={Object.entries(STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))}
              title="Trạng thái đơn"
            />
          </Label>
          <Label text="Thanh toán">
            <DropdownSelect
              value={o.paymentStatus}
              onChange={(val) => set("paymentStatus", val as PaymentStatus)}
              options={Object.entries(PAY_LABEL).map(([k, v]) => ({ value: k, label: v }))}
              title="Trạng thái thanh toán"
            />
          </Label>
          <Label text="Phương thức">
            <DropdownSelect
              value={o.paymentMethod}
              onChange={(val) => set("paymentMethod", val as PaymentMethod)}
              options={Object.entries(METHOD_LABEL).map(([k, v]) => ({ value: k, label: v }))}
              title="Phương thức thanh toán"
            />
          </Label>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="font-display text-xl font-bold">Tổng: {vnd(orderTotal(o))}</p>
          <button className="btn btn-primary">Lưu đơn</button>
        </div>
      </form>
    </Modal>
  );
}

function Receipt({ order: o, onClose }: { order: Order; onClose: () => void }) {
  const { storeInfo } = useStore();
  return (
    <Modal open onClose={onClose} title="Hoá đơn thu nhỏ">
      <div className="mx-auto max-w-xs font-mono text-sm bg-card p-2 rounded-xl">
        <div className="flex justify-center mb-2">
          <img src="/logo.png" alt="Tian Florist" className="h-12 w-12 rounded-xl object-cover border border-border/40 shadow-2xs" />
        </div>
        <p className="text-center font-display text-lg font-bold">{storeInfo.name}</p>
        <p className="text-center text-xs text-muted-foreground">{o.id} · {new Date(o.deliveryTime).toLocaleString("vi-VN")}</p>
        
        {/* Flower Image on Receipt */}
        {o.image && (
          <div className="my-2.5 flex justify-center">
            <img src={o.image} alt="Hoa" className="h-28 w-28 rounded-xl object-cover border border-border shadow-xs" />
          </div>
        )}

        <hr className="my-2 border-dashed border-border print:border-black" />
        <div className="text-xs space-y-1">
          <p><b>Khách:</b> {o.customerName} {o.customerPhone && `· ${o.customerPhone}`}</p>
          <p><b>Nhận:</b> {o.recipientName} {o.recipientPhone && `· ${o.recipientPhone}`}</p>
          <p><b>Đ/c:</b> {o.deliveryAddress}</p>
        </div>

        {/* LỜI NHẮN TRÊN THIỆP - NỔI BẬT RÕ RÀNG KHI IN */}
        <div className="my-3 rounded-xl border-2 border-primary/50 bg-secondary/30 p-3 text-center print:border-2 print:border-black print:bg-white print:p-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary print:text-black flex items-center justify-center gap-1">
            💌 LỜI NHẮN TRÊN THIỆP / BĂNG RÔN
          </p>
          {o.cardMessage ? (
            <p className="mt-1 text-sm font-semibold italic text-foreground print:text-black print:font-bold whitespace-pre-line leading-relaxed">
              “{o.cardMessage}”
            </p>
          ) : (
            <p className="mt-1 text-xs italic text-muted-foreground print:text-gray-500">
              (Đơn này không có lời nhắn thiệp)
            </p>
          )}
        </div>

        <hr className="my-2 border-dashed border-border print:border-black" />
        <div className="text-xs space-y-1">
          {o.items.map((i, k) => (
            <div key={k} className="flex justify-between">
              <span>{i.quantity}× {i.name}</span>
              <span className="font-medium">{vnd(i.quantity * i.price)}</span>
            </div>
          ))}
          {o.discount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Giảm giá</span>
              <span>-{vnd(o.discount)}</span>
            </div>
          )}
        </div>

        <hr className="my-2 border-dashed border-border print:border-black" />
        <div className="flex justify-between text-base font-bold">
          <span>TỔNG CỘNG:</span>
          <span>{vnd(orderTotal(o))}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground text-center">
          {PAY_LABEL[o.paymentStatus]} · {METHOD_LABEL[o.paymentMethod]}
        </p>

        <p className="mt-4 text-center text-xs text-muted-foreground">Cảm ơn quý khách đã tin tưởng 🌸</p>
      </div>

      <div className="no-print mt-4 flex justify-center gap-2">
        <button className="btn btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" />In hoá đơn</button>
      </div>
    </Modal>
  );
}
