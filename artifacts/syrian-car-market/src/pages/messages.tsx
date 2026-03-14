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

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api`;

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("scm_token") : null;
  const isAdmin = user?.role === "admin";

  const activeConv = conversations.find((c) => c.id === activeChatId);
  const activeAdminConv = adminConversations.find((c) => c.id === activeChatId);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("conversationId");
    if (id) setActiveChatId(Number(id));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    const socket = io({ auth: { token }, transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("new_message", ({ message }: { convId: number; message: MessageItem }) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === message.id)) return prev;
        return [...prev, { ...message, reactions: message.reactions ?? {} }];
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
    if ((!newMessage.trim() && !imageFile) || !activeChatId || sending) return;
    setSending(true);
    setShowEmojiPicker(false);

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

      if (newMessage.trim()) {
        const r = await fetch(`${API}/chats/${activeChatId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ content: newMessage.trim() }),
        });
        if (!r.ok) {
          const err = await r.json();
          if (err.error === "Blocked") { toast({ title: "لا يمكن إرسال الرسالة", description: "أنت محظور من قبل هذا المستخدم أو قمت بحظره", variant: "destructive" }); return; }
          throw new Error("فشل الإرسال");
        }
        setNewMessage("");
      }
      socketRef.current?.emit("typing_stop", { convId: activeChatId });
      await fetchConversations();
    } catch (err) {
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        setIsRecording(false);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      toast({ title: "خطأ", description: "لا يمكن الوصول إلى الميكروفون", variant: "destructive" });
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
      className="flex h-[calc(100vh-64px)] sm:h-[calc(100vh-80px)] w-full max-w-7xl mx-auto overflow-hidden bg-background"
      onClick={() => { setContextMenu(null); }}
    >
      {/* ── Conversation list ── */}
      <div className={cn("w-full sm:w-80 md:w-96 flex-shrink-0 border-l bg-card flex flex-col", activeChatId ? "hidden sm:flex" : "flex")}>
        <div className="p-4 border-b flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl"
              onClick={() => window.history.back()}
              title="رجوع"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold">
              {adminViewAll ? "كل المحادثات" : "الرسائل"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {!adminViewAll && conversations.reduce((s, c) => s + c.unreadCount, 0) > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full px-2 py-0.5">
                {conversations.reduce((s, c) => s + c.unreadCount, 0)} جديدة
              </span>
            )}
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
              <div className="divide-y divide-border/40">
                {conversations.map((conv) => {
                  const hasUnread = conv.unreadCount > 0;
                  const ts = conv.lastMessageAt ?? conv.createdAt;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setActiveChatId(conv.id)}
                      className={cn("w-full text-right p-3 flex gap-3 hover:bg-secondary/50 transition-colors items-center", conv.id === activeChatId && "bg-secondary")}
                    >
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                          {conv.otherUserPhoto
                            ? <img src={conv.otherUserPhoto} alt={conv.otherUserName} className="w-full h-full object-cover" />
                            : <User className="w-6 h-6 text-muted-foreground" />
                          }
                        </div>
                        {hasUnread && (
                          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-card">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className={cn("font-bold text-foreground text-sm truncate", hasUnread && "text-primary")}>{conv.otherUserName}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0 ms-1" dir="ltr">{formatTime(ts)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 flex items-center gap-1">
                            <Car className="w-2.5 h-2.5" />
                            {conv.carBrand} {conv.carModel}
                          </span>
                          {conv.lastMessage && (
                            <span className={cn("text-xs truncate", hasUnread ? "font-semibold text-foreground" : "text-muted-foreground")}>{conv.lastMessage}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
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
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <MessageSquare className="w-16 h-16 opacity-10" />
            <p className="text-lg font-medium">اختر محادثة للبدء</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="border-b bg-card px-4 py-3 flex items-center gap-3">
              <Button variant="ghost" size="icon" className="sm:hidden shrink-0" onClick={() => setActiveChatId(null)}>
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
                  {activeConv?.carImage
                    ? <img src={activeConv.carImage} alt="car" className="w-10 h-10 rounded-lg object-cover shrink-0 border" />
                    : <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0"><Car className="w-5 h-5 text-muted-foreground" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{activeConv?.otherUserName}</p>
                    <p className="text-xs text-muted-foreground truncate">{activeConv?.carBrand} {activeConv?.carModel} {activeConv?.carYear}</p>
                  </div>
                  {isBlocked && (
                    <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                      <Ban className="w-3.5 h-3.5" /> محظور
                    </span>
                  )}
                  <Button
                    variant="ghost" size="icon"
                    className="text-muted-foreground hover:text-red-500"
                    onClick={() => setBlockDialog(true)}
                    title={blockedByMe ? "رفع الحظر" : "حظر المستخدم"}
                  >
                    <Ban className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gradient-to-b from-background to-muted/20">
              {loadingMsgs ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
                  <MessageSquare className="w-10 h-10 opacity-20" />
                  <p>لا توجد رسائل بعد. ابدأ المحادثة!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === user.id;
                  const isSystem = msg.messageType === "system" || msg.senderId === 0;
                  const reactions = msg.reactions ?? {};
                  const reactionKeys = Object.keys(reactions).filter((k) => reactions[k].length > 0);

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <span className="bg-muted text-muted-foreground text-xs px-3 py-1.5 rounded-full max-w-xs text-center">{msg.content}</span>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={cn("flex gap-2 group", isMine ? "flex-row-reverse" : "flex-row")} style={{ alignItems: "flex-end" }}>
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 mb-1">
                        {msg.senderPhoto
                          ? <img src={msg.senderPhoto} alt={msg.senderName} className="w-full h-full object-cover" />
                          : <User className="w-3.5 h-3.5 text-muted-foreground" />
                        }
                      </div>

                      <div className={cn("flex flex-col max-w-[70%]", isMine ? "items-end" : "items-start")}>
                        <div className="relative">
                          {/* Reaction bar (shown on hover) */}
                          {!msg.isDeleted && hoveredReaction === msg.id && (
                            <div
                              className={cn("absolute -top-9 flex gap-1 bg-background border border-border rounded-full px-2 py-1 shadow-lg z-10",
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
                            <div className="flex gap-2">
                              <Input
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleEdit(msg.id); if (e.key === "Escape") setEditingId(null); }}
                                className="text-sm h-8"
                                autoFocus
                              />
                              <Button size="sm" onClick={() => handleEdit(msg.id)} className="h-8 px-2"><Check className="w-3.5 h-3.5" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 px-2"><X className="w-3.5 h-3.5" /></Button>
                            </div>
                          ) : (
                            <div
                              onMouseEnter={() => setHoveredReaction(msg.id)}
                              onMouseLeave={() => setHoveredReaction(null)}
                              onContextMenu={(e) => { if (isMine && !msg.isDeleted && !adminViewAll) openContextMenu(e, msg.id); }}
                              className={cn(
                                "px-3 py-2 rounded-2xl text-sm shadow-sm cursor-default select-text break-words",
                                isMine
                                  ? msg.isDeleted ? "bg-muted text-muted-foreground italic rounded-br-none" : "bg-primary text-primary-foreground rounded-br-none"
                                  : msg.isDeleted ? "bg-muted text-muted-foreground italic rounded-bl-none" : "bg-card border border-border rounded-bl-none",
                              )}
                            >
                              {msg.messageType === "image" && msg.imageUrl && !msg.isDeleted ? (
                                <img src={msg.imageUrl} alt="صورة" className="rounded-lg max-w-48 max-h-48 object-cover cursor-pointer" onClick={() => window.open(msg.imageUrl!, "_blank")} />
                              ) : msg.messageType === "audio" && msg.imageUrl && !msg.isDeleted ? (
                                <div className="flex items-center gap-2 min-w-[180px]">
                                  <Play className="w-4 h-4 shrink-0 opacity-70" />
                                  <audio controls src={msg.imageUrl} className="h-8 max-w-[200px]" style={{ minWidth: 160 }} />
                                </div>
                              ) : (
                                <span>{msg.isDeleted ? "تم حذف هذه الرسالة" : msg.content}</span>
                              )}
                              {msg.editedAt && !msg.isDeleted && (
                                <span className={cn("text-[10px] ms-1", isMine ? "text-primary-foreground/60" : "text-muted-foreground")}>(معدل)</span>
                              )}
                            </div>
                          )}

                          {/* Context menu */}
                          {contextMenu?.msgId === msg.id && (
                            <div
                              className="fixed z-50 bg-card border border-border rounded-xl shadow-xl py-1 min-w-36"
                              style={{ top: contextMenu.y, left: contextMenu.x }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {canEdit(msg) && (
                                <button
                                  className="w-full text-right px-4 py-2 text-sm hover:bg-secondary flex items-center gap-2"
                                  onClick={() => { setEditingId(msg.id); setEditContent(msg.content); setContextMenu(null); }}
                                >
                                  <Edit2 className="w-3.5 h-3.5" /> تعديل
                                </button>
                              )}
                              <button
                                className="w-full text-right px-4 py-2 text-sm hover:bg-secondary flex items-center gap-2 text-red-500"
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
                                  "text-xs px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 transition-colors",
                                  reactions[emoji]?.includes(user.id) ? "bg-primary/10 border-primary/30" : "bg-background border-border"
                                )}
                              >
                                {emoji} <span className="text-[10px] text-muted-foreground">{reactions[emoji]?.length}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Time + status */}
                        <div className={cn("flex items-center gap-1 mt-0.5", isMine ? "flex-row-reverse" : "flex-row")}>
                          <StatusIcon status={msg.status} isMine={isMine} />
                          <span className="text-[10px] text-muted-foreground" dir="ltr">
                            {new Date(msg.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {typingUser && (
                <div className="flex gap-2 items-end">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0"><User className="w-3.5 h-3.5 text-muted-foreground" /></div>
                  <div className="bg-card border border-border rounded-2xl rounded-bl-none px-4 py-2.5 flex gap-1 items-center">
                    <span className="text-xs text-muted-foreground me-1">{typingUser}</span>
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
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
                        setNewMessage((prev) => prev + e.native);
                      }}
                    />
                  </div>
                )}

                {/* Message input form */}
                {!isRecording && !audioBlob && (
                  <form onSubmit={handleSend} className="flex gap-2 items-center p-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn("shrink-0", showEmojiPicker ? "text-primary" : "text-muted-foreground hover:text-primary")}
                      onClick={(e) => { e.stopPropagation(); setShowEmojiPicker((v) => !v); }}
                      disabled={isBlocked}
                    >
                      <Smile className="w-5 h-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-primary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isBlocked}
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    <Input
                      value={newMessage}
                      onChange={(e) => { setNewMessage(e.target.value); handleTyping(); if (showEmojiPicker) setShowEmojiPicker(false); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder={
                        blockedByOther ? "لا يمكنك الرد (تم حظرك)" :
                        blockedByMe ? "أنت حظرت هذا المستخدم" :
                        "اكتب رسالتك هنا..."
                      }
                      disabled={isBlocked}
                      className="flex-1 rounded-full text-sm"
                      dir="auto"
                    />
                    {/* Mic button — shown only when input is empty */}
                    {!newMessage.trim() && !imageFile ? (
                      <Button
                        type="button"
                        size="icon"
                        onClick={handleStartRecording}
                        disabled={isBlocked || isRecording}
                        className="shrink-0 rounded-full bg-primary hover:bg-primary/90"
                        title="تسجيل رسالة صوتية"
                      >
                        <Mic className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        size="icon"
                        disabled={(!newMessage.trim() && !imageFile) || sending || isBlocked}
                        className="shrink-0 rounded-full bg-primary hover:bg-primary/90"
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
