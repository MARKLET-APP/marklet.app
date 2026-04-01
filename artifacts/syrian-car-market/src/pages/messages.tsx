// UI_ID: CHAT_01
// NAME: المراسلة
import { useState, useEffect, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { useAuthStore } from "@/lib/auth";
import { Redirect, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Send, Loader2, MessageSquare, User, Car, Smile, Paperclip, X,
  Check, CheckCheck, Edit2, Trash2, Ban, ChevronRight, Mic, Square,
  Play, Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { API_BASE, SOCKET_URL, imgUrl } from "@/lib/runtimeConfig";

const API = `${API_BASE}/api`;

interface ConvItem {
  id: number; carId: number; carBrand: string; carModel: string; carYear: number;
  carImage: string | null; otherUserId: number; otherUserName: string;
  otherUserPhone: string | null; otherUserPhoto: string | null;
  lastMessage: string | null; lastMessageAt: string | null; unreadCount: number;
  createdAt: string;
}

interface AdminConvItem {
  id: number; carId: number; carBrand: string; carModel: string; carYear: number;
  buyerId: number; buyerName: string; buyerPhoto: string | null;
  sellerId: number; sellerName: string; sellerPhoto: string | null;
  lastMessage: string | null; lastMessageAt: string | null;
  createdAt: string; updatedAt: string;
}

interface MessageItem {
  id: number; conversationId: number; senderId: number; content: string;
  messageType: string; status: string; imageUrl: string | null;
  isRead: boolean; isDeleted: boolean;
  reactions: Record<string, number[]>;
  editedAt: string | null; createdAt: string; updatedAt: string;
  senderName: string; senderPhoto: string | null;
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

function StatusIcon({ status, isMine }: { status: string; isMine: boolean }) {
  if (!isMine) return null;
  if (status === "seen") return <CheckCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
  if (status === "delivered") return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
  return <Check className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
}

function formatTime(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ar });
  } catch { return ""; }
}

function fmtSecs(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export default function Messages() {
  const { user, isHydrated } = useAuthStore();
  const { toast } = useToast();
  const [location] = useLocation();

  const [conversations, setConversations] = useState<ConvItem[]>([]);
  const [adminConversations, setAdminConversations] = useState<AdminConvItem[]>([]);
  const [adminViewAll, setAdminViewAll] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [contextMenu, setContextMenu] = useState<{ msgId: number; x: number; y: number } | null>(null);
  const [blockDialog, setBlockDialog] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [blockedByOther, setBlockedByOther] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingInitialMsgRef = useRef<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("scm_token") : null;
  const isAdmin = user?.role === "admin";

  const activeConv = conversations.find((c) => c.id === activeChatId);
  const activeAdminConv = adminConversations.find((c) => c.id === activeChatId);

  // Handle ?userId=X — auto-start conversation with that user
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Direct conversationId link
    const convId = params.get("conversationId");
    if (convId) { setActiveChatId(Number(convId)); }

    // Pre-fill message + mark for auto-send
    const initial = params.get("initial");
    if (initial) {
      const decoded = decodeURIComponent(initial);
      setNewMessage(decoded);
      pendingInitialMsgRef.current = decoded;
    }

    // Start conversation with a specific user
    const targetUserId = params.get("userId");
    if (targetUserId && token) {
      fetch(`${API}/chats/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sellerId: Number(targetUserId) }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(conv => { if (conv?.id) setActiveChatId(conv.id); })
        .catch(() => {});
    }
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-send initial message once conversation is active (from ?initial= URL param)
  useEffect(() => {
    if (!activeChatId || !pendingInitialMsgRef.current || !token) return;
    const msg = pendingInitialMsgRef.current;
    pendingInitialMsgRef.current = null;
    setNewMessage("");
    if (chatInputRef.current) chatInputRef.current.value = "";
    const timer = setTimeout(async () => {
      try {
        await fetch(`${API}/chats/${activeChatId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ content: msg }),
        });
      } catch { /* ignore */ }
    }, 600);
    return () => clearTimeout(timer);
  }, [activeChatId, token]);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API}/chats`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setConversations(await r.json());
    } catch { /* ignore */ } finally { setLoadingConvs(false); }
  }, [token]);

  const fetchAdminConversations = useCallback(async () => {
    if (!token || !isAdmin) return;
    try {
      const r = await fetch(`${API}/admin/conversations`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setAdminConversations(await r.json());
    } catch { /* ignore */ }
  }, [token, isAdmin]);

  const fetchMessages = useCallback(async (convId: number) => {
    if (!token) return;
    setLoadingMsgs(true);
    try {
      const r = await fetch(`${API}/chats/${convId}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setMessages(await r.json());
    } catch { /* ignore */ } finally { setLoadingMsgs(false); }
  }, [token]);

  const fetchBlockStatus = useCallback(async (convId: number) => {
    if (!token || adminViewAll) return;
    try {
      const r = await fetch(`${API}/chats/${convId}/block-status`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const { blockedByMe: bm, blockedByOther: bo } = await r.json();
        setBlockedByMe(bm);
        setBlockedByOther(bo);
      }
    } catch { /* ignore */ }
  }, [token, adminViewAll]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    const interval = setInterval(fetchConversations, 15000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  useEffect(() => {
    if (adminViewAll) { fetchAdminConversations(); }
  }, [adminViewAll, fetchAdminConversations]);

  useEffect(() => {
    if (!activeChatId) return;
    fetchMessages(activeChatId);
    fetchBlockStatus(activeChatId);
  }, [activeChatId, fetchMessages, fetchBlockStatus]);

  useEffect(() => {
    if (!user || !token) return;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("new_message", ({ message }: { convId: number; message: MessageItem }) => {
      setMessages((prev) => {
        // Remove optimistic placeholder (negative id, same sender + content)
        const withoutTemp = prev.filter(
          (m) => !(m.id < 0 && m.senderId === message.senderId && m.content === message.content)
        );
        if (withoutTemp.find((m) => m.id === message.id)) return withoutTemp;
        return [...withoutTemp, { ...message, reactions: message.reactions ?? {} }];
      });
      setConversations((prev) => prev.map((c) =>
        c.id === message.conversationId
          ? { ...c, lastMessage: message.isDeleted ? "تم حذف الرسالة" : message.content, lastMessageAt: message.createdAt, unreadCount: c.id === activeChatId ? 0 : c.unreadCount + 1 }
          : c
      ));
    });

    socket.on("user_typing", ({ userName }: { convId: number; userId: number; userName: string }) => {
      setTypingUser(userName);
    });

    socket.on("user_stopped_typing", () => setTypingUser(null));

    socket.on("messages_seen", () => {
      setMessages((prev) => prev.map((m) => ({ ...m, status: "seen" })));
    });

    socket.on("message_updated", ({ message }: { convId: number; message: MessageItem }) => {
      setMessages((prev) => prev.map((m) => m.id === message.id ? { ...m, ...message, reactions: m.reactions } : m));
    });

    socket.on("message_deleted", ({ messageId }: { convId: number; messageId: number }) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, isDeleted: true, content: "تم حذف هذه الرسالة" } : m));
    });

    socket.on("reaction_updated", ({ messageId, reactions }: { convId: number; messageId: number; reactions: Record<string, number[]> }) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions } : m));
    });

    return () => { socket.disconnect(); };
  }, [user, token]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !activeChatId) return;
    socket.emit("join_conversation", activeChatId);
    return () => { socket.emit("leave_conversation", activeChatId); };
  }, [activeChatId]);

  const handleTyping = () => {
    if (!activeChatId || !activeConv) return;
    socketRef.current?.emit("typing_start", { convId: activeChatId, userName: user?.name ?? "شخص ما" });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("typing_stop", { convId: activeChatId });
    }, 2000);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    // Read from DOM ref first (Android IME fallback), then React state
    const domValue = chatInputRef.current?.value ?? "";
    const messageText = domValue.trim() || newMessage.trim();
    if ((!messageText && !imageFile) || !activeChatId || sending) return;
    setSending(true);
    setShowEmojiPicker(false);

    // Clear input immediately for snappy UX
    setNewMessage("");
    if (chatInputRef.current) chatInputRef.current.value = "";
    socketRef.current?.emit("typing_stop", { convId: activeChatId });

    // Optimistic message — appears instantly before server confirms
    const tempId = Date.now() * -1;
    if (messageText && user) {
      const optimistic: MessageItem = {
        id: tempId, conversationId: activeChatId, senderId: user.id,
        content: messageText, messageType: "text", status: "sent",
        imageUrl: null, isRead: false, isDeleted: false,
        reactions: {}, editedAt: null, createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        senderName: user.name ?? "", senderPhoto: user.photo ?? null,
      };
      setMessages((prev) => [...prev, optimistic]);
    }

    try {
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        const r = await fetch(`${API}/chats/${activeChatId}/messages/image`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!r.ok) throw new Error("فشل إرسال الصورة");
        setImageFile(null);
        setImagePreview(null);
      }

      if (messageText) {
        const r = await fetch(`${API}/chats/${activeChatId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ content: messageText }),
        });
        if (!r.ok) {
          const err = await r.json();
          // Remove optimistic message on failure
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          if (err.error === "Blocked") { toast({ title: "لا يمكن إرسال الرسالة", description: "أنت محظور من قبل هذا المستخدم أو قمت بحظره", variant: "destructive" }); return; }
          throw new Error("فشل الإرسال");
        }
        // Real message will arrive via socket and replace the optimistic one
      }
      await fetchConversations();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast({ title: "خطأ", description: String(err), variant: "destructive" });
    } finally { setSending(false); }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "الحجم كبير", description: "الحد الأقصى لحجم الصورة 5 ميجابايت", variant: "destructive" }); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleStartRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast({ title: "خطأ", description: "المتصفح لا يدعم التسجيل الصوتي", variant: "destructive" });
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Pick a supported MIME type — audio/webm works on desktop Chrome,
      // Android WebView prefers audio/mp4 or falls back to default
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || "audio/webm" });
        setAudioBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        setIsRecording(false);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      };
      mr.start(250); // collect data every 250ms
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch (err: any) {
      const denied = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";
      toast({
        title: "لا يمكن الوصول إلى الميكروفون",
        description: denied
          ? "يرجى السماح للتطبيق بالوصول إلى الميكروفون من إعدادات الهاتف"
          : "تأكد من أن الميكروفون متاح وجرب مجدداً",
        variant: "destructive",
      });
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const handleSendAudio = async () => {
    if (!audioBlob || !activeChatId) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "voice.webm");
      const r = await fetch(`${API}/chats/${activeChatId}/messages/audio`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!r.ok) throw new Error("فشل إرسال الرسالة الصوتية");
      setAudioBlob(null);
      setAudioPreviewUrl(null);
      setRecordingSeconds(0);
      await fetchConversations();
    } catch (err) {
      toast({ title: "خطأ", description: String(err), variant: "destructive" });
    } finally { setSending(false); }
  };

  const handleCancelAudio = () => {
    if (isRecording) handleStopRecording();
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setRecordingSeconds(0);
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const handleEdit = async (msgId: number) => {
    if (!editContent.trim()) return;
    try {
      const r = await fetch(`${API}/chats/${activeChatId}/messages/${msgId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (!r.ok) { const e = await r.json(); toast({ title: "خطأ", description: e.error, variant: "destructive" }); return; }
      setEditingId(null);
      setEditContent("");
    } catch { toast({ title: "خطأ", description: "فشل تعديل الرسالة", variant: "destructive" }); }
  };

  const handleDelete = async (msgId: number) => {
    try {
      await fetch(`${API}/chats/${activeChatId}/messages/${msgId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingDelete(null);
    } catch { toast({ title: "خطأ", description: "فشل حذف الرسالة", variant: "destructive" }); }
  };

  const handleReact = async (msgId: number, emoji: string) => {
    try {
      await fetch(`${API}/chats/${activeChatId}/messages/${msgId}/react`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
    } catch { /* ignore */ }
    setHoveredReaction(null);
  };

  const handleBlock = async () => {
    try {
      const r = await fetch(`${API}/chats/${activeChatId}/block`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const { blocked } = await r.json();
        setBlockedByMe(blocked);
        toast({ title: blocked ? "تم الحظر" : "تم رفع الحظر", description: blocked ? "لن يستطيع هذا المستخدم مراسلتك" : "يمكن للمستخدم الآن إرسال رسائل" });
      }
    } catch { /* ignore */ }
    setBlockDialog(false);
  };

  const openContextMenu = (e: React.MouseEvent, msgId: number) => {
    e.preventDefault();
    setContextMenu({ msgId, x: e.clientX, y: e.clientY });
  };

  const canEdit = (msg: MessageItem) => {
    if (msg.senderId !== user?.id) return false;
    return Date.now() - new Date(msg.createdAt).getTime() < 5 * 60 * 1000;
  };

  const isBlocked = blockedByMe || blockedByOther;

  if (!isHydrated) return <div className="flex h-[calc(100vh-80px)] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <Redirect to="/login" />;

  const displayedConvs = adminViewAll ? null : conversations;

  return (
    <div
      className="flex h-[calc(100dvh-64px)] sm:h-[calc(100dvh-80px)] w-full max-w-7xl mx-auto overflow-hidden bg-background"
      onClick={() => { setContextMenu(null); }}
    >
      {/* ── Conversation list ── */}
      <div className={cn("w-full sm:w-80 md:w-96 flex-shrink-0 border-l bg-card flex flex-col", activeChatId ? "hidden sm:flex" : "flex")}>
        <div className="px-4 py-3 border-b flex items-center justify-between gap-2 bg-primary/5">
          <div className="flex items-center gap-2 shrink-0">
            <h2 className="text-lg font-bold">
              {adminViewAll ? "كل المحادثات" : "الرسائل"}
            </h2>
            {!adminViewAll && conversations.reduce((s, c) => s + c.unreadCount, 0) > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5">
                {conversations.reduce((s, c) => s + c.unreadCount, 0)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant={adminViewAll ? "default" : "outline"}
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => { setAdminViewAll((v) => !v); setActiveChatId(null); }}
                title={adminViewAll ? "عرض محادثاتي فقط" : "عرض كل محادثات المشتركين"}
              >
                <Users className="w-3.5 h-3.5" />
                {adminViewAll ? "محادثاتي" : "الكل"}
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── Admin view all conversations ── */}
          {adminViewAll ? (
            adminConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-medium">لا توجد محادثات</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {adminConversations.map((conv) => {
                  const ts = conv.lastMessageAt ?? conv.createdAt;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setActiveChatId(conv.id)}
                      className={cn("w-full text-right p-3 flex gap-3 hover:bg-secondary/50 transition-colors items-start", conv.id === activeChatId && "bg-secondary")}
                    >
                      <div className="flex -space-x-2 rtl:space-x-reverse shrink-0 mt-0.5">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-card">
                          {conv.buyerPhoto ? <img src={conv.buyerPhoto} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-card">
                          {conv.sellerPhoto ? <img src={conv.sellerPhoto} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-bold text-foreground text-xs truncate">
                            {conv.buyerName} ← {conv.sellerName}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0 ms-1" dir="ltr">{formatTime(ts)}</span>
                        </div>
                        <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1 w-fit mb-0.5">
                          <Car className="w-2.5 h-2.5" /> {conv.carBrand} {conv.carModel} {conv.carYear}
                        </span>
                        {conv.lastMessage && (
                          <span className="text-xs truncate text-muted-foreground block">{conv.lastMessage}</span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            /* ── Normal user conversations ── */
            loadingConvs ? (
              <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-medium">لا توجد محادثات</p>
                <p className="text-sm mt-1">ابدأ محادثة من صفحة أي سيارة</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {conversations.map((conv) => {
                  const hasUnread = conv.unreadCount > 0;
                  const ts = conv.lastMessageAt ?? conv.createdAt;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setActiveChatId(conv.id)}
                      className={cn(
                        "w-full text-right px-4 py-3.5 flex gap-3 transition-colors items-center",
                        conv.id === activeChatId
                          ? "bg-primary/8 border-r-4 border-r-primary"
                          : "hover:bg-secondary/40 border-r-4 border-r-transparent",
                        hasUnread && conv.id !== activeChatId && "bg-primary/4"
                      )}
                    >
                      <div className="relative shrink-0">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center overflow-hidden",
                          hasUnread ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : "border-2 border-border"
                        )}>
                          {conv.otherUserPhoto
                            ? <img src={conv.otherUserPhoto} alt={conv.otherUserName} className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-primary/10 flex items-center justify-center"><User className="w-6 h-6 text-primary/60" /></div>
                          }
                        </div>
                        {hasUnread && (
                          <span className="absolute -bottom-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className={cn("font-bold text-sm truncate", hasUnread ? "text-primary" : "text-foreground")}>
                            {conv.otherUserName}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0 ms-2" dir="ltr">{formatTime(ts)}</span>
                        </div>
                        <p className={cn(
                          "text-xs truncate leading-relaxed",
                          hasUnread ? "font-semibold text-foreground" : "text-muted-foreground font-normal"
                        )}>
                          {conv.lastMessage || `${conv.carBrand} ${conv.carModel}`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Chat panel ── */}
      <div className={cn("flex-1 flex flex-col min-w-0", !activeChatId ? "hidden sm:flex" : "flex")}>
        {!activeChatId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-10 h-10 text-primary/40" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground/70">اختر محادثة للبدء</p>
              <p className="text-sm text-muted-foreground mt-1">رسائلك الخاصة آمنة ومشفرة</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="border-b bg-card px-4 py-2.5 flex items-center gap-3 shadow-sm z-10">
              <Button variant="ghost" size="icon" className="sm:hidden shrink-0 -mr-1" onClick={() => setActiveChatId(null)}>
                <ChevronRight className="w-5 h-5" />
              </Button>

              {adminViewAll && activeAdminConv ? (
                <>
                  <div className="flex -space-x-2 rtl:space-x-reverse shrink-0">
                    <div className="w-9 h-9 rounded-full bg-muted border-2 border-card flex items-center justify-center overflow-hidden">
                      {activeAdminConv.buyerPhoto ? <img src={activeAdminConv.buyerPhoto} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="w-9 h-9 rounded-full bg-muted border-2 border-card flex items-center justify-center overflow-hidden">
                      {activeAdminConv.sellerPhoto ? <img src={activeAdminConv.sellerPhoto} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{activeAdminConv.buyerName} ↔ {activeAdminConv.sellerName}</p>
                    <p className="text-xs text-muted-foreground truncate">{activeAdminConv.carBrand} {activeAdminConv.carModel} {activeAdminConv.carYear}</p>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <Users className="w-3 h-3" /> وضع المراقبة
                  </span>
                </>
              ) : (
                <>
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20">
                      {activeConv?.otherUserPhoto
                        ? <img src={activeConv.otherUserPhoto} alt={activeConv.otherUserName} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-primary/10 flex items-center justify-center"><User className="w-5 h-5 text-primary/60" /></div>
                      }
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" title="متصل" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm leading-tight truncate">{activeConv?.otherUserName}</p>
                    <p className="text-xs text-primary truncate flex items-center gap-1 mt-0.5">
                      <Car className="w-3 h-3 shrink-0" />
                      {activeConv?.carBrand} {activeConv?.carModel} {activeConv?.carYear}
                    </p>
                  </div>
                  {isBlocked && (
                    <span className="text-xs text-red-500 font-medium flex items-center gap-1 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded-full">
                      <Ban className="w-3.5 h-3.5" /> محظور
                    </span>
                  )}
                  <Button
                    variant="ghost" size="icon"
                    className="text-muted-foreground hover:text-red-500 hover:bg-red-50"
                    onClick={() => setBlockDialog(true)}
                    title={blockedByMe ? "رفع الحظر" : "حظر المستخدم"}
                  >
                    <Ban className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>

            {/* Messages area */}
            <div
              className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2316a34a' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundColor: 'hsl(var(--muted) / 0.2)',
              }}
            >
              {loadingMsgs ? (
                <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3 py-16">
                  <div className="w-16 h-16 rounded-full bg-muted/80 flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 opacity-30" />
                  </div>
                  <div>
                    <p className="font-medium">لا توجد رسائل بعد</p>
                    <p className="text-sm mt-0.5 opacity-70">ابدأ المحادثة الآن 👋</p>
                  </div>
                </div>
              ) : (
                (() => {
                  let firstUnreadIdx = -1;
                  const totalUnread = activeConv?.unreadCount ?? 0;
                  if (totalUnread > 0) {
                    firstUnreadIdx = messages.length - totalUnread;
                  }
                  return messages.map((msg, idx) => {
                    const isMine = msg.senderId === user.id;
                    const isSystem = msg.messageType === "system" || msg.senderId === 0;
                    const reactions = msg.reactions ?? {};
                    const reactionKeys = Object.keys(reactions).filter((k) => reactions[k].length > 0);

                    const prevMsg = messages[idx - 1];
                    const showDateSep = idx === 0 || (
                      prevMsg && new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString()
                    );
                    const showUnreadSep = idx === firstUnreadIdx && !isMine;

                    return (
                      <div key={msg.id}>
                        {showDateSep && (
                          <div className="flex items-center justify-center my-4">
                            <span className="bg-background/80 backdrop-blur-sm border border-border text-muted-foreground text-xs px-3 py-1 rounded-full shadow-sm">
                              {new Date(msg.createdAt).toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })}
                            </span>
                          </div>
                        )}
                        {showUnreadSep && (
                          <div className="flex items-center gap-2 my-3">
                            <div className="flex-1 h-px bg-primary/30" />
                            <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                              {totalUnread} رسالة غير مقروءة
                            </span>
                            <div className="flex-1 h-px bg-primary/30" />
                          </div>
                        )}

                        {isSystem ? (
                          <div className="flex justify-center my-2">
                            <span className="bg-background/80 text-muted-foreground text-xs px-3 py-1.5 rounded-full max-w-xs text-center shadow-sm">
                              {msg.content}
                            </span>
                          </div>
                        ) : (
                          <div
                            className={cn("flex gap-2 group mb-0.5", isMine ? "flex-row-reverse" : "flex-row")}
                            style={{ alignItems: "flex-end" }}
                          >
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 mb-1 shadow-sm">
                              {msg.senderPhoto
                                ? <img src={msg.senderPhoto} alt={msg.senderName} className="w-full h-full object-cover" />
                                : <User className="w-3.5 h-3.5 text-muted-foreground" />
                              }
                            </div>

                            <div className={cn("flex flex-col max-w-[75%] sm:max-w-[65%]", isMine ? "items-end" : "items-start")}>
                              <div className="relative">
                                {/* Reaction bar (hover) */}
                                {!msg.isDeleted && hoveredReaction === msg.id && (
                                  <div
                                    className={cn(
                                      "absolute -top-10 flex gap-1 bg-card border border-border rounded-full px-2 py-1.5 shadow-xl z-20",
                                      isMine ? "right-0" : "left-0"
                                    )}
                                    onMouseLeave={() => setHoveredReaction(null)}
                                  >
                                    {REACTION_EMOJIS.map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() => handleReact(msg.id, emoji)}
                                        className="text-lg hover:scale-125 transition-transform"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {editingId === msg.id ? (
                                  <div className="flex gap-2 min-w-[200px]">
                                    <Input
                                      value={editContent}
                                      onChange={(e) => setEditContent(e.target.value)}
                                      onKeyDown={(e) => { if (e.key === "Enter") handleEdit(msg.id); if (e.key === "Escape") setEditingId(null); }}
                                      className="text-sm h-9 flex-1"
                                      autoFocus
                                    />
                                    <Button size="sm" onClick={() => handleEdit(msg.id)} className="h-9 px-2.5">
                                      <Check className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-9 px-2">
                                      <X className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div
                                    onMouseEnter={() => setHoveredReaction(msg.id)}
                                    onMouseLeave={() => setHoveredReaction(null)}
                                    onContextMenu={(e) => { if (isMine && !msg.isDeleted && !adminViewAll) openContextMenu(e, msg.id); }}
                                    className={cn(
                                      "px-3.5 py-2.5 rounded-2xl text-sm shadow-md cursor-default select-text break-words transition-opacity",
                                      "animate-in fade-in-0 slide-in-from-bottom-1",
                                      isMine
                                        ? msg.isDeleted
                                          ? "bg-muted text-muted-foreground italic rounded-bl-sm"
                                          : "bg-primary text-primary-foreground rounded-bl-sm"
                                        : msg.isDeleted
                                          ? "bg-card border border-border text-muted-foreground italic rounded-br-sm"
                                          : "bg-card border border-border rounded-br-sm",
                                    )}
                                  >
                                    {msg.messageType === "image" && msg.imageUrl && !msg.isDeleted ? (
                                      <img
                                        src={imgUrl(msg.imageUrl)}
                                        alt="صورة"
                                        className="rounded-xl max-w-52 max-h-52 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => window.open(imgUrl(msg.imageUrl)!, "_blank")}
                                      />
                                    ) : msg.messageType === "audio" && msg.imageUrl && !msg.isDeleted ? (
                                      <div className="flex items-center gap-2 min-w-[160px]">
                                        <Play className="w-4 h-4 shrink-0 opacity-70" />
                                        <audio controls src={imgUrl(msg.imageUrl)} className="h-8 max-w-[190px]" style={{ minWidth: 140 }} />
                                      </div>
                                    ) : (
                                      <p className="leading-relaxed whitespace-pre-wrap">
                                        {msg.isDeleted ? "🚫 تم حذف هذه الرسالة" : msg.content}
                                      </p>
                                    )}
                                    {msg.editedAt && !msg.isDeleted && (
                                      <span className={cn("text-[10px] ms-1.5 opacity-60", isMine ? "text-primary-foreground" : "text-muted-foreground")}>
                                        (معدّل)
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Context menu */}
                                {contextMenu?.msgId === msg.id && (
                                  <div
                                    className="fixed z-50 bg-card border border-border rounded-xl shadow-2xl py-1 min-w-36 overflow-hidden"
                                    style={{ top: contextMenu.y, left: contextMenu.x }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {canEdit(msg) && (
                                      <button
                                        className="w-full text-right px-4 py-2.5 text-sm hover:bg-secondary flex items-center gap-2 transition-colors"
                                        onClick={() => { setEditingId(msg.id); setEditContent(msg.content); setContextMenu(null); }}
                                      >
                                        <Edit2 className="w-3.5 h-3.5 text-primary" /> تعديل
                                      </button>
                                    )}
                                    <button
                                      className="w-full text-right px-4 py-2.5 text-sm hover:bg-destructive/5 flex items-center gap-2 text-red-500 transition-colors"
                                      onClick={() => { setPendingDelete(msg.id); setContextMenu(null); }}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> حذف
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Reactions display */}
                              {reactionKeys.length > 0 && (
                                <div className={cn("flex gap-1 mt-1 flex-wrap", isMine ? "justify-end" : "justify-start")}>
                                  {reactionKeys.map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => handleReact(msg.id, emoji)}
                                      className={cn(
                                        "text-xs px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 transition-all hover:scale-110",
                                        reactions[emoji]?.includes(user.id)
                                          ? "bg-primary/15 border-primary/40 shadow-sm"
                                          : "bg-background border-border"
                                      )}
                                    >
                                      {emoji} <span className="text-[10px] text-muted-foreground font-medium">{reactions[emoji]?.length}</span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Time + status */}
                              <div className={cn("flex items-center gap-1 mt-1", isMine ? "flex-row-reverse" : "flex-row")}>
                                <StatusIcon status={msg.status} isMine={isMine} />
                                <span className="text-[10px] text-muted-foreground/70" dir="ltr">
                                  {new Date(msg.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()
              )}

              {/* Typing indicator */}
              {typingUser && (
                <div className="flex gap-2 items-end animate-in fade-in-0 slide-in-from-bottom-2">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 shadow-sm">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-br-sm px-4 py-2.5 flex gap-1.5 items-center shadow-sm">
                    <span className="text-xs text-muted-foreground me-1 font-medium">{typingUser}</span>
                    <span className="text-primary text-xs font-bold">يكتب</span>
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:160ms]" />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:320ms]" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Input area ── (hidden in admin monitoring mode) */}
            {!adminViewAll && (
              <div className="border-t bg-card flex flex-col">
                {/* Image preview */}
                {imagePreview && (
                  <div className="px-3 pt-2">
                    <div className="relative inline-block">
                      <img src={imagePreview} alt="preview" className="h-20 w-20 object-cover rounded-lg border" />
                      <button
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Audio recording state */}
                {(isRecording || audioBlob) && (
                  <div className="px-3 pt-2 pb-1 flex items-center gap-3">
                    {isRecording ? (
                      <>
                        <span className="flex items-center gap-1.5 text-sm text-red-500 font-medium">
                          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                          تسجيل... {fmtSecs(recordingSeconds)}
                        </span>
                        <Button size="sm" variant="destructive" onClick={handleStopRecording} className="h-7 gap-1">
                          <Square className="w-3 h-3" /> إيقاف
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelAudio} className="h-7 text-muted-foreground">
                          إلغاء
                        </Button>
                      </>
                    ) : audioPreviewUrl ? (
                      <>
                        <audio controls src={audioPreviewUrl} className="h-8 flex-1 max-w-[220px]" />
                        <span className="text-xs text-muted-foreground">{fmtSecs(recordingSeconds)}</span>
                        <Button size="sm" onClick={handleSendAudio} disabled={sending} className="h-7 gap-1 bg-primary hover:bg-primary/90">
                          {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 rotate-180" />}
                          إرسال
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelAudio} className="h-7 text-muted-foreground">
                          <X className="w-3 h-3" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                )}

                {/* Emoji picker — inline within the panel */}
                {showEmojiPicker && !isBlocked && (
                  <div className="border-t overflow-hidden" style={{ height: 320 }}>
                    <Picker
                      data={data}
                      theme="light"
                      previewPosition="none"
                      skinTonePosition="none"
                      onEmojiSelect={(e: { native: string }) => {
                        if (chatInputRef.current) chatInputRef.current.value += e.native;
                        setNewMessage((prev) => prev + e.native);
                      }}
                    />
                  </div>
                )}

                {/* Message input form */}
                {!isRecording && !audioBlob && (
                  <form
                    data-ui-id="FORM_CHAT_01"
                    data-testid="FORM_CHAT_01"
                    onSubmit={handleSend}
                    className="flex gap-1.5 items-center px-3 py-2.5"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn("shrink-0 w-9 h-9 rounded-full transition-colors", showEmojiPicker ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/5")}
                      onClick={(e) => { e.stopPropagation(); setShowEmojiPicker((v) => !v); }}
                      disabled={isBlocked}
                    >
                      <Smile className="w-5 h-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 w-9 h-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isBlocked}
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    <Input
                      ref={chatInputRef}
                      data-ui-id="INPUT_CHAT_MESSAGE_01"
                      data-testid="INPUT_CHAT_MESSAGE_01"
                      onInput={(e) => { setNewMessage((e.target as HTMLInputElement).value); handleTyping(); if (showEmojiPicker) setShowEmojiPicker(false); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder={
                        blockedByOther ? "لا يمكنك الرد (تم حظرك)" :
                        blockedByMe ? "أنت حظرت هذا المستخدم" :
                        "اكتب رسالتك..."
                      }
                      disabled={isBlocked}
                      className="flex-1 rounded-full text-sm bg-secondary/50 border-transparent focus-visible:border-primary/30 focus-visible:ring-primary/20 h-10 px-4"
                      dir="auto"
                      autoComplete="off"
                    />
                    {!newMessage.trim() && !imageFile ? (
                      <Button
                        type="button"
                        size="icon"
                        onClick={handleStartRecording}
                        disabled={isBlocked || isRecording}
                        className="shrink-0 w-10 h-10 rounded-full bg-primary hover:bg-primary/90 shadow-md transition-all"
                        title="تسجيل رسالة صوتية"
                      >
                        <Mic className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        data-ui-id="BTN_SEND_MSG_01"
                        data-testid="BTN_SEND_MSG_01"
                        size="icon"
                        disabled={(!newMessage.trim() && !imageFile) || sending || isBlocked}
                        className="shrink-0 w-10 h-10 rounded-full bg-primary hover:bg-primary/90 shadow-md transition-all disabled:opacity-50"
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rotate-180" />}
                      </Button>
                    )}
                  </form>
                )}
              </div>
            )}

            {adminViewAll && (
              <div className="border-t bg-amber-50 dark:bg-amber-900/10 px-4 py-2 text-center">
                <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center justify-center gap-1">
                  <Users className="w-3 h-3" />
                  أنت في وضع مراقبة المحادثات — القراءة فقط
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Block dialog */}
      <AlertDialog open={blockDialog} onOpenChange={setBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{blockedByMe ? "رفع الحظر عن هذا المستخدم؟" : "حظر هذا المستخدم؟"}</AlertDialogTitle>
            <AlertDialogDescription>
              {blockedByMe
                ? "سيتمكن المستخدم من إرسال رسائل إليك مجدداً."
                : "لن يستطيع المستخدم إرسال رسائل إليك بعد الآن."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className={blockedByMe ? "" : "bg-destructive hover:bg-destructive/90"}>
              {blockedByMe ? "رفع الحظر" : "حظر"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete dialog */}
      <AlertDialog open={pendingDelete !== null} onOpenChange={() => setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الرسالة؟</AlertDialogTitle>
            <AlertDialogDescription>لا يمكن التراجع عن حذف الرسالة.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDelete && handleDelete(pendingDelete)} className="bg-destructive hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
