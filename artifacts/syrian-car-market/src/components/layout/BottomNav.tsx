import { Link, useRoute } from "wouter";
import { Home, Search, PlusCircle, Heart, User, MessageCircle, ShoppingBag } from "lucide-react";
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
        <NavItem href="/" icon={<Home className="w-6 h-6" />} label="الرئيسية" isActive={isHome} />
        <NavItem href="/search" icon={<Search className="w-6 h-6" />} label="البحث" isActive={isSearch} />

        {/* Add listing – shown to all users; permission checked inside the page */}
        <div className="relative -top-5">
          <Link href="/add-listing" className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-transform active:scale-95 ${isAdd ? 'bg-primary/80' : 'bg-primary'} text-white`}>
            <PlusCircle className="w-8 h-8" />
          </Link>
        </div>

        <NavItem href="/buy-requests" icon={<ShoppingBag className="w-6 h-6" />} label="أريد أشتري" isActive={isBuyRequests} />

        {user ? (
          <NavItem href="/chat" icon={<MessageCircle className="w-6 h-6" />} label="المحادثات" isActive={isChat} />
        ) : (
          <NavItem href="/favorites" icon={<Heart className="w-6 h-6" />} label="المفضلة" isActive={isFavorites} />
        )}

        <NavItem href="/profile" icon={<User className="w-6 h-6" />} label="حسابي" isActive={isProfile} />
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, isActive }: { href: string; icon: React.ReactNode; label: string; isActive: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
