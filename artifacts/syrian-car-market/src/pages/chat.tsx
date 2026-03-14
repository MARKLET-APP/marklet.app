import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/auth";
import { 
  useGetConversations, 
  useGetMessages, 
  useSendMessage 
} from "@workspace/api-client-react";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Send, Loader2, MessageSquare, ChevronRight, User
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Chat() {
  const { user, isHydrated } = useAuthStore();
  const [activeChatId, setActiveChatId] = useState<number | null>(() => {
    // Auto-select conversation from URL query param (e.g. ?conversationId=5)
    const params = new URLSearchParams(window.location.search);
    const id = params.get("conversationId");
    return id ? Number(id) : null;
  });
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: loadingConversations, refetch: refetchConversations } = useGetConversations({
    query: { enabled: !!user, refetchInterval: 10000 } // Poll every 10s
  });

  const { data: messages, isLoading: loadingMessages, refetch: refetchMessages } = useGetMessages(activeChatId || 0, {
    query: { enabled: !!activeChatId, refetchInterval: 5000 } // Poll active chat every 5s
  });

  const sendMessageMutation = useSendMessage();

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Keep activeChatId in sync if URL changes after mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("conversationId");
    if (id) setActiveChatId(Number(id));
  }, [window.location.search]);

  if (!isHydrated) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <Redirect to="/login" />;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatId) return;

    try {
      await sendMessageMutation.mutateAsync({
        conversationId: activeChatId,
        data: { content: newMessage }
      });
      setNewMessage("");
      refetchMessages();
      refetchConversations();
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  const activeConversation = conversations?.find(c => c.id === activeChatId);
  const otherUser = activeConversation ? (activeConversation.buyerId === user.id ? activeConversation.seller : activeConversation.buyer) : null;

  return (
    <div className="flex h-[calc(100vh-64px)] sm:h-[calc(100vh-80px)] w-full max-w-7xl mx-auto overflow-hidden bg-background">
      {/* Conversations List (Sidebar) */}
      <div className={cn(
        "w-full sm:w-80 md:w-96 flex-shrink-0 border-l bg-card flex flex-col transition-all duration-300",
        activeChatId ? "hidden sm:flex" : "flex"
      )}>
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-foreground">الرسائل</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !conversations || conversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>لا يوجد محادثات حالياً</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {conversations.map((conv) => {
                const partner = conv.buyerId === user.id ? conv.seller : conv.buyer;
                const isUnread = false; // Add real unread check if API supports
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveChatId(conv.id)}
                    className={cn(
                      "w-full text-right p-4 flex gap-4 hover:bg-secondary/50 transition-colors items-center",
                      activeChatId === conv.id ? "bg-secondary" : ""
                    )}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {partner?.avatarUrl ? (
                          <img src={partner.avatarUrl} alt={partner.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      {isUnread && <span className="absolute top-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-card" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-foreground truncate">{partner?.name || 'مستخدم'}</span>
                        <span className="text-xs text-muted-foreground shrink-0" dir="ltr">
                          {new Date(conv.updatedAt).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground truncate flex items-center gap-2">
                        {conv.car && (
                          <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded font-medium shrink-0">
                            {conv.car.brand}
                          </span>
                        )}
                        <span className="truncate">اضغط لعرض الرسائل</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Active Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col h-full bg-muted/20 relative",
        !activeChatId ? "hidden sm:flex" : "flex"
      )}>
        {!activeChatId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground h-full">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">اختر محادثة للبدء</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 border-b bg-card flex items-center gap-4 shrink-0 shadow-sm z-10">
              <button 
                className="sm:hidden p-2 -mr-2 hover:bg-secondary rounded-full"
                onClick={() => setActiveChatId(null)}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {otherUser?.avatarUrl ? (
                  <img src={otherUser.avatarUrl} alt={otherUser.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground">{otherUser?.name || 'مستخدم'}</h3>
                {activeConversation?.car && (
                  <p className="text-xs text-muted-foreground truncate">
                    بخصوص: {activeConversation.car.brand} {activeConversation.car.model}
                  </p>
                )}
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : !messages || messages.length === 0 ? (
                <div className="text-center text-muted-foreground pt-10">
                  ابدا المحادثة الآن...
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.senderId === user.id;
                  const showTime = i === 0 || new Date(messages[i-1].createdAt).getTime() - new Date(msg.createdAt).getTime() > 3600000;
                  
                  return (
                    <div key={msg.id} className="flex flex-col">
                      {showTime && (
                        <div className="text-center my-4">
                          <span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
                            {new Date(msg.createdAt).toLocaleString('ar-EG', { weekday: 'long', hour: 'numeric', minute: 'numeric' })}
                          </span>
                        </div>
                      )}
                      <div className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2.5",
                        isMe 
                          ? "bg-primary text-primary-foreground self-end rounded-tl-none shadow-sm" 
                          : "bg-card border shadow-sm self-start rounded-tr-none text-foreground"
                      )}>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        <p className={cn(
                          "text-[10px] mt-1 text-left",
                          isMe ? "text-primary-foreground/70" : "text-muted-foreground/70"
                        )} dir="ltr">
                          {new Date(msg.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-card border-t shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="اكتب رسالة..."
                  className="rounded-full bg-secondary/50 border-transparent focus-visible:ring-primary h-12 pr-4 pl-12"
                  dir="auto"
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
                    <Send className="w-5 h-5 -ml-1 rtl:ml-0 rtl:-mr-1" />
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