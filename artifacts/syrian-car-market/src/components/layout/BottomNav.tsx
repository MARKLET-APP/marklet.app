import { Link, useRoute } from "wouter";
import { Home, Search, Plus, Bookmark, User, MessageCircle, ShoppingBag, Settings } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { useGetConversations } from "@workspace/api-client-react";

export function BottomNav() {
  const { user } = useAuthStore();
  const [isHome] = useRoute("/");
  const [isSearch] = useRoute("/search");
  const [isAdd] = useRoute("/add-listing");
  const [isFavorites] = useRoute("/favorites");
  const [isProfile] = useRoute("/profile");
  const [isMessages] = useRoute("/messages");
  const [isChat] = useRoute("/chat");
  const [isBuyRequests] = useRoute("/buy-requests");
  const [isAdmin] = useRoute("/admin");

  const { data: conversations } = useGetConversations({
    query: {
      enabled: !!user,
      refetchInterval: 15_000,
      staleTime: 10_000,
    },
  });

  const totalUnread = conversations?.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0) ?? 0;
  const isChatActive = isMessages || isChat;
  const isAdminUser = user?.role === "admin";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t pb-safe sm:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        <NavItem href="/" icon={<Home className="w-5 h-5" />} label="الرئيسية" isActive={isHome} />
        <NavItem href="/search" icon={<Search className="w-5 h-5" />} label="البحث" isActive={isSearch} />

        <Link
          href="/add-listing"
          className="flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors text-primary"
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${isAdd ? "bg-primary/80" : "bg-primary"}`}>
            <Plus className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-medium text-primary">نشر</span>
        </Link>

        {/* Admin gets لوحة التحكم instead of المحفوظات */}
        {isAdminUser ? (
          <NavItem
            href="/admin"
            icon={<Settings className="w-5 h-5" />}
            label="التحكم"
            isActive={isAdmin}
            accent
          />
        ) : (
          <NavItem href="/favorites" icon={<Bookmark className="w-5 h-5" />} label="المحفوظات" isActive={isFavorites} />
        )}

        {user ? (
          <NavItem
            href="/messages"
            icon={
              <div className="relative">
                <MessageCircle className="w-5 h-5" />
                {totalUnread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </div>
            }
            label="رسائل"
            isActive={isChatActive}
          />
        ) : (
          <NavItem href="/buy-requests" icon={<ShoppingBag className="w-5 h-5" />} label="أريد أشتري" isActive={isBuyRequests} />
        )}

        <NavItem href="/profile" icon={<User className="w-5 h-5" />} label="حسابي" isActive={isProfile} />
      </div>
    </div>
  );
}

function NavItem({
  href, icon, label, isActive, accent
}: {
  href: string; icon: React.ReactNode; label: string; isActive: boolean | null; accent?: boolean
}) {
  const activeColor = accent ? "text-amber-500" : "text-primary";
  return (
    <Link href={href} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? activeColor : "text-muted-foreground hover:text-foreground"}`}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
