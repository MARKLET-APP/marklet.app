import { Link } from "wouter";
import { Bell, Menu, User, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function Header() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const isPremium = !!(user as any)?.isPremium || !!(user as any)?.isVerified;

  const handleSubscribeClick = () => {
    toast({
      title: "الاشتراك قريباً",
      description: "ميزة الاشتراك المدفوع ستكون متاحة قريباً — ابقَ بانتظارنا!",
    });
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="sm:hidden">
            <Menu className="w-6 h-6" />
          </Button>
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-8 h-8 object-contain drop-shadow-sm" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              CarNet
            </span>
          </Link>
        </div>

        <nav className="hidden sm:flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold hover:text-primary transition-colors">الرئيسية</Link>
          <Link href="/search" className="text-sm font-semibold hover:text-primary transition-colors">البحث</Link>
          <Link href="/vehicle-info" className="text-sm font-semibold hover:text-primary transition-colors">تقرير مركبة</Link>
          <Link href="/buy-requests" className="text-sm font-semibold hover:text-primary transition-colors">طلبات الشراء</Link>
          <Link href="/support" className="text-sm font-semibold hover:text-primary transition-colors">تواصل معنا</Link>
          {user?.role === 'admin' && (
            <Link href="/admin" className="text-sm font-semibold text-accent hover:text-accent/80 transition-colors">لوحة التحكم</Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {!isPremium && (
                <Button
                  onClick={handleSubscribeClick}
                  size="sm"
                  className="hidden sm:flex gap-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-xs font-bold px-3 h-8 shadow-sm shadow-amber-400/30"
                >
                  <Crown className="w-3.5 h-3.5" /> اشترك الآن
                </Button>
              )}
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full"></span>
              </Button>
              <Link href="/profile" className="hidden sm:flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-full font-medium hover:bg-secondary/80 transition-colors">
                <User className="w-4 h-4" />
                <span>{user.name}</span>
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors px-3 py-2">تسجيل الدخول</Link>
              <Link href="/register" className="hidden sm:inline-flex bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-all">إنشاء حساب</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
