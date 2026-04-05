import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/auth";
import {
  useGetConversations,
  useGetMessages,
  useSendMessage,
} from "@workspace/api-client-react";
import type { Conversation, Message } from "@workspace/api-client-react";
import { Redirect, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, MessageSquare, ChevronRight, User, Car } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Chat() {
  const { user, isHydrated } = useAuthStore();

  const [activeChatId, setActiveChatId] = useState<number | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("conversationId");
    return id ? Number(id) : null;
  });

  const [newMessage, setNewMessage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("initial");
    return initial ? decodeURIComponent(initial) : "";
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    data: conversations,
    isLoading: loadingConversations,
    refetch: refetchConversations,
  } = useGetConversations({ query: { enabled: !!user, refetchInterval: 8000 } });

  const {
    data: messages,
    isLoading: loadingMessages,
    refetch: refetchMessages,
  } = useGetMessages(activeChatId ?? 0, {
    query: { enabled: !!activeChatId, refetchInterval: 4000 },
  });

  const sendMessageMutation = useSendMessage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const [location] = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("conversationId");
    if (id) setActiveChatId(Number(id));
  }, [location]);

  if (!isHydrated)
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  if (!user) return <Redirect to="/auth" />;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatId) return;
    try {
      await sendMessageMutation.mutateAsync({
        conversationId: activeChatId,
        data: { content: newMessage.trim() },
      });
      setNewMessage("");
      refetchMessages();
      refetchConversations();
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const activeConversation: Conversation | undefined = conversations?.find(
    (c) => c.id === activeChatId
  );

  // Disable the main element's vertical scroll while chat is open — the chat
  // manages its own internal scroll (messages list). Without this, main would
  // create a second scrollbar around the full-height chat container.
  useEffect(() => {
    const main = document.getElementById("app-main");
    if (!main) return;
    const prev = main.style.overflowY;
    main.style.overflowY = "hidden";
    return () => { main.style.overflowY = prev; };
  }, []);

  return (
    <div className="flex h-full overflow-hidden w-full bg-background">
      {/* ── Sidebar: conversation list ── */}
      <div
        className={cn(
          "w-full sm:w-80 md:w-96 flex-shrink-0 border-l bg-card flex flex-col",
          activeChatId ? "hidden sm:flex" : "flex"
        )}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">الرسائل</h2>
          {conversations && conversations.reduce((s, c) => s + c.unreadCount, 0) > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full px-2 py-0.5">
              {conversations.reduce((s, c) => s + c.unreadCount, 0)} جديدة
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !conversations || conversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>لا يوجد محادثات حالياً</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {conversations.map((conv) => (
                <ConvItem
                  key={conv.id}
                  conv={conv}
                  isActive={activeChatId === conv.id}
                  onClick={() => setActiveChatId(conv.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main chat area ── */}
      <div
        className={cn(
          "flex-1 flex flex-col h-full bg-muted/20 relative",
          !activeChatId ? "hidden sm:flex" : "flex"
        )}
      >
        {!activeChatId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground h-full">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">اختر محادثة للبدء</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="h-16 px-4 border-b bg-card flex items-center gap-4 shrink-0 shadow-sm z-10">
              <button
                className="sm:hidden p-2 -mr-2 hover:bg-secondary rounded-full"
                onClick={() => setActiveChatId(null)}
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border">
                {activeConversation?.otherUserPhoto ? (
                  <img
                    src={activeConversation.otherUserPhoto}
                    alt={activeConversation.otherUserName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground truncate">
                  {activeConversation?.otherUserName ?? "مستخدم"}
                </h3>
                {activeConversation && (
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <Car className="w-3 h-3 shrink-0" />
                    {activeConversation.carBrand} {activeConversation.carModel} {activeConversation.carYear}
                  </p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : !messages || messages.length === 0 ? (
                <div className="text-center text-muted-foreground pt-12">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p>ابدأ المحادثة الآن...</p>
                </div>
              ) : (
                messages.map((msg: Message, i: number) => {
                  const isMe = msg.senderId === (user as any).id;
                  const prevMsg = messages[i - 1];
                  const showTime =
                    i === 0 ||
                    new Date(msg.createdAt).getTime() -
                      new Date(prevMsg.createdAt).getTime() >
                      3_600_000;

                  return (
                    <div key={msg.id} className="flex flex-col">
                      {showTime && (
                        <div className="text-center my-3">
                          <span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
                            {new Date(msg.createdAt).toLocaleString("ar-EG", {
                              weekday: "long",
                              hour: "numeric",
                              minute: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm",
                          isMe
                            ? "bg-primary text-primary-foreground self-end rounded-tl-none"
                            : "bg-card border self-start rounded-tr-none text-foreground"
                        )}
                      >
                        {!isMe && (
                          <p className="text-[10px] font-bold text-primary mb-0.5 truncate">
                            {msg.senderName}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </p>
                        <p
                          className={cn(
                            "text-[10px] mt-1",
                            isMe
                              ? "text-primary-foreground/60 text-left"
                              : "text-muted-foreground/60 text-right"
                          )}
                          dir="ltr"
                        >
                          {new Date(msg.createdAt).toLocaleTimeString("ar-EG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Input */}
            <div className="p-4 bg-card border-t shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="اكتب رسالة..."
                  className="rounded-full bg-secondary/50 border-transparent focus-visible:ring-primary h-12 pr-4 pl-14"
                  dir="auto"
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute left-1 top-1 h-10 w-10 rounded-full"
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 rtl:-rotate-180" />
                  )}
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ConvItem({
  conv,
  isActive,
  onClick,
}: {
  conv: Conversation;
  isActive: boolean;
  onClick: () => void;
}) {
  const hasUnread = conv.unreadCount > 0;
  const timestamp = conv.lastMessageAt ?? conv.createdAt;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-right p-4 flex gap-3 hover:bg-secondary/50 transition-colors items-center",
        isActive && "bg-secondary"
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
          {conv.otherUserPhoto ? (
            <img
              src={conv.otherUserPhoto}
              alt={conv.otherUserName}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        {hasUnread && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-card">
            {conv.unreadCount}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <span className={cn("font-bold text-foreground truncate", hasUnread && "text-primary")}>
            {conv.otherUserName}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0 ms-2" dir="ltr">
            {new Date(timestamp).toLocaleDateString("ar-EG")}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0">
            {conv.carBrand} {conv.carModel}
          </span>
          {conv.lastMessage && (
            <span className={cn("text-xs truncate", hasUnread ? "font-semibold text-foreground" : "text-muted-foreground")}>
              {conv.lastMessage}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
