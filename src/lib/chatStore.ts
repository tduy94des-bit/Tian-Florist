export type SocialChannel = "facebook" | "instagram" | "zalo" | "tiktok";

export interface ChatMessage {
  id: string;
  sender: "customer" | "shop";
  text: string;
  time: string; // HH:mm
}

export interface Conversation {
  id: string;
  channel: SocialChannel;
  customerName: string;
  customerHandle: string;
  avatarUrl?: string;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
  orderStatus: "NONE" | "CREATED";
  createdOrderId?: string;
  messages: ChatMessage[];
}

const STORAGE_KEY = "tiemhoa_conversations";

export const CHANNEL_META: Record<SocialChannel, { name: string; color: string; bg: string; border: string }> = {
  facebook: {
    name: "Facebook",
    color: "#1877F2",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
  },
  instagram: {
    name: "Instagram",
    color: "#E4405F",
    bg: "bg-pink-50 dark:bg-pink-950/40",
    border: "border-pink-200 dark:border-pink-800",
  },
  zalo: {
    name: "Zalo",
    color: "#0068FF",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-200 dark:border-sky-800",
  },
  tiktok: {
    name: "TikTok",
    color: "#000000",
    bg: "bg-neutral-100 dark:bg-neutral-900",
    border: "border-neutral-300 dark:border-neutral-700",
  },
};

// Dữ liệu mẫu thực tế của tiệm hoa đa kênh
export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "CONV-FB-01",
    channel: "facebook",
    customerName: "Nguyễn Hoàng Nam",
    customerHandle: "fb.com/nam.nguyenhoang92",
    lastMessage: "Em vừa chuyển khoản 450k rồi chị nha. Nhớ ghi thiệp giúp em!",
    updatedAt: "10 phút trước",
    unreadCount: 1,
    orderStatus: "NONE",
    messages: [
      { id: "m1", sender: "customer", text: "Chào shop ơi, tiệm mình còn mẫu Bó Hoa Hồng Dâu không ạ?", time: "14:15" },
      { id: "m2", sender: "shop", text: "Dạ Tian Florist chào anh Nam ạ! Mẫu Bó Hồng Dâu tiệm đang sẵn hoa tươi mới về sáng nay ạ, giá 450.000đ anh nhé 🌸", time: "14:16" },
      { id: "m3", sender: "customer", text: "Dạ vậy ship giúp em 1 bó qua The Ori Garden, Liên Chiểu, Đà Nẵng lúc 15:30 chiều mai nha", time: "14:18" },
      { id: "m4", sender: "shop", text: "Dạ vâng ạ, anh cho em xin thông tin người nhận và số điện thoại nha anh?", time: "14:19" },
      { id: "m5", sender: "customer", text: "Người nhận là bạn em tên Mai Anh, sđt 0905123456 nha. Ghi thiệp giúp em: 'Chúc mừng sinh nhật công chúa nhỏ của anh ❤️'", time: "14:21" },
      { id: "m6", sender: "shop", text: "Dạ tiệm đã lưu thông tin thiệp rồi ạ. Anh muốn thanh toán chuyển khoản hay nhận hàng gửi tiền mặt ạ?", time: "14:22" },
      { id: "m7", sender: "customer", text: "Em vừa chuyển khoản 450k qua Vietcombank rồi chị nha. Nhớ ghi thiệp đẹp giúp em!", time: "14:25" },
    ],
  },
  {
    id: "CONV-IG-02",
    channel: "instagram",
    customerName: "Lê Ngọc Linh",
    customerHandle: "@linh.le.sweet",
    lastMessage: "Dạ giao trước 9h sáng mai giúp em đến 45 Nguyễn Huệ Quận 1 ạ",
    updatedAt: "25 phút trước",
    unreadCount: 2,
    orderStatus: "NONE",
    messages: [
      { id: "m1", sender: "customer", text: "Hello shop, em cần đặt 1 lẵng hoa khai trương mừng cty đối tác", time: "13:40" },
      { id: "m2", sender: "shop", text: "Dạ chào bạn Linh ạ! Tiệm có mẫu Lẵng Khai Trương Phát Tài tone đỏ cam rực rỡ 1.500.000đ rất được ưa chuộng ạ ✨", time: "13:42" },
      { id: "m3", sender: "customer", text: "Mẫu này đẹp quá, lấy em lẵng này nhé. In banner giúp em: 'CÔNG TY TNHH PHÁT ĐẠT CHÚC MỪNG KHAI TRƯƠNG HỒNG PHÁT'", time: "13:45" },
      { id: "m4", sender: "shop", text: "Dạ tiệm thiết kế banner miễn phí gửi bạn duyệt liền ạ. Bạn cho shop xin địa chỉ và thời gian nhận với sđt nhé ạ", time: "13:46" },
      { id: "m5", sender: "customer", text: "Dạ giao trước 9h sáng mai giúp em đến 45 Nguyễn Huệ, Quận 1 nha shop. Người nhận là anh Hùng, sđt 0938889999. Em nhận hàng thanh toán tiền mặt nha", time: "13:50" },
    ],
  },
  {
    id: "CONV-ZL-03",
    channel: "zalo",
    customerName: "Chị Thảo Zalo",
    customerHandle: "Zalo: 0918765432",
    lastMessage: "Chị đã bank cọc 200k rồi nhé shop",
    updatedAt: "1 giờ trước",
    unreadCount: 0,
    orderStatus: "NONE",
    messages: [
      { id: "m1", sender: "customer", text: "Tiệm có nhận cắm hoa sinh nhật mẹ tone tím pastel không em?", time: "11:20" },
      { id: "m2", sender: "shop", text: "Dạ có chị Thảo ơi, tiệm có mẫu hoa hồng kết hợp baby tím pastel rất nhã nhặn, giá 600.000đ ạ", time: "11:22" },
      { id: "m3", sender: "customer", text: "Làm chị bó đó nha. Giao về 12 Pasteur, P.6, Quận 3 chiều nay lúc 16:30. Sđt chị 0918765432", time: "11:25" },
      { id: "m4", sender: "customer", text: "Ghi thiệp: Kính chúc Mẹ yêu sinh nhật an lành và luôn tươi trẻ", time: "11:26" },
      { id: "m5", sender: "customer", text: "Chị đã bank cọc 200k rồi nhé shop", time: "11:30" },
    ],
  },
  {
    id: "CONV-TT-04",
    channel: "tiktok",
    customerName: "Trần Minh Quang",
    customerHandle: "@quang_florist_fan",
    lastMessage: "Em muốn đặt bó hoa hướng dương tốt nghiệp bạn",
    updatedAt: "2 giờ trước",
    unreadCount: 0,
    orderStatus: "NONE",
    messages: [
      { id: "m1", sender: "customer", text: "Shop ơi thấy trên clip TikTok bó hoa hướng dương phối baby xinh quá, giá bao nhiêu vậy ạ?", time: "10:10" },
      { id: "m2", sender: "shop", text: "Dạ bó Hướng Dương Rực Rỡ tốt nghiệp tiệm bán 350.000đ tặng kèm gấu bông cử nhân mini và thiệp ạ 🌻", time: "10:12" },
      { id: "m3", sender: "customer", text: "Ôi thích quá, chốt cho em 1 bó nhé. Mai em ghé tiệm lấy lúc 11:00 trưa nha", time: "10:15" },
    ],
  },
];

export function getConversations(): Conversation[] {
  if (typeof window === "undefined") return INITIAL_CONVERSATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CONVERSATIONS));
      return INITIAL_CONVERSATIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_CONVERSATIONS;
  }
}

export function saveConversations(convs: Conversation[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
}
