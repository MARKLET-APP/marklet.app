import { Bell, CheckCheck, Loader2, Info, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { withApi } from "@/lib/runtimeConfig";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getNotifIcon(type: string) {
  if (type === "approved" || type === "success") return <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />;
  if (type === "rejected" || type === "error") return <XCircle className="w-5 h-5 text-red-500 shrink-0" />;
  if (type === "warning") return <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />;
  return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days} يوم`;
}

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  const { data: notifications = [], isLoading } = useQuery<any[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const token = localStorage.getItem("scm_token");
      const r = await fetch(withApi("/api/notifications"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      return r.ok ? r.json() : [];
    },
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem("scm_token");
      await fetch(withApi(`/api/notifications/${id}/read`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["header-notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("scm_token");
      await fetch(withApi("/api/notifications/read-all"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["header-notifications"] });
    },
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">الإشعارات</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">{unreadCount} إشعار غير مقروء</p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-primary text-xs gap-1.5"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <CheckCheck className="w-4 h-4" />
            تحديد الكل كمقروء
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Bell className="w-8 h-8 text-muted-foreground opacity-40" />
          </div>
          <div>
            <p className="font-medium text-foreground">لا توجد إشعارات</p>
            <p className="text-sm text-muted-foreground mt-1">
              ستظهر هنا إشعارات الموافقة والرفض والرسائل من الإدارة
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <CheckCheck className="w-4 h-4 text-primary" />
            <span>أنت على اطلاع بكل شيء</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <button
              key={n.id}
              className={cn(
                "w-full text-right flex items-start gap-3 p-4 rounded-2xl border transition-all",
                n.isRead
                  ? "bg-card border-border opacity-70 hover:opacity-100"
                  : "bg-primary/5 border-primary/20 shadow-sm hover:bg-primary/10"
              )}
              onClick={() => {
                if (!n.isRead) markReadMutation.mutate(n.id);
              }}
            >
              <div className="mt-0.5">{getNotifIcon(n.type ?? "info")}</div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm leading-snug", !n.isRead && "font-semibold")}>{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.isRead && (
                <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1.5" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
