import type { Conversation, ChatMessage, SocialChannel } from "./chatStore";

export interface SocialConfig {
  facebook: {
    enabled: boolean;
    pageAccessToken: string;
    pageId: string;
    pageName?: string;
  };
  instagram: {
    enabled: boolean;
    pageAccessToken: string; // Dùng chung Meta Page Token liên kết với Instagram Account
    instagramId: string;
  };
  zalo: {
    enabled: boolean;
    oaAccessToken: string;
    oaId: string;
    oaName?: string;
  };
  tiktok: {
    enabled: boolean;
    accessToken: string;
    shopId: string;
  };
}

const CONFIG_KEY = "tiemhoa_social_config";

export const DEFAULT_SOCIAL_CONFIG: SocialConfig = {
  facebook: { enabled: false, pageAccessToken: "", pageId: "" },
  instagram: { enabled: false, pageAccessToken: "", instagramId: "" },
  zalo: { enabled: false, oaAccessToken: "", oaId: "" },
  tiktok: { enabled: false, accessToken: "", shopId: "" },
};

export function getSocialConfig(): SocialConfig {
  if (typeof window === "undefined") return DEFAULT_SOCIAL_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_SOCIAL_CONFIG;
    return { ...DEFAULT_SOCIAL_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SOCIAL_CONFIG;
  }
}

export function saveSocialConfig(cfg: SocialConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

// ─── 1. FACEBOOK & INSTAGRAM GRAPH API ─────────────────────────────────────────

export async function verifyFacebookToken(token: string): Promise<{ success: boolean; name?: string; id?: string; error?: string }> {
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${encodeURIComponent(token.trim())}`);
    const data = await res.json();
    if (data.error) {
      return { success: false, error: data.error.message };
    }
    return { success: true, name: data.name, id: data.id };
  } catch (err: any) {
    return { success: false, error: err?.message || "Không thể kết nối đến máy chủ Facebook." };
  }
}

export async function fetchFacebookConversations(token: string): Promise<Conversation[]> {
  try {
    // Kéo danh sách hội thoại từ Meta Graph API
    const url = `https://graph.facebook.com/v19.0/me/conversations?fields=id,updated_time,participants,unread_count,messages.limit(20){id,message,from,created_time}&limit=20&access_token=${encodeURIComponent(token.trim())}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error || !Array.isArray(data.data)) {
      console.warn("Meta Graph API fetch warning:", data.error);
      return [];
    }

    const conversations: Conversation[] = data.data.map((c: any) => {
      // Tìm người tham gia (khách hàng)
      const participants = c.participants?.data || [];
      const customer = participants[0] || { name: "Khách hàng Facebook", id: c.id };

      // Chuyển đổi messages
      const rawMessages = c.messages?.data || [];
      const messages: ChatMessage[] = rawMessages.reverse().map((m: any) => {
        const createdDate = new Date(m.created_time);
        const timeStr = `${String(createdDate.getHours()).padStart(2, "0")}:${String(createdDate.getMinutes()).padStart(2, "0")}`;
        const isCustomer = m.from?.id === customer.id;

        return {
          id: m.id,
          sender: isCustomer ? "customer" : "shop",
          text: m.message || "",
          time: timeStr,
        };
      });

      const lastMsg = messages[messages.length - 1]?.text || "Không có tin nhắn";
      const updatedDate = new Date(c.updated_time);
      const updatedStr = `${updatedDate.toLocaleDateString("vi-VN")} ${String(updatedDate.getHours()).padStart(2, "0")}:${String(updatedDate.getMinutes()).padStart(2, "0")}`;

      return {
        id: `FB-${c.id}`,
        channel: "facebook" as SocialChannel,
        customerName: customer.name || "Khách hàng Facebook",
        customerHandle: `PSID: ${customer.id}`,
        lastMessage: lastMsg,
        updatedAt: updatedStr,
        unreadCount: c.unread_count || 0,
        orderStatus: "NONE",
        messages,
      };
    });

    return conversations;
  } catch (err) {
    console.error("fetchFacebookConversations error:", err);
    return [];
  }
}

export async function sendFacebookMessage(token: string, recipientId: string, text: string): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(token.trim())}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId.replace("PSID: ", "").trim() },
        message: { text },
        messaging_type: "RESPONSE",
      }),
    });
    const data = await res.json();
    if (data.error) {
      return { success: false, error: data.error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi khi gửi tin nhắn" };
  }
}

// ─── 2. ZALO OFFICIAL ACCOUNT API ─────────────────────────────────────────────

export async function verifyZaloToken(token: string): Promise<{ success: boolean; name?: string; id?: string; error?: string }> {
  try {
    const res = await fetch("https://openapi.zalo.me/v2.0/oa/getoa", {
      headers: { access_token: token.trim() },
    });
    const data = await res.json();
    if (data.error !== 0) {
      return { success: false, error: data.message || `Lỗi mã ${data.error}` };
    }
    return { success: true, name: data.data?.name, id: data.data?.oa_id };
  } catch (err: any) {
    return { success: false, error: err?.message || "Không thể kết nối đến máy chủ Zalo." };
  }
}

export async function fetchZaloConversations(token: string): Promise<Conversation[]> {
  try {
    const res = await fetch("https://openapi.zalo.me/v2.0/oa/conversation?offset=0&count=20", {
      headers: { access_token: token.trim() },
    });
    const data = await res.json();

    if (data.error !== 0 || !Array.isArray(data.data)) {
      console.warn("Zalo OA API warning:", data.message);
      return [];
    }

    const conversations: Conversation[] = data.data.map((c: any) => {
      return {
        id: `ZL-${c.user_id}`,
        channel: "zalo" as SocialChannel,
        customerName: c.src === 1 ? (c.display_name || "Khách hàng Zalo") : "Khách Zalo",
        customerHandle: `Zalo ID: ${c.user_id}`,
        lastMessage: c.message || "",
        updatedAt: "Gần đây",
        unreadCount: c.unread_count || 0,
        orderStatus: "NONE",
        messages: [
          {
            id: `zm_${Date.now()}`,
            sender: "customer",
            text: c.message || "",
            time: "Mới nhận",
          },
        ],
      };
    });

    return conversations;
  } catch (err) {
    console.error("fetchZaloConversations error:", err);
    return [];
  }
}

export async function sendZaloMessage(token: string, userId: string, text: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("https://openapi.zalo.me/v2.0/oa/message/cs", {
      method: "POST",
      headers: {
        access_token: token.trim(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { user_id: userId.replace("Zalo ID: ", "").trim() },
        message: { text },
      }),
    });
    const data = await res.json();
    if (data.error !== 0) {
      return { success: false, error: data.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi khi gửi tin nhắn Zalo" };
  }
}
