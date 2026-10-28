import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { db } from "./supabase";

export type OrderStatus = "DRAFT" | "PENDING_PAYMENT" | "PREPARING" | "DELIVERING" | "COMPLETED" | "CANCELLED";
export type PaymentStatus = "UNPAID" | "DEPOSIT" | "PAID";
export type PaymentMethod = "CASH" | "BANK" | "EWALLET";
export type InvCategory = "Hoa Tươi" | "Phụ Kiện & Giấy Bó" | "Mẫu Hoa Cố Định";

export interface OrderItem { itemId: string; name: string; quantity: number; price: number }
export interface Order {
  id: string; customerName: string; customerPhone: string; recipientName: string; recipientPhone: string;
  deliveryAddress: string; deliveryTime: string; cardMessage: string; items: OrderItem[]; discount: number;
  paymentStatus: PaymentStatus; paymentMethod: PaymentMethod; orderStatus: OrderStatus; createdAt: string;
  image?: string;
  imageType?: "SAMPLE" | "FINISHED";
}
export interface InvItem {
  id: string; name: string; category: InvCategory; unit: string; quantity: number; minThreshold: number;
  costPrice: number; sellingPrice: number; expiryDate?: string;
}
export interface Trx {
  id: string; type: "INCOME" | "EXPENSE"; category: string; amount: number; description: string; date: string;
  method: "CASH" | "BANK"; orderId?: string;
}
export interface StoreInfo { name: string; initialInvestment: number; openingCash: number; openingBank: number }
interface Data { storeInfo: StoreInfo; orders: Order[]; inventory: InvItem[]; cashbook: Trx[] }

export const STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT: "Nháp", PENDING_PAYMENT: "Chờ thanh toán", PREPARING: "Đang cắm hoa",
  DELIVERING: "Đang giao", COMPLETED: "Hoàn thành", CANCELLED: "Đã huỷ",
};
export const PAY_LABEL: Record<PaymentStatus, string> = { UNPAID: "Chưa thanh toán", DEPOSIT: "Đã cọc", PAID: "Đã thanh toán" };
export const METHOD_LABEL: Record<PaymentMethod, string> = { CASH: "Tiền mặt", BANK: "Chuyển khoản", EWALLET: "Ví điện tử" };
export const INCOME_CATS = ["Đơn hàng", "Thu khác"];
export const EXPENSE_CATS = ["Nhập hàng", "Mặt bằng", "Điện nước", "Marketing", "Lương nhân viên", "Vận chuyển", "Khác"];
export const INV_CATS: InvCategory[] = ["Hoa Tươi", "Phụ Kiện & Giấy Bó", "Mẫu Hoa Cố Định"];

export const FLOWER_PRESET_IMAGES = [
  { name: "Bó Hồng Dâu Ngọt Ngào", url: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=600&q=80" },
  { name: "Lẵng Khai Trương Phát Tài", url: "https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?auto=format&fit=crop&w=600&q=80" },
  { name: "Bó Hoa Hướng Dương Rực Rỡ", url: "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=600&q=80" },
  { name: "Bó Tulip & Baby Pastel", url: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=600&q=80" },
  { name: "Chậu Lan Hồ Điệp Thuần Khiết", url: "https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=600&q=80" },
];

export const vnd = (n: number) => n.toLocaleString("vi-VN") + " đ";
export const uid = (p: string) => `${p}-${Date.now().toString(36).slice(-5).toUpperCase()}`;
export const orderTotal = (o: Pick<Order, "items" | "discount">) =>
  Math.max(0, o.items.reduce((s, i) => s + i.quantity * i.price, 0) - (o.discount || 0));
export const todayStr = () => new Date().toISOString().slice(0, 10);

// ─── Default seed (chỉ dùng khi Supabase trống) ──────────────────────────────
function seed(): Data {
  const now = new Date();
  const ymNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const ymPrev = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const prev2MonthDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const ymPrev2 = `${prev2MonthDate.getFullYear()}-${String(prev2MonthDate.getMonth() + 1).padStart(2, "0")}`;
  const t = todayStr();
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  return {
    storeInfo: { name: "Tiệm Hoa Mơ Mộng", initialInvestment: 100000000, openingCash: 5000000, openingBank: 20000000 },
    inventory: [
      { id: "INV-01", name: "Hoa Hồng Đà Lạt", category: "Hoa Tươi", unit: "cành", quantity: 45, minThreshold: 20, costPrice: 5000, sellingPrice: 15000, expiryDate: t },
      { id: "INV-02", name: "Hoa Hướng Dương", category: "Hoa Tươi", unit: "cành", quantity: 5, minThreshold: 10, costPrice: 12000, sellingPrice: 30000 },
      { id: "INV-03", name: "Baby trắng", category: "Hoa Tươi", unit: "bó", quantity: 12, minThreshold: 5, costPrice: 40000, sellingPrice: 90000 },
      { id: "INV-04", name: "Giấy gói Hàn Quốc", category: "Phụ Kiện & Giấy Bó", unit: "tờ", quantity: 2, minThreshold: 10, costPrice: 8000, sellingPrice: 20000 },
      { id: "INV-05", name: "Ruy băng lụa", category: "Phụ Kiện & Giấy Bó", unit: "cuộn", quantity: 15, minThreshold: 5, costPrice: 25000, sellingPrice: 50000 },
      { id: "INV-06", name: "Bó Hoa Hồng Dâu", category: "Mẫu Hoa Cố Định", unit: "bó", quantity: 4, minThreshold: 2, costPrice: 200000, sellingPrice: 450000 },
      { id: "INV-07", name: "Lẵng Khai Trương", category: "Mẫu Hoa Cố Định", unit: "lẵng", quantity: 2, minThreshold: 1, costPrice: 600000, sellingPrice: 1500000 },
    ],
    orders: [
      { id: "ORD-001", customerName: "Nguyễn Văn A", customerPhone: "0901234567", recipientName: "Chị An", recipientPhone: "0912000111", deliveryAddress: "123 Lê Lợi, Q.1", deliveryTime: `${t}T10:00`, cardMessage: "Chúc mừng sinh nhật em yêu!", items: [{ itemId: "INV-06", name: "Bó Hoa Hồng Dâu", quantity: 1, price: 450000 }], discount: 0, paymentStatus: "PAID", paymentMethod: "BANK", orderStatus: "DELIVERING", createdAt: y, image: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=600&q=80", imageType: "FINISHED" },
      { id: "ORD-002", customerName: "Anh Bình", customerPhone: "0987654321", recipientName: "Cty Minh Phát", recipientPhone: "0283888999", deliveryAddress: "45 Nguyễn Huệ, Q.1", deliveryTime: `${t}T14:30`, cardMessage: "Khai trương hồng phát", items: [{ itemId: "INV-07", name: "Lẵng Khai Trương", quantity: 1, price: 1500000 }], discount: 100000, paymentStatus: "DEPOSIT", paymentMethod: "CASH", orderStatus: "PREPARING", createdAt: t, image: "https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?auto=format&fit=crop&w=600&q=80", imageType: "SAMPLE" },
      { id: "ORD-000", customerName: "Lê Thu", customerPhone: "0933111222", recipientName: "Lê Thu", recipientPhone: "", deliveryAddress: "Nhận tại tiệm", deliveryTime: `${y}T09:00`, cardMessage: "", items: [{ itemId: "INV-01", name: "Hoa Hồng Đà Lạt", quantity: 20, price: 15000 }], discount: 0, paymentStatus: "PAID", paymentMethod: "CASH", orderStatus: "COMPLETED", createdAt: y, image: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=600&q=80", imageType: "FINISHED" },
      { id: "ORD-003", customerName: "Trần Minh", customerPhone: "0918234567", recipientName: "Chị Mai", recipientPhone: "0918765432", deliveryAddress: "88 Nam Kỳ Khởi Nghĩa, Q.3", deliveryTime: `${ymNow}-15T11:00`, cardMessage: "Kỷ niệm 5 năm ngày cưới", items: [{ itemId: "INV-06", name: "Bó Hoa Hồng Dâu", quantity: 2, price: 450000 }], discount: 50000, paymentStatus: "PAID", paymentMethod: "BANK", orderStatus: "COMPLETED", createdAt: `${ymNow}-15` },
      { id: "ORD-004", customerName: "Vũ Hoàng", customerPhone: "0977889900", recipientName: "Ngân Hàng Vietcombank", recipientPhone: "0283999888", deliveryAddress: "5 Công Trường Mê Linh, Q.1", deliveryTime: `${ymNow}-20T08:30`, cardMessage: "Chúc mừng lễ khánh thành", items: [{ itemId: "INV-07", name: "Lẵng Khai Trương", quantity: 3, price: 1500000 }], discount: 200000, paymentStatus: "PAID", paymentMethod: "BANK", orderStatus: "COMPLETED", createdAt: `${ymNow}-20` },
      { id: "ORD-005", customerName: "Phạm Hương", customerPhone: "0966554433", recipientName: "Mẹ yêu", recipientPhone: "0903332211", deliveryAddress: "12 Pasteur, Q.3", deliveryTime: `${ymNow}-22T16:00`, cardMessage: "Chúc mừng sinh nhật Mẹ", items: [{ itemId: "INV-02", name: "Hoa Hướng Dương", quantity: 10, price: 30000 }, { itemId: "INV-03", name: "Baby trắng", quantity: 2, price: 90000 }], discount: 0, paymentStatus: "PAID", paymentMethod: "CASH", orderStatus: "COMPLETED", createdAt: `${ymNow}-22` },
      { id: "ORD-M2-01", customerName: "Đặng Tiến", customerPhone: "0911223344", recipientName: "Chị Thảo", recipientPhone: "0911223355", deliveryAddress: "10 Võ Văn Tần, Q.3", deliveryTime: `${ymPrev}-05T09:30`, cardMessage: "Happy Birthday", items: [{ itemId: "INV-06", name: "Bó Hoa Hồng Dâu", quantity: 1, price: 450000 }], discount: 0, paymentStatus: "PAID", paymentMethod: "BANK", orderStatus: "COMPLETED", createdAt: `${ymPrev}-05` },
      { id: "ORD-M2-02", customerName: "Bảo Ngọc", customerPhone: "0944556677", recipientName: "Cty FPT Software", recipientPhone: "0287300123", deliveryAddress: "Khu Công Nghệ Cao, TP. Thủ Đức", deliveryTime: `${ymPrev}-12T14:00`, cardMessage: "Mừng khai trương chi nhánh", items: [{ itemId: "INV-07", name: "Lẵng Khai Trương", quantity: 2, price: 1500000 }], discount: 150000, paymentStatus: "PAID", paymentMethod: "BANK", orderStatus: "COMPLETED", createdAt: `${ymPrev}-12` },
      { id: "ORD-M2-03", customerName: "Hoàng Oanh", customerPhone: "0988112233", recipientName: "Hoàng Oanh", recipientPhone: "", deliveryAddress: "Nhận tại tiệm", deliveryTime: `${ymPrev}-18T10:00`, cardMessage: "", items: [{ itemId: "INV-01", name: "Hoa Hồng Đà Lạt", quantity: 30, price: 15000 }, { itemId: "INV-03", name: "Baby trắng", quantity: 3, price: 90000 }], discount: 20000, paymentStatus: "PAID", paymentMethod: "CASH", orderStatus: "COMPLETED", createdAt: `${ymPrev}-18` },
      { id: "ORD-M2-04", customerName: "Lê Tuấn", customerPhone: "0934567890", recipientName: "Học Viện Tài Chính", recipientPhone: "0283822114", deliveryAddress: "15 Lê Duẩn, Q.1", deliveryTime: `${ymPrev}-25T08:00`, cardMessage: "Kính tặng Thầy Cô", items: [{ itemId: "INV-07", name: "Lẵng Khai Trương", quantity: 1, price: 1500000 }, { itemId: "INV-06", name: "Bó Hoa Hồng Dâu", quantity: 2, price: 450000 }], discount: 100000, paymentStatus: "PAID", paymentMethod: "BANK", orderStatus: "COMPLETED", createdAt: `${ymPrev}-25` },
      { id: "ORD-M3-01", customerName: "Trịnh Thăng", customerPhone: "0909090909", recipientName: "Chị Vy", recipientPhone: "0908080808", deliveryAddress: "220 Hai Bà Trưng, Q.1", deliveryTime: `${ymPrev2}-10T15:00`, cardMessage: "Mừng kỷ niệm ngày quen nhau", items: [{ itemId: "INV-06", name: "Bó Hoa Hồng Dâu", quantity: 2, price: 450000 }], discount: 0, paymentStatus: "PAID", paymentMethod: "BANK", orderStatus: "COMPLETED", createdAt: `${ymPrev2}-10` },
      { id: "ORD-M3-02", customerName: "Phan Anh", customerPhone: "0912344321", recipientName: "Thẩm Mỹ Viện Linh Nga", recipientPhone: "0283922334", deliveryAddress: "78 Nguyễn Trãi, Q.5", deliveryTime: `${ymPrev2}-20T09:00`, cardMessage: "Khai trương phát tài", items: [{ itemId: "INV-07", name: "Lẵng Khai Trương", quantity: 2, price: 1500000 }], discount: 100000, paymentStatus: "PAID", paymentMethod: "CASH", orderStatus: "COMPLETED", createdAt: `${ymPrev2}-20` },
    ],
    cashbook: [
      { id: "TRX-001", type: "EXPENSE", category: "Nhập hàng", amount: 2500000, description: "Nhập hoa tươi đợt 1", date: `${ymNow}-05`, method: "CASH" },
      { id: "TRX-002", type: "EXPENSE", category: "Mặt bằng", amount: 6000000, description: "Tiền thuê mặt bằng tiệm", date: `${ymNow}-01`, method: "BANK" },
      { id: "TRX-003", type: "INCOME", category: "Đơn hàng", amount: 300000, description: "Đơn ORD-000", date: y, method: "CASH", orderId: "ORD-000" },
      { id: "TRX-004", type: "INCOME", category: "Đơn hàng", amount: 850000, description: "Đơn ORD-003", date: `${ymNow}-15`, method: "BANK", orderId: "ORD-003" },
      { id: "TRX-005", type: "INCOME", category: "Đơn hàng", amount: 4300000, description: "Đơn ORD-004", date: `${ymNow}-20`, method: "BANK", orderId: "ORD-004" },
      { id: "TRX-006", type: "INCOME", category: "Đơn hàng", amount: 480000, description: "Đơn ORD-005", date: `${ymNow}-22`, method: "CASH", orderId: "ORD-005" },
      { id: "TRX-007", type: "EXPENSE", category: "Điện nước", amount: 650000, description: "Hóa đơn điện nước tháng này", date: `${ymNow}-18`, method: "BANK" },
      { id: "TRX-008", type: "EXPENSE", category: "Marketing", amount: 1200000, description: "Chạy quảng cáo Facebook / TikTok", date: `${ymNow}-10`, method: "BANK" },
      { id: "TRX-M2-01", type: "EXPENSE", category: "Mặt bằng", amount: 6000000, description: "Tiền thuê mặt bằng", date: `${ymPrev}-01`, method: "BANK" },
      { id: "TRX-M2-02", type: "EXPENSE", category: "Nhập hàng", amount: 3200000, description: "Nhập hoa hồng & phụ kiện", date: `${ymPrev}-04`, method: "CASH" },
      { id: "TRX-M2-03", type: "INCOME", category: "Đơn hàng", amount: 450000, description: "Đơn ORD-M2-01", date: `${ymPrev}-05`, method: "BANK", orderId: "ORD-M2-01" },
      { id: "TRX-M2-04", type: "INCOME", category: "Đơn hàng", amount: 2850000, description: "Đơn ORD-M2-02", date: `${ymPrev}-12`, method: "BANK", orderId: "ORD-M2-02" },
      { id: "TRX-M2-05", type: "INCOME", category: "Đơn hàng", amount: 700000, description: "Đơn ORD-M2-03", date: `${ymPrev}-18`, method: "CASH", orderId: "ORD-M2-03" },
      { id: "TRX-M2-06", type: "INCOME", category: "Đơn hàng", amount: 2300000, description: "Đơn ORD-M2-04", date: `${ymPrev}-25`, method: "BANK", orderId: "ORD-M2-04" },
      { id: "TRX-M2-07", type: "EXPENSE", category: "Điện nước", amount: 720000, description: "Điện nước tiệm", date: `${ymPrev}-20`, method: "BANK" },
      { id: "TRX-M2-08", type: "EXPENSE", category: "Marketing", amount: 800000, description: "Quảng cáo online", date: `${ymPrev}-10`, method: "BANK" },
      { id: "TRX-M3-01", type: "EXPENSE", category: "Mặt bằng", amount: 6000000, description: "Tiền thuê mặt bằng", date: `${ymPrev2}-01`, method: "BANK" },
      { id: "TRX-M3-02", type: "EXPENSE", category: "Nhập hàng", amount: 2800000, description: "Nhập phụ liệu", date: `${ymPrev2}-06`, method: "CASH" },
      { id: "TRX-M3-03", type: "INCOME", category: "Đơn hàng", amount: 900000, description: "Đơn ORD-M3-01", date: `${ymPrev2}-10`, method: "BANK", orderId: "ORD-M3-01" },
      { id: "TRX-M3-04", type: "INCOME", category: "Đơn hàng", amount: 2900000, description: "Đơn ORD-M3-02", date: `${ymPrev2}-20`, method: "CASH", orderId: "ORD-M3-02" },
    ],
  };
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

// Map DB row → Order (snake_case → camelCase + JSON parse)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToOrder(r: any): Order {
  return {
    id: r.id ?? "",
    customerName: r.customer_name ?? "",
    customerPhone: r.customer_phone ?? "",
    recipientName: r.recipient_name ?? "",
    recipientPhone: r.recipient_phone ?? "",
    deliveryAddress: r.delivery_address ?? "",
    deliveryTime: r.delivery_time ?? "",
    cardMessage: r.card_message ?? "",
    items: Array.isArray(r.items) ? r.items : (typeof r.items === "string" ? JSON.parse(r.items) : []),
    discount: Number(r.discount) || 0,
    paymentStatus: r.payment_status ?? "UNPAID",
    paymentMethod: r.payment_method ?? "CASH",
    orderStatus: r.order_status ?? "DRAFT",
    createdAt: r.created_at_local ?? todayStr(),
    image: r.image ?? undefined,
    imageType: r.image_type ?? undefined,
  };
}

function orderToRow(o: Order) {
  return {
    id: o.id,
    customer_name: o.customerName,
    customer_phone: o.customerPhone,
    recipient_name: o.recipientName,
    recipient_phone: o.recipientPhone,
    delivery_address: o.deliveryAddress,
    delivery_time: o.deliveryTime,
    card_message: o.cardMessage,
    items: o.items,
    discount: o.discount,
    payment_status: o.paymentStatus,
    payment_method: o.paymentMethod,
    order_status: o.orderStatus,
    created_at_local: o.createdAt,
    image: o.image ?? null,
    image_type: o.imageType ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToInvItem(r: any): InvItem {
  return {
    id: r.id ?? "",
    name: r.name ?? "",
    category: r.category ?? "Hoa Tươi",
    unit: r.unit ?? "cái",
    quantity: Number(r.quantity) || 0,
    minThreshold: Number(r.min_threshold) || 0,
    costPrice: Number(r.cost_price) || 0,
    sellingPrice: Number(r.selling_price) || 0,
    expiryDate: r.expiry_date ?? undefined,
  };
}

function invItemToRow(i: InvItem) {
  return {
    id: i.id,
    name: i.name,
    category: i.category,
    unit: i.unit,
    quantity: i.quantity,
    min_threshold: i.minThreshold,
    cost_price: i.costPrice,
    selling_price: i.sellingPrice,
    expiry_date: i.expiryDate ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTrx(r: any): Trx {
  return {
    id: r.id ?? "",
    type: r.type ?? "EXPENSE",
    category: r.category ?? "Khác",
    amount: Number(r.amount) || 0,
    description: r.description ?? "",
    date: r.date ?? todayStr(),
    method: r.method ?? "CASH",
    orderId: r.order_id ?? undefined,
  };
}

function trxToRow(t: Trx) {
  return {
    id: t.id,
    type: t.type,
    category: t.category,
    amount: t.amount,
    description: t.description,
    date: t.date,
    method: t.method,
    order_id: t.orderId ?? null,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface Ctx extends Data {
  loading: boolean;
  saveOrder: (o: Order) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  saveItem: (i: InvItem) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  adjustStock: (id: string, delta: number) => Promise<void>;
  addTrx: (t: Trx) => Promise<void>;
  deleteTrx: (id: string) => Promise<void>;
  setStoreInfo: (s: StoreInfo) => Promise<void>;
  resetData: () => Promise<void>;
}

const StoreCtx = createContext<Ctx | null>(null);

const DEFAULT_STORE_INFO: StoreInfo = {
  name: "Tiệm Hoa Mơ Mộng",
  initialInvestment: 100000000,
  openingCash: 5000000,
  openingBank: 20000000,
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InvItem[]>([]);
  const [cashbook, setCashbook] = useState<Trx[]>([]);
  const [storeInfo, setStoreInfoState] = useState<StoreInfo>(DEFAULT_STORE_INFO);
  const [loading, setLoading] = useState(true);

  // ─── Load all data from Supabase on mount + Realtime subscription ───────────
  useEffect(() => {
    async function loadAll() {
      try {
        const [ordersRes, invRes, cashRes, infoRes] = await Promise.all([
          db.from("orders").select("*").order("created_at", { ascending: false }),
          db.from("inventory").select("*").order("name"),
          db.from("cashbook").select("*").order("date", { ascending: false }),
          db.from("store_info").select("*").limit(1).single(),
        ]);

        // Nếu có lỗi nghĩa là bảng chưa tồn tại → dùng seed data local
        const hasTableError = ordersRes.error || invRes.error || cashRes.error;
        if (hasTableError) {
          console.warn("Supabase tables not ready, using local seed data.", ordersRes.error?.message);
          const data = seed();
          setOrders(data.orders);
          setInventory(data.inventory);
          setCashbook(data.cashbook);
          setStoreInfoState(data.storeInfo);
          setLoading(false);
          return;
        }

        // Lần đầu chạy (bảng trống) → seed lên Supabase
        const isFirstRun =
          (ordersRes.data?.length === 0) &&
          (invRes.data?.length === 0) &&
          (cashRes.data?.length === 0);

        if (isFirstRun) {
          const data = seed();
          setOrders(data.orders);
          setInventory(data.inventory);
          setCashbook(data.cashbook);
          setStoreInfoState(data.storeInfo);
          // Seed async lên Supabase (không chờ)
          seedToSupabase().catch(console.error);
          setLoading(false);
          return;
        }

        if (ordersRes.data) setOrders(ordersRes.data.map(rowToOrder));
        if (invRes.data) setInventory(invRes.data.map(rowToInvItem));
        if (cashRes.data) setCashbook(cashRes.data.map(rowToTrx));
        if (infoRes.data) {
          setStoreInfoState({
            name: infoRes.data.name,
            initialInvestment: Number(infoRes.data.initial_investment) || 0,
            openingCash: Number(infoRes.data.opening_cash) || 0,
            openingBank: Number(infoRes.data.opening_bank) || 0,
          });
        }
      } catch (err) {
        console.error("Supabase load error:", err);
        // Fallback: dùng seed data local
        const data = seed();
        setOrders(data.orders);
        setInventory(data.inventory);
        setCashbook(data.cashbook);
        setStoreInfoState(data.storeInfo);
      } finally {
        setLoading(false);
      }
    }
    loadAll();

    // ─── Supabase Realtime: lắng nghe đơn mới ─────────────────────────────────
    // Bật Realtime cho bảng 'orders' trong Supabase Dashboard trước khi dùng.
    const channel = db
      .channel("realtime-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newOrder = rowToOrder(payload.new as any);
          setOrders((prev) => {
            // Tránh thêm trùng (nếu optimistic update đã thêm rồi)
            if (prev.some((o) => o.id === newOrder.id)) return prev;
            return [newOrder, ...prev];
          });
          // Phát âm thanh thông báo hoặc hiện toast có thể thêm ở đây
          console.log("[Realtime] Đơn mới:", newOrder.id, newOrder.customerName);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updated = rowToOrder(payload.new as any);
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "orders" },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const deletedId = (payload.old as any)?.id;
          if (deletedId) setOrders((prev) => prev.filter((o) => o.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Seed data to Supabase (first run) ──────────────────────────────────────
  async function seedToSupabase() {
    const data = seed();
    await Promise.all([
      db.from("orders").upsert(data.orders.map(orderToRow)),
      db.from("inventory").upsert(data.inventory.map(invItemToRow)),
      db.from("cashbook").upsert(data.cashbook.map(trxToRow)),
      db.from("store_info").upsert([{
        id: 1,
        name: data.storeInfo.name,
        initial_investment: data.storeInfo.initialInvestment,
        opening_cash: data.storeInfo.openingCash,
        opening_bank: data.storeInfo.openingBank,
      }]),
    ]);
  }

  // ─── Mutations ───────────────────────────────────────────────────────────────

  const saveOrder = useCallback(async (o: Order) => {
    // 1. Optimistic update
    setOrders((prev) =>
      prev.some((x) => x.id === o.id) ? prev.map((x) => (x.id === o.id ? o : x)) : [o, ...prev]
    );

    // 2. Auto-add cashbook entry if COMPLETED
    const existingCashEntry = cashbook.some((t) => t.orderId === o.id);
    if (o.orderStatus === "COMPLETED" && !existingCashEntry) {
      const trx: Trx = {
        id: uid("TRX"),
        type: "INCOME",
        category: "Đơn hàng",
        amount: orderTotal(o),
        description: `Đơn ${o.id} - ${o.customerName}`,
        date: todayStr(),
        method: o.paymentMethod === "CASH" ? "CASH" : "BANK",
        orderId: o.id,
      };
      setCashbook((prev) => [trx, ...prev]);
      await db.from("cashbook").upsert(trxToRow(trx));
    }

    // 3. Adjust inventory stock diff
    const existingOrder = orders.find((x) => x.id === o.id);
    const oldQtyMap = new Map<string, number>();
    if (existingOrder && existingOrder.orderStatus !== "CANCELLED") {
      existingOrder.items.forEach((it) => {
        oldQtyMap.set(it.itemId, (oldQtyMap.get(it.itemId) || 0) + it.quantity);
      });
    }
    const newQtyMap = new Map<string, number>();
    if (o.orderStatus !== "CANCELLED") {
      o.items.forEach((it) => {
        newQtyMap.set(it.itemId, (newQtyMap.get(it.itemId) || 0) + it.quantity);
      });
    }
    const allItemIds = new Set([...oldQtyMap.keys(), ...newQtyMap.keys()]);
    const updatedInv: InvItem[] = [];
    setInventory((prev) => {
      const next = prev.map((inv) => {
        const delta = (newQtyMap.get(inv.id) || 0) - (oldQtyMap.get(inv.id) || 0);
        if (delta !== 0 && allItemIds.has(inv.id)) {
          const updated = { ...inv, quantity: Math.max(0, inv.quantity - delta) };
          updatedInv.push(updated);
          return updated;
        }
        return inv;
      });
      return next;
    });

    // 4. Persist to Supabase
    await db.from("orders").upsert(orderToRow(o));
    for (const inv of updatedInv) {
      await db.from("inventory").update({ quantity: inv.quantity }).eq("id", inv.id);
    }
  }, [orders, cashbook]);

  const deleteOrder = useCallback(async (id: string) => {
    const orderToDelete = orders.find((o) => o.id === id);
    setOrders((prev) => prev.filter((o) => o.id !== id));
    setCashbook((prev) => prev.filter((t) => t.orderId !== id));

    // Restore inventory
    if (orderToDelete && orderToDelete.orderStatus !== "CANCELLED" && Array.isArray(orderToDelete.items)) {
      const restoredInv: InvItem[] = [];
      setInventory((prev) => {
        const next = prev.map((inv) => {
          const qty = (orderToDelete.items || [])
            .filter((it) => it.itemId === inv.id)
            .reduce((s, it) => s + it.quantity, 0);
          if (qty > 0) {
            const updated = { ...inv, quantity: inv.quantity + qty };
            restoredInv.push(updated);
            return updated;
          }
          return inv;
        });
        return next;
      });
      for (const inv of restoredInv) {
        try {
          await db.from("inventory").update({ quantity: inv.quantity }).eq("id", inv.id);
        } catch (e) {
          console.warn("Supabase restore inventory warning:", e);
        }
      }
    }
    try {
      await db.from("cashbook").delete().eq("order_id", id);
      await db.from("orders").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase delete order warning:", e);
    }
  }, [orders]);

  const saveItem = useCallback(async (i: InvItem) => {
    setInventory((prev) =>
      prev.some((x) => x.id === i.id) ? prev.map((x) => (x.id === i.id ? i : x)) : [...prev, i]
    );
    try {
      await db.from("inventory").upsert(invItemToRow(i));
    } catch (e) {
      console.warn("Supabase save item warning:", e);
    }
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    setInventory((prev) => prev.filter((i) => i.id !== id));
    try {
      await db.from("inventory").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase delete item warning:", e);
    }
  }, []);

  const adjustStock = useCallback(async (id: string, delta: number) => {
    let newQty = 0;
    setInventory((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          newQty = Math.max(0, i.quantity + delta);
          return { ...i, quantity: newQty };
        }
        return i;
      })
    );
    try {
      await db.from("inventory").update({ quantity: newQty }).eq("id", id);
    } catch (e) {
      console.warn("Supabase adjust stock warning:", e);
    }
  }, []);

  const addTrx = useCallback(async (t: Trx) => {
    setCashbook((prev) => [t, ...prev]);
    try {
      await db.from("cashbook").upsert(trxToRow(t));
    } catch (e) {
      console.warn("Supabase add trx warning:", e);
    }
  }, []);

  const deleteTrx = useCallback(async (id: string) => {
    setCashbook((prev) => prev.filter((t) => t.id !== id));
    try {
      await db.from("cashbook").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase delete trx warning:", e);
    }
  }, []);

  const setStoreInfo = useCallback(async (s: StoreInfo) => {
    setStoreInfoState(s);
    await db.from("store_info").upsert([{
      id: 1,
      name: s.name,
      initial_investment: s.initialInvestment,
      opening_cash: s.openingCash,
      opening_bank: s.openingBank,
    }]);
  }, []);

  const resetData = useCallback(async () => {
    setLoading(true);
    const data = seed();
    await Promise.all([
      db.from("orders").delete().neq("id", ""),
      db.from("inventory").delete().neq("id", ""),
      db.from("cashbook").delete().neq("id", ""),
    ]);
    await seedToSupabase();
    setOrders(data.orders);
    setInventory(data.inventory);
    setCashbook(data.cashbook);
    setStoreInfoState(data.storeInfo);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: Ctx = {
    storeInfo,
    orders,
    inventory,
    cashbook,
    loading,
    saveOrder,
    deleteOrder,
    saveItem,
    deleteItem,
    adjustStock,
    addTrx,
    deleteTrx,
    setStoreInfo,
    resetData,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}

// ─── Finance helpers (unchanged) ─────────────────────────────────────────────

export interface PeriodFinance {
  revenue: number;
  expenses: number;
  profit: number;
  roi: number;
  ordersCount: number;
  completedCount: number;
  aov: number;
  orders: Order[];
  cashbook: Trx[];
  expenseByCategory: Record<string, number>;
}

export function computeFinance(d: Pick<Data, "orders" | "cashbook" | "storeInfo">) {
  const revenue = d.orders.filter((o) => o.orderStatus === "COMPLETED").reduce((s, o) => s + orderTotal(o), 0);
  const expenses = d.cashbook.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const profit = revenue - expenses;
  const roi = d.storeInfo.initialInvestment > 0 ? Math.max(0, Math.min(100, (profit / d.storeInfo.initialInvestment) * 100)) : 0;
  return { revenue, expenses, profit, roi };
}

export function computeMonthFinance(d: Pick<Data, "orders" | "cashbook" | "storeInfo">, yearMonth: string): PeriodFinance {
  const orders = d.orders.filter((o) => {
    const dt = o.deliveryTime || o.createdAt;
    return dt.startsWith(yearMonth);
  });
  const completedOrders = orders.filter((o) => o.orderStatus === "COMPLETED");
  const revenue = completedOrders.reduce((s, o) => s + orderTotal(o), 0);
  const cashbook = d.cashbook.filter((t) => t.date.startsWith(yearMonth));
  const expenses = cashbook.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const profit = revenue - expenses;
  const roi = d.storeInfo.initialInvestment > 0 ? (profit / d.storeInfo.initialInvestment) * 100 : 0;
  const aov = completedOrders.length > 0 ? Math.round(revenue / completedOrders.length) : 0;

  const expenseByCategory: Record<string, number> = {};
  cashbook.filter((t) => t.type === "EXPENSE").forEach((t) => {
    expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
  });

  return { revenue, expenses, profit, roi, ordersCount: orders.length, completedCount: completedOrders.length, aov, orders, cashbook, expenseByCategory };
}

export function getAvailableMonths(orders: Order[], cashbook: Trx[]): string[] {
  const set = new Set<string>();
  orders.forEach((o) => {
    if (o.deliveryTime) set.add(o.deliveryTime.slice(0, 7));
    if (o.createdAt) set.add(o.createdAt.slice(0, 7));
  });
  cashbook.forEach((t) => {
    if (t.date) set.add(t.date.slice(0, 7));
  });
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    set.add(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`);
  }
  return Array.from(set).sort().reverse();
}
