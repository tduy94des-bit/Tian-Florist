import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  User,
  ShoppingBag,
  CreditCard,
  MessageSquare,
  Search,
  Plus,
  RefreshCw,
  ExternalLink,
  Bot,
  AlertCircle,
  FileText,
} from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { PageTitle, Modal } from "@/components/AppShell";
import { useStore, uid, todayStr, type Order, type PaymentMethod, type PaymentStatus } from "@/lib/store";
import {
  getConversations,
  saveConversations,
  CHANNEL_META,
  type Conversation,
  type SocialChannel,
  type ChatMessage,
} from "@/lib/chatStore";
import { extractOrderWithGemini, type ExtractedOrderData } from "@/lib/gemini";
import { toast } from "sonner";

export const Route = createFileRoute("/tin-nhan")({
  head: () => ({
    meta: [
      { title: "Hộp thư Social & Lên đơn AI | Quản Lý Tiệm Hoa" },
      { name: "description", content: "Chat đa kênh Facebook, Instagram, Zalo, TikTok và tự động lên đơn bằng AI." },
    ],
  }),
  component: () => (
    <AuthGuard>
      <SocialChatPage />
    </AuthGuard>
  ),
});

function SocialChatPage() {
  const { inventory, saveOrder } = useStore();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>(() => getConversations());
  const [selectedId, setSelectedId] = useState<string>(() => conversations[0]?.id || "");
  const [filterChannel, setFilterChannel] = useState<SocialChannel | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");

  // AI Extraction State
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedOrderData | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  // New Chat Form
  const [newChatChannel, setNewChatChannel] = useState<SocialChannel>("facebook");
  const [newChatName, setNewChatName] = useState("");
  const [newChatInitialMsg, setNewChatInitialMsg] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConv = conversations.find((c) => c.id === selectedId) || conversations[0];

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConv?.messages]);

  const filteredConversations = conversations.filter((c) => {
    if (filterChannel !== "ALL" && c.channel !== filterChannel) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.customerName.toLowerCase().includes(q) ||
        c.customerHandle.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Gửi tin nhắn mới
  const handleSendMessage = () => {
    if (!inputText.trim() || !selectedConv) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const newMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      sender: "shop",
      text: inputText.trim(),
      time: timeStr,
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === selectedConv.id) {
          return {
            ...c,
            lastMessage: `Bạn: ${inputText.trim()}`,
            updatedAt: "Vừa xong",
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );
    setInputText("");
  };

  // Kích hoạt AI Bóc tách đơn hàng
  const handleAIExtract = async () => {
    if (!selectedConv || selectedConv.messages.length === 0) {
      toast.error("Cuộc hội thoại chưa có tin nhắn nào để bóc tách.");
      return;
    }

    setIsExtracting(true);
    toast.info("Trợ lý AI đang đọc hiểu hội thoại và phân tích đơn hàng...");

    try {
      const knownItems = inventory.map((i) => ({
        id: i.id,
        name: i.name,
        sellingPrice: i.sellingPrice,
      }));

      const result = await extractOrderWithGemini(
        selectedConv.messages.map((m) => ({ sender: m.sender, text: m.text })),
        undefined,
        knownItems
      );

      setExtractedData(result);
      setIsOrderModalOpen(true);
      toast.success("AI đã bóc tách thông tin thành công! Vui lòng xác nhận đơn hàng.");
    } catch (err: any) {
      toast.error("Không thể phân tích: " + (err?.message || "Lỗi không xác định"));
    } finally {
      setIsExtracting(false);
    }
  };

  // Xác nhận tạo đơn vào hệ thống Tian Florist
  const handleConfirmCreateOrder = async () => {
    if (!extractedData || !selectedConv) return;

    const orderId = uid("ORD");
    const orderItems = extractedData.items.map((it) => {
      // Thử tìm itemId khớp trong kho
      const matchInv = inventory.find((inv) => inv.name.toLowerCase() === it.name.toLowerCase());
      return {
        itemId: matchInv ? matchInv.id : uid("INV-CUST"),
        name: it.name,
        quantity: it.quantity,
        price: it.price,
      };
    });

    const newOrder: Order = {
      id: orderId,
      customerName: extractedData.customerName || selectedConv.customerName,
      customerPhone: extractedData.customerPhone,
      recipientName: extractedData.recipientName || extractedData.customerName,
      recipientPhone: extractedData.recipientPhone || extractedData.customerPhone,
      deliveryAddress: extractedData.deliveryAddress,
      deliveryTime: extractedData.deliveryTime,
      cardMessage: extractedData.cardMessage,
      items: orderItems,
      discount: extractedData.discount || 0,
      paymentStatus: extractedData.paymentStatus,
      paymentMethod: extractedData.paymentMethod,
      orderStatus: "PREPARING", // Bắt đầu cắm hoa sau khi chốt chat
      createdAt: todayStr(),
    };

    await saveOrder(newOrder);

    // Cập nhật trạng thái cuộc hội thoại
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === selectedConv.id) {
          return {
            ...c,
            orderStatus: "CREATED",
            createdOrderId: orderId,
          };
        }
        return c;
      })
    );

    setIsOrderModalOpen(false);
    toast.success(`Đã tự động tạo đơn ${orderId} vào hệ thống thành công! 🌸`, {
      action: {
        label: "Xem đơn hàng",
        onClick: () => navigate({ to: "/don-hang" }),
      },
    });
  };

  // Tạo cuộc hội thoại mới
  const handleCreateNewChat = () => {
    if (!newChatName.trim()) {
      toast.error("Vui lòng nhập tên khách hàng.");
      return;
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const newConv: Conversation = {
      id: `CONV-CUSTOM-${Date.now()}`,
      channel: newChatChannel,
      customerName: newChatName.trim(),
      customerHandle: `@${newChatName.toLowerCase().replace(/\s+/g, "_")}`,
      lastMessage: newChatInitialMsg.trim() || "Bắt đầu cuộc trò chuyện",
      updatedAt: "Vừa xong",
      unreadCount: 0,
      orderStatus: "NONE",
      messages: newChatInitialMsg.trim()
        ? [{ id: `m_${Date.now()}`, sender: "customer", text: newChatInitialMsg.trim(), time: timeStr }]
        : [],
    };

    setConversations([newConv, ...conversations]);
    setSelectedId(newConv.id);
    setIsNewChatModalOpen(false);
    setNewChatName("");
    setNewChatInitialMsg("");
    toast.success("Đã mở cuộc trò chuyện mới.");
  };

  return (
    <div className="space-y-4">
      {/* Page Title & Actions */}
      <PageTitle
        title="Hộp thư Social & Lên đơn AI"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsNewChatModalOpen(true)}
              className="btn btn-primary gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm hội thoại mới</span>
            </button>
          </div>
        }
      />

      {/* Main Grid: Channels List & Chat View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-210px)] min-h-[620px]">
        {/* Left Column: Conversation List (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-card rounded-3xl border border-border/80 flex flex-col overflow-hidden shadow-card">
          {/* Search & Channel Filter */}
          <div className="p-3.5 border-b border-border/70 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm khách hàng hoặc nội dung chat..."
                className="field pl-9 h-9 text-xs"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setFilterChannel("ALL")}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterChannel === "ALL"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted"
                }`}
              >
                Tất cả
              </button>
              {(["facebook", "instagram", "zalo", "tiktok"] as SocialChannel[]).map((ch) => {
                const meta = CHANNEL_META[ch];
                const active = filterChannel === ch;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setFilterChannel(ch)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors flex items-center gap-1.5 ${
                      active
                        ? "bg-foreground text-background border-foreground font-semibold"
                        : "bg-card text-muted-foreground border-border hover:bg-muted/50"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                    {meta.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/50">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                Không tìm thấy cuộc trò chuyện nào.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedConv?.id;
                const meta = CHANNEL_META[conv.channel];
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSelectedId(conv.id)}
                    className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 border-l-4 border-l-primary"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    {/* Avatar with Channel Badge */}
                    <div className="relative shrink-0">
                      <div className="h-11 w-11 rounded-2xl bg-muted/80 border border-border flex items-center justify-center font-bold text-foreground">
                        {conv.customerName.slice(0, 2).toUpperCase()}
                      </div>
                      <span
                        className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-card flex items-center justify-center text-[9px] font-bold text-white shadow-xs"
                        style={{ backgroundColor: meta.color }}
                        title={meta.name}
                      >
                        {meta.name.slice(0, 1)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="font-semibold text-xs text-foreground truncate">{conv.customerName}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">{conv.updatedAt}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground/80 truncate mb-1">{conv.customerHandle}</p>
                      <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>

                      {/* Status Tags */}
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {conv.orderStatus === "CREATED" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            Đã lên đơn {conv.createdOrderId}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
                            <Clock className="h-3 w-3" />
                            Đang tư vấn
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Box Details (8 cols) */}
        {selectedConv ? (
          <div className="lg:col-span-7 xl:col-span-8 bg-card rounded-3xl border border-border/80 flex flex-col overflow-hidden shadow-card">
            {/* Chat Header */}
            <div className="p-3.5 px-5 border-b border-border/70 flex flex-wrap items-center justify-between gap-3 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
                  {selectedConv.customerName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-sm text-foreground">{selectedConv.customerName}</h2>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase"
                      style={{ backgroundColor: CHANNEL_META[selectedConv.channel].color }}
                    >
                      {CHANNEL_META[selectedConv.channel].name}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedConv.customerHandle}</p>
                </div>
              </div>

              {/* ACTION: AI Bóc Tách & Lên Đơn */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAIExtract}
                  disabled={isExtracting}
                  className="btn bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs py-2 px-3.5 rounded-full shadow-md gap-1.5 transition-all cursor-pointer flex items-center"
                >
                  {isExtracting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>AI đang bóc tách...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-amber-200 animate-pulse" />
                      <span>✨ AI Bóc tách & Lên đơn</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-background/50">
              {selectedConv.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                  <MessageSquare className="h-10 w-10 mb-2 opacity-40" />
                  <p className="text-sm font-semibold">Chưa có tin nhắn trong cuộc trò chuyện này</p>
                  <p className="text-xs mt-1">Hãy nhập tin nhắn bên dưới hoặc dùng AI để lên đơn.</p>
                </div>
              ) : (
                selectedConv.messages.map((m) => {
                  const isCustomer = m.sender === "customer";
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isCustomer ? "items-start" : "items-end"}`}
                    >
                      <div className="flex items-end gap-1.5 max-w-[85%] sm:max-w-[70%]">
                        {isCustomer && (
                          <div className="h-6 w-6 rounded-full bg-muted border border-border text-[10px] font-bold flex items-center justify-center text-muted-foreground shrink-0 mb-1">
                            {selectedConv.customerName.slice(0, 1)}
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-2xs ${
                            isCustomer
                              ? "bg-card border border-border/80 text-foreground rounded-bl-xs"
                              : "bg-primary text-primary-foreground rounded-br-xs font-medium"
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground/70 px-2 mt-0.5">
                        {m.time}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions & Input Bar */}
            <div className="p-3 border-t border-border/70 bg-card space-y-2">
              {/* Quick Reply Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                <span className="text-[11px] font-semibold text-muted-foreground shrink-0 mr-1">Gợi ý nhanh:</span>
                {[
                  "Dạ tiệm có sẵn hoa tươi mới về sáng nay ạ 🌸",
                  "Anh/chị cho shop xin địa chỉ và sđt nhận hoa nha ạ!",
                  "Dạ shop hỗ trợ ghi thiệp hoặc banner miễn phí ạ ✨",
                  "Tiệm freeship trong bán kính 3km nha khách ơi!",
                ].map((txt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputText(txt)}
                    className="px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted text-[11px] text-muted-foreground whitespace-nowrap transition-colors"
                  >
                    {txt}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Nhắn tin với ${selectedConv.customerName}...`}
                  className="field flex-1 h-10 text-xs"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="btn btn-primary h-10 px-4 rounded-xl gap-1.5 shrink-0"
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Gửi</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 xl:col-span-8 bg-card rounded-3xl border border-border/80 flex items-center justify-center p-8 text-center text-muted-foreground">
            Chọn một cuộc hội thoại từ danh sách bên trái để bắt đầu chat và lên đơn.
          </div>
        )}
      </div>

      {/* ─── MODAL XÁC NHẬN ĐƠN HÀNG DO AI BÓC TÁCH ────────────────────────── */}
      {extractedData && (
        <Modal
          open={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          title="✨ AI Bóc Tách Đơn Hàng Tự Động"
        >
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200/90 p-3.5 text-xs text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200 flex items-start gap-2.5">
              <Bot className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-950 dark:text-emerald-100">
                  AI đã tự động trích xuất thông tin từ đoạn chat thành công!
                </p>
                <p className="mt-0.5 opacity-90">
                  Bạn có thể kiểm tra và tinh chỉnh lại các trường bên dưới trước khi bấm "Xác nhận tạo đơn".
                </p>
              </div>
            </div>

            {/* Grid 2 Columns Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Khách hàng đặt */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-primary" /> Tên người đặt
                </label>
                <input
                  type="text"
                  value={extractedData.customerName}
                  onChange={(e) => setExtractedData({ ...extractedData, customerName: e.target.value })}
                  className="field text-xs"
                />
              </div>

              {/* SĐT người đặt */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-primary" /> SĐT người đặt
                </label>
                <input
                  type="text"
                  value={extractedData.customerPhone}
                  onChange={(e) => setExtractedData({ ...extractedData, customerPhone: e.target.value })}
                  className="field text-xs"
                />
              </div>

              {/* Người nhận hoa */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-emerald-600" /> Tên người nhận
                </label>
                <input
                  type="text"
                  value={extractedData.recipientName}
                  onChange={(e) => setExtractedData({ ...extractedData, recipientName: e.target.value })}
                  className="field text-xs"
                />
              </div>

              {/* SĐT người nhận */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-emerald-600" /> SĐT người nhận
                </label>
                <input
                  type="text"
                  value={extractedData.recipientPhone}
                  onChange={(e) => setExtractedData({ ...extractedData, recipientPhone: e.target.value })}
                  className="field text-xs"
                />
              </div>

              {/* Địa chỉ giao */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-rose-500" /> Địa chỉ giao hoa
                </label>
                <input
                  type="text"
                  value={extractedData.deliveryAddress}
                  onChange={(e) => setExtractedData({ ...extractedData, deliveryAddress: e.target.value })}
                  className="field text-xs"
                />
              </div>

              {/* Thời gian giao */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-amber-500" /> Thời gian giao
                </label>
                <input
                  type="datetime-local"
                  value={extractedData.deliveryTime}
                  onChange={(e) => setExtractedData({ ...extractedData, deliveryTime: e.target.value })}
                  className="field text-xs"
                />
              </div>

              {/* Phương thức thanh toán */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5 text-indigo-500" /> Phương thức & Trạng thái
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={extractedData.paymentMethod}
                    onChange={(e) => setExtractedData({ ...extractedData, paymentMethod: e.target.value as PaymentMethod })}
                    className="field text-xs"
                  >
                    <option value="BANK">Chuyển khoản</option>
                    <option value="CASH">Tiền mặt</option>
                    <option value="EWALLET">Ví điện tử</option>
                  </select>
                  <select
                    value={extractedData.paymentStatus}
                    onChange={(e) => setExtractedData({ ...extractedData, paymentStatus: e.target.value as PaymentStatus })}
                    className="field text-xs"
                  >
                    <option value="PAID">Đã thanh toán</option>
                    <option value="DEPOSIT">Đã cọc</option>
                    <option value="UNPAID">Chưa thanh toán</option>
                  </select>
                </div>
              </div>

              {/* Lời chúc thiệp */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-primary" /> Lời chúc thiệp / Nội dung banner
                </label>
                <textarea
                  rows={2}
                  value={extractedData.cardMessage}
                  onChange={(e) => setExtractedData({ ...extractedData, cardMessage: e.target.value })}
                  className="field text-xs py-2"
                  placeholder="Nội dung lời chúc..."
                />
              </div>
            </div>

            {/* Danh sách sản phẩm hoa */}
            <div className="rounded-2xl border border-border/80 p-3 space-y-2 bg-muted/20">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <ShoppingBag className="h-3.5 w-3.5 text-primary" /> Sản phẩm hoa
              </label>
              {extractedData.items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={it.name}
                    onChange={(e) => {
                      const updated = [...extractedData.items];
                      updated[idx].name = e.target.value;
                      setExtractedData({ ...extractedData, items: updated });
                    }}
                    className="field flex-1 text-xs"
                    placeholder="Tên mẫu hoa..."
                  />
                  <input
                    type="number"
                    min={1}
                    value={it.quantity}
                    onChange={(e) => {
                      const updated = [...extractedData.items];
                      updated[idx].quantity = Number(e.target.value) || 1;
                      setExtractedData({ ...extractedData, items: updated });
                    }}
                    className="field w-16 text-xs text-center"
                    placeholder="SL"
                  />
                  <input
                    type="number"
                    step={10000}
                    value={it.price}
                    onChange={(e) => {
                      const updated = [...extractedData.items];
                      updated[idx].price = Number(e.target.value) || 0;
                      setExtractedData({ ...extractedData, items: updated });
                    }}
                    className="field w-28 text-xs text-right"
                    placeholder="Đơn giá"
                  />
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsOrderModalOpen(false)}
                className="btn btn-ghost text-xs"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateOrder}
                className="btn btn-primary text-xs px-5 shadow-md"
              >
                🌸 Xác nhận tạo đơn hàng ngay
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── MODAL TẠO CUỘC HỘI THOẠI MỚI ───────────────────────────────── */}
      <Modal
        open={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        title="Thêm cuộc hội thoại mạng xã hội"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Kênh Social</label>
            <div className="grid grid-cols-4 gap-2">
              {(["facebook", "instagram", "zalo", "tiktok"] as SocialChannel[]).map((ch) => {
                const meta = CHANNEL_META[ch];
                const active = newChatChannel === ch;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setNewChatChannel(ch)}
                    className={`py-2 px-3 rounded-2xl border text-xs font-semibold transition-all flex flex-col items-center gap-1 ${
                      active
                        ? "bg-foreground text-background border-foreground shadow-sm"
                        : "bg-card text-muted-foreground border-border hover:bg-muted/40"
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                    {meta.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Tên khách hàng</label>
            <input
              type="text"
              required
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              placeholder="VD: Anh Tuấn, Chị Mai Linh..."
              className="field text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Tin nhắn đầu tiên hoặc dán đoạn chat</label>
            <textarea
              rows={4}
              value={newChatInitialMsg}
              onChange={(e) => setNewChatInitialMsg(e.target.value)}
              placeholder="Dán toàn bộ nội dung khách chat vào đây để AI bóc tách lên đơn nhanh..."
              className="field text-xs py-2"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsNewChatModalOpen(false)}
              className="btn btn-ghost text-xs"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleCreateNewChat}
              className="btn btn-primary text-xs px-5"
            >
              Tạo hội thoại
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
