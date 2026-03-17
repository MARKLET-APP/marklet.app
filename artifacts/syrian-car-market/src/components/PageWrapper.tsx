import { type ReactNode } from "react";
import { useLocation } from "wouter";
import { ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface PageWrapperProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  backHref?: string;
  onBack?: () => void;
  showBack?: boolean;
  actions?: ReactNode;
  className?: string;
  noPadding?: boolean;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyDesc?: string;
  emptyAction?: ReactNode;
  headerBg?: boolean;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
}

const MAX_WIDTH_MAP = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-full",
};

export function PageWrapper({
  children,
  title,
  subtitle,
  icon,
  backHref,
  onBack,
  showBack = false,
  actions,
  className,
  noPadding = false,
  isLoading = false,
  isEmpty = false,
  emptyIcon,
  emptyTitle = "لا توجد بيانات",
  emptyDesc,
  emptyAction,
  headerBg = false,
  maxWidth = "lg",
}: PageWrapperProps) {
  const [, navigate] = useLocation();
  const { isRTL } = useLanguage();

  const handleBack = () => {
    if (onBack) onBack();
    else if (backHref) navigate(backHref);
    else window.history.back();
  };

  const hasHeader = title || showBack || backHref || actions;
  const maxW = MAX_WIDTH_MAP[maxWidth];

  return (
    <div className={cn("min-h-[60vh]", className)}>
      {hasHeader && (
        <div className={cn("w-full", headerBg && "bg-primary text-primary-foreground")}>
          <div className={cn("mx-auto px-4 py-4 sm:px-6", maxW)}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {(showBack || backHref || onBack) && (
                  <Button
                    variant={headerBg ? "ghost" : "ghost"}
                    size="icon"
                    onClick={handleBack}
                    className={cn(
                      "shrink-0 rounded-xl",
                      headerBg ? "text-primary-foreground hover:bg-white/20" : ""
                    )}
                    aria-label="رجوع"
                  >
                    {isRTL ? (
                      <ChevronRight className="w-5 h-5" />
                    ) : (
                      <ChevronLeft className="w-5 h-5" />
                    )}
                  </Button>
                )}
                {icon && (
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                    headerBg ? "bg-white/20" : "bg-primary/10"
                  )}>
                    <span className={headerBg ? "text-primary-foreground" : "text-primary"}>
                      {icon}
                    </span>
                  </div>
                )}
                {title && (
                  <div className="min-w-0">
                    <h1 className={cn(
                      "text-xl font-bold truncate",
                      headerBg ? "text-primary-foreground" : "text-foreground"
                    )}>
                      {title}
                    </h1>
                    {subtitle && (
                      <p className={cn(
                        "text-sm mt-0.5 truncate",
                        headerBg ? "text-primary-foreground/75" : "text-muted-foreground"
                      )}>
                        {subtitle}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-2 shrink-0">{actions}</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={cn("mx-auto", maxW, !noPadding && "px-4 py-4 sm:px-6 sm:py-6")}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">جاري التحميل...</p>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            {emptyIcon && (
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                {emptyIcon}
              </div>
            )}
            <div>
              <p className="font-bold text-foreground text-lg">{emptyTitle}</p>
              {emptyDesc && <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">{emptyDesc}</p>}
            </div>
            {emptyAction && <div className="mt-2">{emptyAction}</div>}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, subtitle, icon, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-2 mb-4", className)}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-primary">{icon}</span>}
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

interface StatusBadgeProps {
  status: "pending" | "approved" | "rejected" | "active" | "sold" | "available" | "featured" | string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "قيد المراجعة", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  approved: { label: "معتمد", className: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "مرفوض", className: "bg-red-100 text-red-700 border-red-200" },
  active: { label: "نشط", className: "bg-blue-100 text-blue-700 border-blue-200" },
  sold: { label: "تم البيع", className: "bg-slate-100 text-slate-600 border-slate-200" },
  available: { label: "متاح", className: "bg-green-100 text-green-700 border-green-200" },
  featured: { label: "مميّز ⭐", className: "bg-amber-100 text-amber-700 border-amber-200" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border", config.className, className)}>
      {config.label}
    </span>
  );
}

interface InfoRowProps {
  icon?: ReactNode;
  label: string;
  value?: string | number | null;
  className?: string;
}

export function InfoRow({ icon, label, value, className }: InfoRowProps) {
  if (value == null || value === "") return null;
  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      {icon && <span className="text-primary shrink-0">{icon}</span>}
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
