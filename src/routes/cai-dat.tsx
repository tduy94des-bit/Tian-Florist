import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Label, PageTitle } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { UserPlus, UserCheck, ShieldCheck } from "lucide-react";

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

interface CreatedStaff {
  account: string;
  name: string;
  createdAt: string;
}

function SettingsPage() {
  const { storeInfo, setStoreInfo, resetData } = useStore();
  const { createStaffAccount } = useAuth();
  const [s, setS] = useState(storeInfo);
  const [saved, setSaved] = useState(false);

  // State cho việc cấp tài khoản staff
  const [staffName, setStaffName] = useState("");
  const [staffAccount, setStaffAccount] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [staffList, setStaffList] = useState<CreatedStaff[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const local = localStorage.getItem("tiemhoa_staff_accounts");
        return local ? JSON.parse(local) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => setS(storeInfo), [storeInfo]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffAccount.trim() || !staffPassword.trim()) {
      toast.error("Vui lòng nhập đầy đủ tên tài khoản và mật khẩu");
      return;
    }
    if (staffPassword.length < 6) {
      toast.error("Mật khẩu tối thiểu 6 ký tự");
      return;
    }

    setCreatingStaff(true);
    try {
      const { error } = await createStaffAccount(staffAccount, staffPassword, staffName);
      if (error) {
        toast.error(`Không thể tạo tài khoản: ${error}`);
      } else {
        toast.success(`Đã tạo tài khoản cho nhân viên "${staffName || staffAccount}" thành công!`);
        const updatedList: CreatedStaff[] = [
          {
            account: staffAccount.trim(),
            name: staffName.trim() || staffAccount.trim(),
            createdAt: new Date().toLocaleDateString("vi-VN"),
          },
          ...staffList.filter((x) => x.account !== staffAccount.trim()),
        ];
        setStaffList(updatedList);
        localStorage.setItem("tiemhoa_staff_accounts", JSON.stringify(updatedList));

        // Reset form
        setStaffName("");
        setStaffAccount("");
        setStaffPassword("");
      }
    } finally {
      setCreatingStaff(false);
    }
  };

  return (
    <>
      <PageTitle title="Cài đặt" />

      <div className="space-y-6">
        {/* HÀNG 1: 2 CỘT CHIA ĐỀU 50% - ĐỒNG BỘ CHIỀU CAO & KÍCH THƯỚC */}
        <div className="grid gap-6 lg:grid-cols-2 items-stretch">
          {/* Card 1: Thông tin tiệm & tài chính */}
          <form
            className="card-soft p-5 sm:p-6 flex flex-col justify-between h-full space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setStoreInfo(s);
              setSaved(true);
              setTimeout(() => setSaved(false), 2000);
            }}
          >
            <div className="space-y-3">
              <div className="border-b border-border/60 pb-3">
                <h2 className="font-semibold text-base text-foreground">
                  Thông tin tiệm hoa & Tài chính
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cấu hình tên tiệm, tổng vốn đầu tư ban đầu và số dư đầu kỳ
                </p>
              </div>

              <Label text="Tên tiệm">
                <input
                  className="field"
                  value={s.name}
                  onChange={(e) => setS({ ...s, name: e.target.value })}
                />
              </Label>
              <Label text="Tổng vốn đầu tư ban đầu (đ)">
                <input
                  type="number"
                  min={0}
                  className="field"
                  value={s.initialInvestment}
                  onChange={(e) => setS({ ...s, initialInvestment: +e.target.value })}
                />
              </Label>
              <Label text="Tiền mặt đầu kỳ (đ)">
                <input
                  type="number"
                  className="field"
                  value={s.openingCash}
                  onChange={(e) => setS({ ...s, openingCash: +e.target.value })}
                />
              </Label>
              <Label text="Số dư ngân hàng đầu kỳ (đ)">
                <input
                  type="number"
                  className="field"
                  value={s.openingBank}
                  onChange={(e) => setS({ ...s, openingBank: +e.target.value })}
                />
              </Label>
            </div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-between">
              <button className="btn btn-primary px-6 cursor-pointer">Lưu cài đặt</button>
              {saved && <span className="text-sm font-semibold text-success">Đã lưu thành công ✓</span>}
            </div>
          </form>

          {/* Card 2: Cấp tài khoản cho Staff */}
          <form
            className="card-soft p-5 sm:p-6 flex flex-col justify-between h-full space-y-4"
            onSubmit={handleCreateStaff}
          >
            <div className="space-y-3">
              <div className="border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary shrink-0" />
                  <h2 className="font-semibold text-base text-foreground">
                    Cấp tài khoản Nhân viên (Staff)
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Chỉ Admin mới có quyền tạo tài khoản. Nhân viên có quyền truy cập Đơn hàng, Kho và Sổ quỹ.
                </p>
              </div>

              <Label text="Họ tên nhân viên (tùy chọn)">
                <input
                  className="field"
                  placeholder="VD: Nguyễn Thị Lan"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                />
              </Label>

              <Label text="Tên tài khoản / Email *">
                <input
                  required
                  className="field"
                  placeholder="VD: lan_tian hoặc lan@tiemhoa.vn"
                  value={staffAccount}
                  onChange={(e) => setStaffAccount(e.target.value)}
                />
              </Label>

              <Label text="Mật khẩu ban đầu *">
                <input
                  required
                  minLength={6}
                  type="text"
                  className="field"
                  placeholder="Tối thiểu 6 ký tự"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                />
              </Label>
            </div>

            <div className="pt-3 border-t border-border/60">
              <button
                type="submit"
                disabled={creatingStaff}
                className="btn btn-primary w-full cursor-pointer"
              >
                {creatingStaff ? "Đang tạo tài khoản..." : "Tạo tài khoản Staff"}
              </button>
            </div>
          </form>
        </div>

        {/* HÀNG 2: DỮ LIỆU MẪU & DANH SÁCH STAFF (CHIA ĐỀU 2 CỘT ĐỒNG BỘ 50% - 50%) */}
        <div className="grid gap-6 lg:grid-cols-2 items-stretch">
          {/* Card: Dữ liệu mẫu & Quản trị */}
          <div className="card-soft p-5 sm:p-6 flex flex-col justify-between h-full space-y-4">
            <div className="space-y-2">
              <div className="border-b border-border/60 pb-3">
                <h3 className="font-semibold text-base text-foreground">Dữ liệu mẫu & Khôi phục</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Quản trị bộ nhớ cache trình duyệt và dữ liệu vận hành
                </p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                Dữ liệu được lưu trữ an toàn trực tiếp trên trình duyệt của bạn. Bạn có thể khôi phục về bộ dữ liệu mẫu ban đầu để kiểm thử hoặc làm mới hệ thống bất cứ lúc nào.
              </p>
            </div>
            <div className="pt-3 border-t border-border/60">
              <button
                type="button"
                className="btn btn-ghost text-destructive hover:bg-destructive/10 border border-destructive/30 text-xs font-semibold px-4 w-full sm:w-auto cursor-pointer"
                onClick={() => confirm("Xoá toàn bộ và khôi phục dữ liệu mẫu?") && resetData()}
              >
                Khôi phục dữ liệu mẫu
              </button>
            </div>
          </div>

          {/* Card: Danh sách Staff đã cấp HOẶC Hướng dẫn Bảo mật & Phân quyền */}
          <div className="card-soft p-5 sm:p-6 flex flex-col justify-between h-full space-y-4">
            {staffList.length > 0 ? (
              <div className="space-y-3">
                <div className="border-b border-border/60 pb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-base flex items-center gap-2 text-foreground">
                    <UserCheck className="h-5 w-5 text-primary shrink-0" />
                    <span>Tài khoản Staff ({staffList.length})</span>
                  </h3>
                  <span className="text-xs text-muted-foreground font-medium">Đã cấp quyền</span>
                </div>
                <div className="divide-y divide-border/60 max-h-48 overflow-y-auto">
                  {staffList.map((st, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-foreground">{st.name}</p>
                        <p className="text-muted-foreground text-[11px]">Tài khoản: {st.account}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
                        Ngày tạo: {st.createdAt}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="border-b border-border/60 pb-3 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                  <h3 className="font-semibold text-base text-foreground">Bảo mật & Phân quyền</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                  Chỉ tài khoản Chủ shop (Admin) mới có quyền truy cập tab Cài đặt này và xem Tổng quan tài chính. Nhân viên (Staff) sau khi được cấp tài khoản sẽ chỉ có quyền tạo đơn, cập nhật kho và ghi sổ quỹ thu chi thường nhật.
                </p>
                <div className="pt-2 text-[11px] font-medium text-primary flex items-center gap-1.5">
                  <span>✓ Chưa có tài khoản nhân viên bổ sung nào được tạo.</span>
                </div>
              </div>
            )}
            <div className="pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between">
              <span>Hệ thống phân quyền Tian Florist</span>
              <span className="font-semibold text-foreground">Admin</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
