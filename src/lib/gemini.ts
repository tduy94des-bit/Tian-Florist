import type { Order, OrderItem, PaymentMethod, PaymentStatus } from "./store";

export interface ExtractedOrderData {
  customerName: string;
  customerPhone: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  deliveryTime: string; // YYYY-MM-DDTHH:mm
  cardMessage: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  discount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes?: string;
}

// ─── 1. Fallback Rule-based Intelligent Heuristic Parser ─────────────────────
// Được dùng khi chưa có API Key hoặc khi mạng offline để đảm bảo hệ thống không bao giờ bị gián đoạn.
export function parseChatWithHeuristics(
  chatHistory: Array<{ sender: "customer" | "shop"; text: string }>,
  knownInventory: Array<{ id: string; name: string; sellingPrice: number }> = []
): ExtractedOrderData {
  const fullText = chatHistory.map((m) => m.text).join("\n");
  const customerMessages = chatHistory.filter((m) => m.sender === "customer").map((m) => m.text);

  // 1. Trích xuất số điện thoại (đầu 03, 05, 07, 08, 09 kèm 8 số)
  const phoneRegex = /(?:0|\+84)(?:3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}\b/g;
  const phones = fullText.match(phoneRegex) || [];
  const customerPhone = phones[0] || "";
  const recipientPhone = phones[1] || customerPhone;

  // 2. Trích xuất tên khách
  let customerName = "";
  let recipientName = "";
  const nameRegex = /(?:tên|mình là|anh|chị|em|tôi là)\s+([A-ZÀ-Ỹa-zà-ỹ\s]{2,25})/i;
  for (const msg of customerMessages) {
    const match = msg.match(nameRegex);
    if (match && match[1]) {
      customerName = match[1].trim();
      break;
    }
  }
  if (!customerName) customerName = "Khách Hàng Social";
  recipientName = customerName;

  // 3. Trích xuất địa chỉ giao hàng
  let deliveryAddress = "";
  const addressRegex = /(?:giao\s+(?:tới|đến|qua)|địa\s+chỉ(?:\s+là)?|ship\s+(?:tới|đến)|nhận\s+ở)\s*:?\s*([^,.\n]+(?:,[^,.\n]+)*)/i;
  for (const msg of customerMessages) {
    const match = msg.match(addressRegex);
    if (match && match[1]) {
      deliveryAddress = match[1].trim();
      break;
    }
  }
  if (!deliveryAddress) {
    // Tìm các dòng chứa số nhà hoặc tên đường
    const streetMatch = fullText.match(/(?:\d+[\/\d]*\s+[A-ZÀ-Ỹa-zà-ỹ0-9\s,]+(?:quận|huyện|phường|tp|thành phố|q\.|h\.|p\.)[^\n,.]*)/i);
    if (streetMatch) deliveryAddress = streetMatch[0].trim();
  }

  // 4. Trích xuất nội dung thiệp / lời chúc
  let cardMessage = "";
  const cardRegex = /(?:thiệp|ghi thiệp|lời chúc|nội dung thiệp|ghi giúp|ghi là)\s*[:"']?\s*([^\n"']+)/i;
  for (const msg of customerMessages) {
    const match = msg.match(cardRegex);
    if (match && match[1]) {
      cardMessage = match[1].trim().replace(/^["']|["']$/g, "");
      break;
    }
  }

  // 5. Trích xuất sản phẩm / hoa
  const items: Array<{ name: string; quantity: number; price: number }> = [];
  // So khớp với kho hàng trước
  for (const inv of knownInventory) {
    if (new RegExp(inv.name, "i").test(fullText)) {
      items.push({
        name: inv.name,
        quantity: 1,
        price: inv.sellingPrice || 350000,
      });
      break;
    }
  }
  if (items.length === 0) {
    // Bắt các từ khóa hoa phổ biến
    const flowerMatch = fullText.match(/(?:bó hoa|lẵng hoa|giỏ hoa|kệ hoa|chậu hoa|hoa hồng|hoa tulip|hoa hướng dương|baby pastel|lan hồ điệp)[^,\n.]*/i);
    if (flowerMatch) {
      items.push({
        name: flowerMatch[0].trim(),
        quantity: 1,
        price: 450000,
      });
    } else {
      items.push({
        name: "Bó Hoa Theo Yêu Cầu",
        quantity: 1,
        price: 400000,
      });
    }
  }

  // 6. Thời gian giao hàng (mặc định chiều nay hoặc 10:00 sáng mai)
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86400000);
  const timeRegex = /(\d{1,2})[h:](\d{2})?/i;
  const timeMatch = fullText.match(timeRegex);
  const hour = timeMatch ? String(timeMatch[1]).padStart(2, "0") : "14";
  const minute = timeMatch && timeMatch[2] ? String(timeMatch[2]).padStart(2, "0") : "00";

  let deliveryTime = `${today.toISOString().slice(0, 10)}T${hour}:${minute}`;
  if (/mai|ngày mai|hôm sau/i.test(fullText)) {
    deliveryTime = `${tomorrow.toISOString().slice(0, 10)}T${hour}:${minute}`;
  }

  // 7. Phương thức thanh toán
  let paymentMethod: PaymentMethod = "BANK";
  let paymentStatus: PaymentStatus = "UNPAID";
  if (/tiền mặt|nhận hàng trả|cod/i.test(fullText)) {
    paymentMethod = "CASH";
  } else if (/momo|vnpay|zalopay|ví/i.test(fullText)) {
    paymentMethod = "EWALLET";
  }

  if (/đã bank|đã chuyển|đã ck|ck rồi|chuyển khoản rồi|bank đủ/i.test(fullText)) {
    paymentStatus = "PAID";
  } else if (/đã cọc|cọc|đặt cọc/i.test(fullText)) {
    paymentStatus = "DEPOSIT";
  }

  return {
    customerName,
    customerPhone,
    recipientName,
    recipientPhone,
    deliveryAddress: deliveryAddress || "Chưa có địa chỉ",
    deliveryTime,
    cardMessage,
    items,
    discount: 0,
    paymentMethod,
    paymentStatus,
  };
}

// ─── 2. Gemini AI Order Extraction ──────────────────────────────────────────
export async function extractOrderWithGemini(
  chatHistory: Array<{ sender: "customer" | "shop"; text: string }>,
  apiKey?: string,
  knownInventory: Array<{ id: string; name: string; sellingPrice: number }> = []
): Promise<ExtractedOrderData> {
  const effectiveKey =
    apiKey ||
    (typeof window !== "undefined" ? localStorage.getItem("tiemhoa_gemini_api_key") : "") ||
    (typeof process !== "undefined" ? process.env?.VITE_GEMINI_API_KEY : "") ||
    (typeof import.meta !== "undefined" ? import.meta.env?.VITE_GEMINI_API_KEY : "");

  // Nếu không có API Key, sử dụng bộ heuristic parser thông minh
  if (!effectiveKey) {
    console.info("Gemini API key not found. Using built-in intelligent heuristic parser.");
    return parseChatWithHeuristics(chatHistory, knownInventory);
  }

  const inventorySummary = knownInventory
    .slice(0, 30)
    .map((i) => `- ${i.name}: ${i.sellingPrice.toLocaleString("vi-VN")} đ`)
    .join("\n");

  const conversationText = chatHistory
    .map((m) => `${m.sender === "customer" ? "Khách hàng" : "Tiệm hoa"}: ${m.text}`)
    .join("\n");

  const todayStr = new Date().toISOString().slice(0, 10);

  const prompt = `Bạn là trợ lý AI chuyên nghiệp của tiệm hoa "Tian Florist".
Nhiệm vụ của bạn là đọc toàn bộ lịch sử đoạn chat giữa Khách hàng và Tiệm hoa dưới đây, sau đó trích xuất thông tin để tạo đơn hàng.

Hôm nay là ngày: ${todayStr}

Danh mục hoa/mặt hàng sẵn có trong tiệm:
${inventorySummary || "- Bó hoa tươi, lẵng hoa tươi theo yêu cầu"}

Lịch sử trò chuyện:
\"\"\"
${conversationText}
\"\"\"

Hãy trích xuất và trả về ĐÚNG ĐỊNH DẠNG JSON duy nhất (không bọc trong markdown code block thừa, chỉ raw JSON object):
{
  "customerName": "Tên người đặt hoa (nếu không có, để Khách Hàng)",
  "customerPhone": "Số điện thoại người đặt (chỉ lấy số 10 chữ số)",
  "recipientName": "Tên người nhận hoa (nếu khách gửi cho người khác, hoặc để giống customerName)",
  "recipientPhone": "Số điện thoại người nhận hoa",
  "deliveryAddress": "Địa chỉ giao hoa chi tiết",
  "deliveryTime": "Thời gian giao hoa dạng YYYY-MM-DDTHH:mm (ví dụ 2026-10-30T10:00). Nếu chỉ nói 'chiều mai lúc 3h' thì tính đúng ngày mai lúc 15:00",
  "cardMessage": "Nội dung lời chúc ghi trên thiệp/banner (nếu có, không có để trống)",
  "items": [
    {
      "name": "Tên sản phẩm hoa",
      "quantity": 1,
      "price": 450000
    }
  ],
  "discount": 0,
  "paymentMethod": "BANK hoặc CASH hoặc EWALLET",
  "paymentStatus": "PAID nếu khách đã chuyển khoản/bank đủ, DEPOSIT nếu đã cọc, UNPAID nếu chưa trả",
  "notes": "Ghi chú thêm về tone màu, sở thích hoặc lưu ý ship"
}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${effectiveKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) {
      console.warn("Gemini API error status:", res.status, await res.text());
      return parseChatWithHeuristics(chatHistory, knownInventory);
    }

    const json = await res.json();
    const rawContent = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent) {
      return parseChatWithHeuristics(chatHistory, knownInventory);
    }

    // Parse JSON
    const parsed = JSON.parse(rawContent.trim());
    return {
      customerName: parsed.customerName || "Khách Hàng Social",
      customerPhone: parsed.customerPhone || "",
      recipientName: parsed.recipientName || parsed.customerName || "Người Nhận",
      recipientPhone: parsed.recipientPhone || parsed.customerPhone || "",
      deliveryAddress: parsed.deliveryAddress || "Chưa có địa chỉ",
      deliveryTime: parsed.deliveryTime || `${todayStr}T14:00`,
      cardMessage: parsed.cardMessage || "",
      items: Array.isArray(parsed.items) && parsed.items.length > 0
        ? parsed.items.map((it: any) => ({
            name: it.name || "Bó hoa tươi",
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 350000,
          }))
        : [{ name: "Bó Hoa Theo Yêu Cầu", quantity: 1, price: 400000 }],
      discount: Number(parsed.discount) || 0,
      paymentMethod: ["CASH", "BANK", "EWALLET"].includes(parsed.paymentMethod) ? parsed.paymentMethod : "BANK",
      paymentStatus: ["UNPAID", "DEPOSIT", "PAID"].includes(parsed.paymentStatus) ? parsed.paymentStatus : "UNPAID",
      notes: parsed.notes || "",
    };
  } catch (err) {
    console.error("Gemini parse failed, falling back to heuristic parser:", err);
    return parseChatWithHeuristics(chatHistory, knownInventory);
  }
}
