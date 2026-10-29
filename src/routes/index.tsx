import { createFileRoute, Link } from "@tanstack/react-router";
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Target,
  Truck,
  AlertTriangle,
  ArrowRightLeft,
  Calendar,
  Layers,
  ShoppingBag,
  Percent,
  Receipt,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PageTitle } from "@/components/AppShell";
import { OrderStatusBadge, PaymentStatusBadge, InventoryStatusBadge } from "@/components/StatusBadges";
import { AuthGuard } from "@/components/AuthGuard";
import { DropdownSelect } from "@/components/DropdownSelect";
import {
  computeFinance,
  computeMonthFinance,
  getAvailableMonths,
  useStore,
  vnd,
  STATUS_LABEL,
  PAY_LABEL,
  orderTotal,
  todayStr,
  type OrderStatus,
} from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quản Lý Tiệm Hoa" },
      { name: "description", content: "Doanh thu, lợi nhuận, so sánh giữa các tháng và cảnh báo kho của tiệm hoa." },
      { property: "og:title", content: "Quản Lý Tiệm Hoa" },
      { property: "og:description", content: "Doanh thu, lợi nhuận, so sánh giữa các tháng và cảnh báo kho của tiệm hoa." },
    ],
  }),
  component: () => (
    <AuthGuard allowedRoles={["admin"]}>
      <Dashboard />
    </AuthGuard>
  ),
});

type ViewMode = "ALL" | "SINGLE_MONTH" | "COMPARE_MONTHS";

function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split("-");
  return `Tháng ${Number(month)}/${year}`;
}

function calculateDiff(a: number, b: number) {
  const diff = a - b;
  const percent = b !== 0 ? (diff / Math.abs(b)) * 100 : a > 0 ? 100 : 0;
  return { diff, percent };
}

function Dashboard() {
  const s = useStore();
  const availableMonths = useMemo(() => getAvailableMonths(s.orders, s.cashbook), [s.orders, s.cashbook]);

  const defaultMonthA = availableMonths[0] || new Date().toISOString().slice(0, 7);
  const defaultMonthB = availableMonths[1] || availableMonths[0] || defaultMonthA;

  const [viewMode, setViewMode] = useState<ViewMode>("COMPARE_MONTHS");
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonthA);
  const [monthA, setMonthA] = useState<string>(defaultMonthA);
  const [monthB, setMonthB] = useState<string>(defaultMonthB);
  const [filter, setFilter] = useState<OrderStatus | "ALL">("ALL");

  // All time finance
  const fAll = useMemo(() => computeFinance(s), [s]);

  // Single month finance
  const fSingle = useMemo(() => computeMonthFinance(s, selectedMonth), [s, selectedMonth]);

  // Comparison finances
  const financeA = useMemo(() => computeMonthFinance(s, monthA), [s, monthA]);
  const financeB = useMemo(() => computeMonthFinance(s, monthB), [s, monthB]);

  // Differences for comparison
  const revDiff = useMemo(() => calculateDiff(financeA.revenue, financeB.revenue), [financeA, financeB]);
  const expDiff = useMemo(() => calculateDiff(financeA.expenses, financeB.expenses), [financeA, financeB]);
  const profitDiff = useMemo(() => calculateDiff(financeA.profit, financeB.profit), [financeA, financeB]);
  const ordersDiff = useMemo(() => calculateDiff(financeA.ordersCount, financeB.ordersCount), [financeA, financeB]);
  const aovDiff = useMemo(() => calculateDiff(financeA.aov, financeB.aov), [financeA, financeB]);

  // Chart data for comparison
  const chartData = useMemo(() => {
    return [
      {
        name: "Doanh thu",
        [formatMonthLabel(monthA)]: financeA.revenue,
        [formatMonthLabel(monthB)]: financeB.revenue,
      },
      {
        name: "Chi phí",
        [formatMonthLabel(monthA)]: financeA.expenses,
        [formatMonthLabel(monthB)]: financeB.expenses,
      },
      {
        name: "Lợi nhuận",
        [formatMonthLabel(monthA)]: financeA.profit,
        [formatMonthLabel(monthB)]: financeB.profit,
      },
    ];
  }, [financeA, financeB, monthA, monthB]);

  // Expense breakdown categories comparison
  const expenseCategories = useMemo(() => {
    const cats = new Set<string>([
      ...Object.keys(financeA.expenseByCategory),
      ...Object.keys(financeB.expenseByCategory),
    ]);
    return Array.from(cats).map((cat) => {
      const valA = financeA.expenseByCategory[cat] || 0;
      const valB = financeB.expenseByCategory[cat] || 0;
      const diff = valA - valB;
      const pct = valB !== 0 ? (diff / valB) * 100 : valA > 0 ? 100 : 0;
      return { cat, valA, valB, diff, pct };
    });
  }, [financeA, financeB]);

  // Today deliveries
  const today = s.orders
    .filter((o) => o.deliveryTime.startsWith(todayStr()) && o.orderStatus !== "CANCELLED")
    .filter((o) => filter === "ALL" || o.orderStatus === filter)
    .sort((a, b) => a.deliveryTime.localeCompare(b.deliveryTime));

  const low = s.inventory.filter((i) => i.quantity < i.minThreshold);

  return (
    <div className="space-y-6">
      {/* Title & Mode Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PageTitle title="Tổng quan kinh doanh" />
          <p className="text-sm text-muted-foreground -mt-3">
            Báo cáo hiệu quả tiệm hoa và công cụ so sánh đối soát theo tháng
          </p>
        </div>

        {/* View Mode Pills (Full width tren mobile) */}
        <div className="flex w-full sm:w-auto sm:inline-flex rounded-full bg-white p-1 border border-border shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode("COMPARE_MONTHS")}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              viewMode === "COMPARE_MONTHS"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" />
            <span>So sánh</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("SINGLE_MONTH")}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              viewMode === "SINGLE_MONTH"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>Tháng</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("ALL")}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              viewMode === "ALL"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span>Tất cả</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="card-soft p-4 md:p-5 bg-card">
        {viewMode === "COMPARE_MONTHS" && (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Month A Selector */}
            <div className="flex-1 sm:flex-initial sm:w-48">
              <DropdownSelect
                value={monthA}
                onChange={setMonthA}
                options={availableMonths.map((ym) => ({ value: ym, label: formatMonthLabel(ym) }))}
                title="Chọn Tháng A"
                className="py-1.5 px-3 text-sm font-semibold border-primary/40"
              />
            </div>

            <div className="text-muted-foreground flex items-center justify-center shrink-0">
              <ArrowRightLeft className="h-4 w-4 text-primary" />
            </div>

            {/* Month B Selector */}
            <div className="flex-1 sm:flex-initial sm:w-48">
              <DropdownSelect
                value={monthB}
                onChange={setMonthB}
                options={availableMonths.map((ym) => ({ value: ym, label: formatMonthLabel(ym) }))}
                title="Chọn Tháng B (Đối chứng)"
                className="py-1.5 px-3 text-sm font-semibold"
              />
            </div>
          </div>
        )}

        {viewMode === "SINGLE_MONTH" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Chọn tháng báo cáo:
              </span>
              <div className="w-48">
                <DropdownSelect
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  options={availableMonths.map((ym) => ({ value: ym, label: formatMonthLabel(ym) }))}
                  title="Tháng báo cáo"
                  className="py-1.5 px-3 text-sm font-semibold border-primary/50"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setMonthA(selectedMonth);
                const idx = availableMonths.indexOf(selectedMonth);
                const nextMonth = availableMonths[idx + 1] || availableMonths[0] || selectedMonth;
                setMonthB(nextMonth);
                setViewMode("COMPARE_MONTHS");
              }}
              className="btn btn-ghost h-8 min-h-0 px-3 text-xs text-primary"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
              So sánh tháng này với tháng khác →
            </button>
          </div>
        )}

        {viewMode === "ALL" && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
              <p className="text-sm font-medium">
                Đang hiển thị toàn bộ số liệu luỹ kế từ trước đến nay
              </p>
            </div>
            <button
              type="button"
              onClick={() => setViewMode("COMPARE_MONTHS")}
              className="btn btn-ghost h-8 min-h-0 px-3 text-xs text-primary"
            >
              Chuyển sang so sánh giữa các tháng →
            </button>
          </div>
        )}
      </div>

      {/* COMPARISON VIEW */}
      {viewMode === "COMPARE_MONTHS" && (
        <div className="space-y-6">
          {/* 4 Comparison Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Revenue Comparison */}
            <div className="card-soft p-5 bg-card relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="inline-grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <TrendingUp className="h-5 w-5" />
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    revDiff.diff >= 0
                      ? "bg-primary/10 text-primary"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {revDiff.diff >= 0 ? "↗ +" : "↘ "}
                  {revDiff.percent.toFixed(1)}%
                </span>
              </div>
              <p className="mt-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Doanh thu
              </p>
              <p className="font-display text-2xl font-bold mt-1 text-foreground">
                {vnd(financeA.revenue)}
              </p>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatMonthLabel(monthB)}:</span>
                <span className="font-medium text-foreground">{vnd(financeB.revenue)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Chênh lệch:</span>
                <span
                  className={`font-semibold ${
                    revDiff.diff >= 0 ? "text-primary" : "text-destructive"
                  }`}
                >
                  {revDiff.diff >= 0 ? "+" : ""}
                  {vnd(revDiff.diff)}
                </span>
              </div>
            </div>

            {/* Expenses Comparison */}
            <div className="card-soft p-5 bg-card relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="inline-grid h-10 w-10 place-items-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                  <TrendingDown className="h-5 w-5" />
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    expDiff.diff <= 0
                      ? "bg-primary/10 text-primary"
                      : "bg-warning-soft text-warning"
                  }`}
                >
                  {expDiff.diff >= 0 ? "↗ +" : "↘ "}
                  {expDiff.percent.toFixed(1)}%
                </span>
              </div>
              <p className="mt-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Tổng chi phí
              </p>
              <p className="font-display text-2xl font-bold mt-1 text-foreground">
                {vnd(financeA.expenses)}
              </p>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatMonthLabel(monthB)}:</span>
                <span className="font-medium text-foreground">{vnd(financeB.expenses)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Chênh lệch:</span>
                <span
                  className={`font-semibold ${
                    expDiff.diff <= 0 ? "text-primary" : "text-warning"
                  }`}
                >
                  {expDiff.diff >= 0 ? "+" : ""}
                  {vnd(expDiff.diff)}
                </span>
              </div>
            </div>

            {/* Net Profit Comparison */}
            <div className="card-soft p-5 bg-card relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="inline-grid h-10 w-10 place-items-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <PiggyBank className="h-5 w-5" />
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    profitDiff.diff >= 0
                      ? "bg-primary/10 text-primary"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {profitDiff.diff >= 0 ? "↗ +" : "↘ "}
                  {profitDiff.percent.toFixed(1)}%
                </span>
              </div>
              <p className="mt-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Lợi nhuận ròng
              </p>
              <p
                className={`font-display text-2xl font-bold mt-1 ${
                  financeA.profit >= 0 ? "text-foreground" : "text-destructive"
                }`}
              >
                {vnd(financeA.profit)}
              </p>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatMonthLabel(monthB)}:</span>
                <span className="font-medium text-foreground">{vnd(financeB.profit)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Chênh lệch:</span>
                <span
                  className={`font-semibold ${
                    profitDiff.diff >= 0 ? "text-primary" : "text-destructive"
                  }`}
                >
                  {profitDiff.diff >= 0 ? "+" : ""}
                  {vnd(profitDiff.diff)}
                </span>
              </div>
            </div>

            {/* Orders & AOV Comparison */}
            <div className="card-soft p-5 bg-card relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="inline-grid h-10 w-10 place-items-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                  <ShoppingBag className="h-5 w-5" />
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  AOV: {vnd(financeA.aov)}
                </span>
              </div>
              <p className="mt-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Đơn hàng hoàn tất
              </p>
              <p className="font-display text-2xl font-bold mt-1 text-foreground">
                {financeA.completedCount}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  / {financeA.ordersCount} tổng đơn
                </span>
              </p>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatMonthLabel(monthB)}:</span>
                <span className="font-medium text-foreground">
                  {financeB.completedCount} đơn ({vnd(financeB.aov)}/đơn)
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Biến động AOV:</span>
                <span
                  className={`font-semibold ${
                    aovDiff.diff >= 0 ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {aovDiff.diff >= 0 ? "+" : ""}
                  {vnd(aovDiff.diff)} ({aovDiff.percent.toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Chart & Expense Breakdown Grid */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Chart Area */}
            <div className="card-soft p-5 bg-card lg:col-span-3">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    Biểu đồ đối soát tài chính
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    So sánh cột giữa {formatMonthLabel(monthA)} và {formatMonthLabel(monthB)}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-sm bg-[#6B755F]" />
                    {formatMonthLabel(monthA)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-sm bg-[#A4B296]" />
                    {formatMonthLabel(monthB)}
                  </span>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 15, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAEAE6" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#7A7B76"
                      fontSize={12}
                      tickLine={false}
                      axisLine={{ stroke: "#EAEAE6" }}
                    />
                    <YAxis
                      stroke="#7A7B76"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#EAEAE6" }}
                      tickFormatter={(v) => `${(v / 1000000).toFixed(1)}Tr`}
                    />
                    <Tooltip
                      formatter={(val: any) => [
                        vnd(Number(val || 0)),
                        "",
                      ]}
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#EAEAE6",
                        borderRadius: "12px",
                        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey={formatMonthLabel(monthA)}
                      fill="#6B755F"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                    <Bar
                      dataKey={formatMonthLabel(monthB)}
                      fill="#A4B296"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expense Categories Breakdown */}
            <div className="card-soft p-5 bg-card lg:col-span-2">
              <h3 className="font-display text-lg font-semibold text-foreground">
                Phân bổ chi phí giữa 2 tháng
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                So sánh chi tiết các nhóm chi tiêu trong tiệm
              </p>

              {expenseCategories.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Chưa có dữ liệu chi phí để so sánh trong 2 tháng này.
                </p>
              ) : (
                <div className="space-y-3">
                  {expenseCategories.map((item) => (
                    <div
                      key={item.cat}
                      className="rounded-xl border border-border p-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-foreground">{item.cat}</span>
                        <span
                          className={`text-xs font-semibold ${
                            item.diff <= 0 ? "text-primary" : "text-warning"
                          }`}
                        >
                          {item.diff >= 0 ? "+" : ""}
                          {item.pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground border-t border-border/60 pt-2">
                        <div>
                          <span>{formatMonthLabel(monthA)}: </span>
                          <span className="font-medium text-foreground">{vnd(item.valA)}</span>
                        </div>
                        <div className="text-right">
                          <span>{formatMonthLabel(monthB)}: </span>
                          <span className="font-medium text-foreground">{vnd(item.valB)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SINGLE MONTH OR ALL TIME VIEW */}
      {viewMode !== "COMPARE_MONTHS" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card-soft p-5 bg-card">
            <span className="mb-3 inline-grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <TrendingUp className="h-5 w-5" />
            </span>
            <p className="text-sm text-muted-foreground">
              {viewMode === "SINGLE_MONTH"
                ? `Doanh thu (${formatMonthLabel(selectedMonth)})`
                : "Tổng doanh thu luỹ kế"}
            </p>
            <p className="font-display text-2xl font-bold mt-1">
              {vnd(viewMode === "SINGLE_MONTH" ? fSingle.revenue : fAll.revenue)}
            </p>
            {viewMode === "SINGLE_MONTH" && (
              <p className="text-xs text-muted-foreground mt-2">
                {fSingle.completedCount} đơn hoàn thành · TB {vnd(fSingle.aov)}/đơn
              </p>
            )}
          </div>

          <div className="card-soft p-5 bg-card">
            <span className="mb-3 inline-grid h-10 w-10 place-items-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              <TrendingDown className="h-5 w-5" />
            </span>
            <p className="text-sm text-muted-foreground">
              {viewMode === "SINGLE_MONTH"
                ? `Tổng chi phí (${formatMonthLabel(selectedMonth)})`
                : "Tổng chi phí luỹ kế"}
            </p>
            <p className="font-display text-2xl font-bold mt-1">
              {vnd(viewMode === "SINGLE_MONTH" ? fSingle.expenses : fAll.expenses)}
            </p>
            {viewMode === "SINGLE_MONTH" && (
              <p className="text-xs text-muted-foreground mt-2">
                {fSingle.cashbook.filter((t) => t.type === "EXPENSE").length} khoản chi phí
              </p>
            )}
          </div>

          <div className="card-soft p-5 bg-card">
            <span className="mb-3 inline-grid h-10 w-10 place-items-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              <PiggyBank className="h-5 w-5" />
            </span>
            <p className="text-sm text-muted-foreground">
              {viewMode === "SINGLE_MONTH"
                ? `Lợi nhuận ròng (${formatMonthLabel(selectedMonth)})`
                : "Lợi nhuận ròng luỹ kế"}
            </p>
            <p
              className={`font-display text-2xl font-bold mt-1 ${
                (viewMode === "SINGLE_MONTH" ? fSingle.profit : fAll.profit) >= 0
                  ? "text-foreground"
                  : "text-destructive"
              }`}
            >
              {vnd(viewMode === "SINGLE_MONTH" ? fSingle.profit : fAll.profit)}
            </p>
            {viewMode === "SINGLE_MONTH" && (
              <p className="text-xs text-primary font-medium mt-2">
                Tỷ suất lợi nhuận:{" "}
                {fSingle.revenue > 0
                  ? ((fSingle.profit / fSingle.revenue) * 100).toFixed(1)
                  : "0"}
                %
              </p>
            )}
          </div>

          <div className="card-soft p-5 bg-card">
            <span className="mb-3 inline-grid h-10 w-10 place-items-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
              <Target className="h-5 w-5" />
            </span>
            <p className="text-sm text-muted-foreground">Tiến độ hoàn vốn</p>
            <p className="font-display text-2xl font-bold mt-1">{fAll.roi.toFixed(1)}%</p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, fAll.roi))}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Vốn ban đầu: {vnd(s.storeInfo.initialInvestment)}
            </p>
          </div>
        </div>
      )}

      {/* LOWER SECTION: DELIVERIES & INVENTORY (Đồng bộ tỉ lệ 3 : 2 thẳng hàng với biểu đồ phía trên) */}
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card-soft p-5 bg-card lg:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
              <Truck className="h-5 w-5 text-primary shrink-0" />
              <span>Đơn cần giao hôm nay</span>
            </h2>
            <div className="w-auto ml-auto shrink-0">
              <DropdownSelect
                value={filter}
                onChange={(val) => setFilter(val as OrderStatus | "ALL")}
                options={[
                  { value: "ALL", label: "Tất cả trạng thái" },
                  ...Object.entries(STATUS_LABEL).map(([k, v]) => ({ value: k, label: v })),
                ]}
                variant="compact"
                title="Lọc trạng thái đơn"
                align="right"
              />
            </div>
          </div>

          {today.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-highlight/50 text-highlight-foreground">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-foreground">Không có đơn giao hôm nay</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tất cả đơn đã được xử lý hoặc chưa tới giờ giao
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {today.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    {o.image ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border">
                        <img src={o.image} alt="Hoa" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground text-[10px]">
                        🌸
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        <span className="text-primary font-bold">
                          {o.deliveryTime.slice(11, 16)}
                        </span>{" "}
                        · {o.recipientName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {o.deliveryAddress} · {o.items.map((i) => i.name).join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 text-right shrink-0">
                    <p className="font-bold text-sm text-foreground">{vnd(orderTotal(o))}</p>
                    <div className="flex items-center gap-1.5">
                      <OrderStatusBadge status={o.orderStatus} size="sm" />
                      <PaymentStatusBadge status={o.paymentStatus} size="sm" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 pt-3 border-t border-border">
            <Link
              to="/don-hang"
              className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
            >
              Quản lý toàn bộ danh sách đơn hàng →
            </Link>
          </div>
        </section>

        <section className="card-soft p-5 bg-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Cảnh báo kho
            </h2>
            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
              {low.length} mục
            </span>
          </div>

          {low.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-foreground">Kho hàng đầy đủ ✨</p>
              <p className="text-xs text-muted-foreground mt-1">
                Số lượng tồn kho đều trên mức tối thiểu
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {low.map((i) => (
                <li
                  key={i.id}
                  className="flex items-center justify-between rounded-xl border border-warning/20 bg-warning-soft px-3 py-2.5 text-xs"
                >
                  <span className="font-medium text-foreground">{i.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-warning">
                      {i.quantity} {i.unit}
                    </span>
                    <InventoryStatusBadge quantity={i.quantity} minThreshold={i.minThreshold} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 pt-3 border-t border-border">
            <Link
              to="/kho-hang"
              className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
            >
              Xem chi tiết kho hàng →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
