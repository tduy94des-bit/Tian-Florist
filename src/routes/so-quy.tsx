import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Label, Modal, PageTitle } from "@/components/AppShell";
import { ConfirmModal } from "@/components/ConfirmModal";
import { PaginationBar } from "@/components/PaginationBar";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import { DropdownSelect } from "@/components/DropdownSelect";
import { useStore, vnd, uid, todayStr, INCOME_CATS, EXPENSE_CATS, type Trx } from "@/lib/store";

export const Route = createFileRoute("/so-quy")({
  head: () => ({
    meta: [
      { title: "Sổ quỹ | Quản Lý Tiệm Hoa" },
      { name: "description", content: "Ghi thu chi, theo dõi tiền mặt, ngân hàng và dòng tiền tháng." },
      { property: "og:title", content: "Sổ quỹ | Quản Lý Tiệm Hoa" },
      { property: "og:description", content: "Ghi thu chi, theo dõi tiền mặt, ngân hàng và dòng tiền tháng." },
    ],
  }),
  component: () => (
    <AuthGuard>
      <CashbookPage />
    </AuthGuard>
  ),
});

const PAGE_SIZE = 10;

function CashbookPage() {
  const { cashbook, storeInfo, deleteTrx } = useStore();
  const [open, setOpen] = useState(false);
  const [deletingTrx, setDeletingTrx] = useState<Trx | null>(null);
  const [type, setType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // Tự động trở về trang 1 khi lọc Thu / Chi / Tất cả
  useEffect(() => {
    setCurrentPage(1);
  }, [type]);

  const sign = (t: Trx) => (t.type === "INCOME" ? t.amount : -t.amount);
  const cash = storeInfo.openingCash + cashbook.filter((t) => t.method === "CASH").reduce((s, t) => s + sign(t), 0);
  const bank = storeInfo.openingBank + cashbook.filter((t) => t.method === "BANK").reduce((s, t) => s + sign(t), 0);
  const month = todayStr().slice(0, 7);
  const monthly = cashbook.filter((t) => t.date.startsWith(month)).reduce((s, t) => s + sign(t), 0);
  const list = cashbook.filter((t) => type === "ALL" || t.type === type).sort((a, b) => b.date.localeCompare(a.date));

  const totalPages = Math.ceil(list.length / PAGE_SIZE) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedList = list.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <>
      <PageTitle title="Sổ quỹ" action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Ghi nhanh</button>} />
      <div className="grid gap-4 sm:grid-cols-3">
        {([["Tiền mặt", cash, "💰"], ["Ngân hàng", bank, "🏦"], ["Dòng tiền tháng này", monthly, "📊"]] as const).map(([l, v, icon]) => (
          <div key={l as string} className="card-soft p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{l}</p>
              <span className="inline-grid h-8 w-8 place-items-center rounded-xl bg-highlight/50 text-sm">{icon}</span>
            </div>
            <p className={`font-display text-2xl font-bold mt-2 ${(v as number) < 0 ? "text-destructive" : "text-foreground"}`}>{vnd(v as number)}</p>
          </div>
        ))}
      </div>
      <div className="my-4 flex items-center gap-1.5">
        {([["ALL", `Tất cả (${cashbook.length})`], ["INCOME", `Thu (${cashbook.filter(t => t.type === "INCOME").length})`], ["EXPENSE", `Chi (${cashbook.filter(t => t.type === "EXPENSE").length})`]] as const).map(([k, l]) => (
          <button
            key={k}
            className={`btn h-8 min-h-0 rounded-full px-3.5 text-xs font-semibold transition-all ${
              type === k
                ? "btn-primary shadow-sm"
                : "bg-white border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 shadow-2xs"
            }`}
            onClick={() => setType(k as any)}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="card-soft divide-y divide-border/70 border border-border/80 bg-card shadow-card overflow-hidden">
        {paginatedList.map((t) => {
          const isIncome = t.type === "INCOME";
          return (
            <div key={t.id} className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                    isIncome
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                  }`}
                >
                  {isIncome ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </span>
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    {t.category}{" "}
                    <span className="text-xs font-normal text-muted-foreground">· {t.method === "CASH" ? "Tiền mặt" : "Ngân hàng"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.description || "Giao dịch"} · {new Date(t.date).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-display text-base font-bold ${isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {isIncome ? "+" : "−"}{vnd(t.amount)}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Xoá giao dịch"
                  aria-label="Xoá giao dịch"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingTrx(t);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
        {list.length === 0 && <p className="p-8 text-center text-muted-foreground">Chưa có giao dịch.</p>}
      </div>

      {/* Pagination Controls */}
      <PaginationBar
        currentPage={currentPage}
        totalItems={list.length}
        pageSize={PAGE_SIZE}
        itemName="giao dịch"
        onPageChange={setCurrentPage}
      />

      {open && <QuickEntry onClose={() => setOpen(false)} />}

      <ConfirmModal
        open={!!deletingTrx}
        onClose={() => setDeletingTrx(null)}
        onConfirm={() => {
          if (deletingTrx) {
            deleteTrx(deletingTrx.id);
            toast.success(`Đã xoá giao dịch ${deletingTrx.category}`);
            setDeletingTrx(null);
          }
        }}
        title="Xác nhận xoá giao dịch"
        description={
          deletingTrx ? (
            <p>
              Bạn có chắc chắn muốn xoá giao dịch <strong className="text-foreground">{deletingTrx.category}</strong> ({deletingTrx.type === "INCOME" ? "Thu" : "Chi"} {vnd(deletingTrx.amount)})? Dòng tiền và số dư quỹ sẽ được cập nhật lại.
            </p>
          ) : undefined
        }
        confirmLabel="Xoá giao dịch"
      />
    </>
  );
}

function QuickEntry({ onClose }: { onClose: () => void }) {
  const { addTrx } = useStore();
  const [t, setT] = useState<Trx>({ id: uid("TRX"), type: "EXPENSE", category: EXPENSE_CATS[0]!, amount: 0, description: "", date: todayStr(), method: "CASH" });
  const cats = t.type === "INCOME" ? INCOME_CATS : EXPENSE_CATS;
  return (
    <Modal open onClose={onClose} title="Ghi thu chi nhanh">
      <form className="space-y-3.5" onSubmit={(e) => { e.preventDefault(); if (t.amount > 0) { addTrx(t); onClose(); } }}>
        {/* Toggle Chi / Thu - Sử dụng màu xanh brand cho trạng thái active */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-muted/80 border border-border">
          {(["EXPENSE", "INCOME"] as const).map((k) => {
            const isSelected = t.type === k;
            return (
              <button
                type="button"
                key={k}
                className={`py-2 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground font-semibold"
                }`}
                onClick={() =>
                  setT({
                    ...t,
                    type: k,
                    category: (k === "INCOME" ? INCOME_CATS : EXPENSE_CATS)[0]!,
                  })
                }
              >
                {k === "INCOME" ? "Thu" : "Chi"}
              </button>
            );
          })}
        </div>

        <Label text="Số tiền (đ)">
          <input
            autoFocus
            required
            type="number"
            min={1}
            inputMode="numeric"
            className="field font-display text-2xl font-bold"
            value={t.amount || ""}
            onChange={(e) => setT({ ...t, amount: +e.target.value })}
          />
        </Label>

        {/* Danh sách danh mục: Nút active (nhập hàng,...) sử dụng màu xanh brand */}
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => {
            const isSelected = t.category === c;
            return (
              <button
                type="button"
                key={c}
                onClick={() => setT({ ...t, category: c })}
                className={`rounded-full px-3.5 py-1.5 text-xs transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-white border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 font-semibold"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        <Label text="Ghi chú">
          <input
            className="field"
            value={t.description}
            onChange={(e) => setT({ ...t, description: e.target.value })}
          />
        </Label>

        <div className="grid grid-cols-2 gap-3">
          <Label text="Ngày">
            <input
              type="date"
              className="field"
              value={t.date}
              onChange={(e) => setT({ ...t, date: e.target.value })}
            />
          </Label>
          <Label text="Nguồn tiền">
            <DropdownSelect
              value={t.method}
              onChange={(val) => setT({ ...t, method: val as Trx["method"] })}
              options={[
                { value: "CASH", label: "Tiền mặt" },
                { value: "BANK", label: "Ngân hàng" },
              ]}
              title="Nguồn tiền"
            />
          </Label>
        </div>

        <button className="btn btn-primary w-full shadow-xs cursor-pointer font-bold">
          Lưu
        </button>
      </form>
    </Modal>
  );
}
