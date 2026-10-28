import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Label, PageTitle } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/cai-dat")({
  head: () => ({
    meta: [
      { title: "Cài đặt | Quản Lý Tiệm Hoa" },
      { name: "description", content: "Thông tin tiệm, vốn đầu tư và số dư đầu kỳ." },
      { property: "og:title", content: "Cài đặt | Quản Lý Tiệm Hoa" },
      { property: "og:description", content: "Thông tin tiệm, vốn đầu tư và số dư đầu kỳ." },
    ],
  }),
  component: () => (
    <AuthGuard allowedRoles={["admin"]}>
      <SettingsPage />
    </AuthGuard>
  ),
});

function SettingsPage() {
  const { storeInfo, setStoreInfo, resetData } = useStore();
  const [s, setS] = useState(storeInfo);
  const [saved, setSaved] = useState(false);
  useEffect(() => setS(storeInfo), [storeInfo]);
  return (
    <>
      <PageTitle title="Cài đặt" />
      <form className="card-soft max-w-xl space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); setStoreInfo(s); setSaved(true); setTimeout(() => setSaved(false), 2000); }}>
        <Label text="Tên tiệm"><input className="field" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} /></Label>
        <Label text="Tổng vốn đầu tư ban đầu (đ)"><input type="number" min={0} className="field" value={s.initialInvestment} onChange={(e) => setS({ ...s, initialInvestment: +e.target.value })} /></Label>
        <Label text="Tiền mặt đầu kỳ (đ)"><input type="number" className="field" value={s.openingCash} onChange={(e) => setS({ ...s, openingCash: +e.target.value })} /></Label>
        <Label text="Số dư ngân hàng đầu kỳ (đ)"><input type="number" className="field" value={s.openingBank} onChange={(e) => setS({ ...s, openingBank: +e.target.value })} /></Label>
        <div className="flex items-center gap-3">
          <button className="btn btn-primary">Lưu</button>
          {saved && <span className="text-sm text-success">Đã lưu ✓</span>}
        </div>
      </form>
      <div className="card-soft mt-4 max-w-xl p-5">
        <p className="font-semibold">Dữ liệu mẫu</p>
        <p className="mb-3 text-sm text-muted-foreground">Dữ liệu được lưu trên trình duyệt này. Bạn có thể khôi phục về dữ liệu mẫu ban đầu.</p>
        <button className="btn btn-ghost text-destructive" onClick={() => confirm("Xoá toàn bộ và khôi phục dữ liệu mẫu?") && resetData()}>Khôi phục dữ liệu mẫu</button>
      </div>
    </>
  );
}
