import { Bell, CheckCheck } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Bell className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-bold text-foreground">الإشعارات</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        لا توجد إشعارات جديدة في الوقت الحالي. ستظهر هنا إشعارات الرسائل والإعلانات.
      </p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
        <CheckCheck className="w-4 h-4 text-primary" />
        <span>قرأت جميع الإشعارات</span>
      </div>
    </div>
  );
}
