import { Link, useRoute } from "wouter";
import { Home, Search, Plus, Bookmark, User, MessageCircle, ShoppingBag } from "lucide-react";
import { useAuthStore } from "@/lib/auth";

export function BottomNav() {
  const { user } = useAuthStore();
  const [isHome] = useRoute("/");
  const [isSearch] = useRoute("/search");
  const [isAdd] = useRoute("/add-listing");
  const [isFavorites] = useRoute("/favorites");
  const [isProfile] = useRoute("/profile");
  const [isChat] = useRoute("/chat");
  const [isBuyRequests] = useRoute("/buy-requests");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t pb-safe sm:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        <NavItem href="/" icon={<Home className="w-5 h-5" />} label="الرئيسية" isActive={isHome} />
        <NavItem href="/search" icon={<Search className="w-5 h-5" />} label="البحث" isActive={isSearch} />

        {/* Center add button */}
        <Link
          href="/add-listing"
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isAdd ? "text-primary" : "text-primary"}`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${isAdd ? "bg-primary/80" : "bg-primary"}`}>
            <Plus className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-medium text-primary">نشر</span>
        </Link>

        {/* Always show favorites */}
        <NavItem href="/favorites" icon={<Bookmark className="w-5 h-5" />} label="المحفوظات" isActive={isFavorites} />

        {/* Show chat for logged-in users, buy requests for guests */}
        {user ? (
          <NavItem href="/chat" icon={<MessageCircle className="w-5 h-5" />} label="المحادثات" isActive={isChat} />
        ) : (
          <NavItem href="/buy-requests" icon={<ShoppingBag className="w-5 h-5" />} label="أريد أشتري" isActive={isBuyRequests} />
        )}

        <NavItem href="/profile" icon={<User className="w-5 h-5" />} label="حسابي" isActive={isProfile} />
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, isActive }: { href: string; icon: React.ReactNode; label: string; isActive: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
