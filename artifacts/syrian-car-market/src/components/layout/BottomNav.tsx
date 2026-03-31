// UI_ID: COMP_BOTTOM_NAV_01
// NAME: شريط التنقل السفلي
import { Link, useRoute } from "wouter";
import { Home, Plus, MessageCircle, User, Bell, Settings } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { useGetConversations } from "@workspace/api-client-react";

export function BottomNav() {
  const { user } = useAuthStore();
  const [isHome] = useRoute("/");
  const [isAdd] = useRoute("/add-listing");
  const [isProfile] = useRoute("/profile");
  const [isMessages] = useRoute("/messages");
  const [isChat] = useRoute("/chat");
  const [isNotifications] = useRoute("/notifications");
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
    <div className="glass-panel border-t pb-safe sm:hidden flex-shrink-0">
      <div className="flex items-center justify-around h-16 px-1">

        {/* الرئيسية */}
        <NavItem href="/" icon={<Home className="w-5 h-5" />} label="الرئيسية" isActive={isHome} />

        {/* إشعارات */}
        <NavItem href="/notifications" icon={<Bell className="w-5 h-5" />} label="إشعارات" isActive={isNotifications} />

        {/* نشر — centered floating button */}
        <Link
          href="/add-listing"
          className="flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors text-primary"
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${isAdd ? "bg-primary/80" : "bg-primary"}`}>
            <Plus className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-medium text-primary">نشر</span>
        </Link>

        {/* رسائل (all users) or لوحة التحكم (admin) */}
        {isAdminUser ? (
          <NavItem
            href="/admin"
            icon={<Settings className="w-5 h-5" />}
            label="التحكم"
            isActive={isAdmin}
            accent
          />
        ) : (
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
        )}

        {/* حسابي */}
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
  const activeColor = accent ? "text-emerald-600" : "text-primary";
  return (
    <Link href={href} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? activeColor : "text-muted-foreground hover:text-foreground"}`}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
