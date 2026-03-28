// UI_ID: AUCTIONS_01
// NAME: المزادات
import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight, ArrowLeft, Globe, ExternalLink, X, ShoppingCart,
  AlertTriangle, ChevronDown, ChevronUp, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { api } from "@/lib/api";

interface AuctionSite {
  id: string;
  nameAr: string;
  nameEn: string;
  url: string;
  flag: string;
  description: string;
  region: "arab" | "american" | "korean";
}

const AUCTION_SITES: AuctionSite[] = [
  {
    id: "emirates",
    nameAr: "مزاد الإمارات",
    nameEn: "Emirates Auction",
    url: "https://www.emiratesauction.com",
    flag: "🇦🇪",
    description: "أكبر منصة مزادات في الشرق الأوسط",
    region: "arab",
  },
  {
    id: "copart",
    nameAr: "كوبارت",
    nameEn: "Copart",
    url: "https://www.copart.com",
    flag: "🇺🇸",
    description: "مزادات السيارات الأمريكية الأولى عالمياً",
    region: "american",
  },
  {
    id: "iaai",
    nameAr: "آي إيه إيه",
    nameEn: "IAAI",
    url: "https://www.iaai.com",
    flag: "🇺🇸",
    description: "مزادات السيارات الأمريكية المتضررة",
    region: "american",
  },
  {
    id: "encar",
    nameAr: "إنكار",
    nameEn: "Encar",
    url: "https://www.encar.com",
    flag: "🇰🇷",
    description: "أكبر سوق للسيارات الكورية",
    region: "korean",
  },
];

type Region = "arab" | "american" | "korean";

const REGION_INFO: Record<Region, { labelAr: string; labelEn: string; color: string }> = {
  arab:     { labelAr: "مزادات عربية",    labelEn: "Arab Auctions",    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  american: { labelAr: "مزادات أمريكية",  labelEn: "US Auctions",      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  korean:   { labelAr: "مزادات كورية",    labelEn: "Korean Auctions",  color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
};

export default function AuctionsPage() {
  const [, navigate] = useLocation();
  const { isRTL } = useLanguage();
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [activeRegion, setActiveRegion] = useState<Region | null>(null);
  const [activeSite, setActiveSite] = useState<AuctionSite | null>(null);
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    carUrl: activeSite?.url ?? "",
    price: "",
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    notes: "",
  });

  const ArrowIcon = isRTL ? ArrowRight : ArrowLeft;

  const openSite = (site: AuctionSite) => {
    window.open(site.url, "_blank");
    setActiveSite(site);
    setIframeError(false);
    setIframeLoading(false);
    setForm(f => ({ ...f, carUrl: site.url, name: user?.name ?? "", phone: user?.phone ?? "" }));
  };

  const closeSite = () => {
    setActiveSite(null);
    setIframeError(false);
    setIframeLoading(false);
  };

  const handleIframeLoad = () => setIframeLoading(false);
  const handleIframeError = () => { setIframeError(true); setIframeLoading(false); };

  const handleSubmitPurchase = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast({ title: "الاسم ورقم الهاتف مطلوبان", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const msg =
        `🏁 طلب شراء عبر مزاد\n` +
        `الموقع: ${activeSite?.nameAr ?? ""} (${activeSite?.url ?? ""})\n` +
        `رابط السيارة: ${form.carUrl || "—"}\n` +
        `السعر الحالي: ${form.price || "—"}\n` +
        `الاسم: ${form.name}\n` +
        `الهاتف: ${form.phone}\n` +
        `ملاحظات: ${form.notes || "—"}`;
      await api.support.send({ type: "auction_request", message: msg, userId: user?.id ?? null });
      toast({ title: "تم إرسال طلبك بنجاح", description: "سيتواصل معك فريق MARKLET قريباً" });
      setPurchaseOpen(false);
      setForm(f => ({ ...f, price: "", notes: "" }));
    } catch {
      toast({ title: "حدث خطأ، حاول مجدداً", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const sitesForRegion = (r: Region) => AUCTION_SITES.filter(s => s.region === r);

  if (activeSite) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-background">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-card shrink-0">
          <button onClick={closeSite} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate">{activeSite.flag} {activeSite.nameAr}</div>
            <div className="text-xs text-muted-foreground truncate">{activeSite.url}</div>
          </div>
          <a
            href={activeSite.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full hover:bg-muted transition-colors"
            title="فتح في متصفح جديد"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>

        {/* Disclaimer strip */}
        <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-300 dark:border-amber-700 px-4 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200 text-center shrink-0">
          يعرض MARKLET المزادات العالمية للتصفح فقط. عملية الشراء تتم مباشرة عبر موقع المزاد أو عبر فريق MARKLET عند طلب المساعدة.
        </div>

        {/* Site opened - show purchase CTA */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center gap-6 px-6 py-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <ExternalLink className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-bold text-xl mb-1">{activeSite.flag} {activeSite.nameAr}</p>
            <p className="text-muted-foreground text-sm mb-4">تم فتح الموقع في تبويب جديد</p>
            <button
              onClick={() => window.open(activeSite.url, "_blank")}
              className="text-primary text-sm underline hover:no-underline font-medium"
            >
              إعادة فتح الموقع
            </button>
          </div>
          <div className="w-full max-w-sm bg-primary/5 border border-primary/20 rounded-2xl p-4 text-sm text-right space-y-1">
            <p className="font-bold text-foreground mb-2">كيف يعمل MARKLET للمزادات؟</p>
            <p className="text-muted-foreground">١. ابحث عن سيارتك في موقع المزاد</p>
            <p className="text-muted-foreground">٢. انسخ رابط السيارة وأرسله لنا</p>
            <p className="text-muted-foreground">٣. يقوم فريق MARKLET بالمزايدة والشراء نيابةً عنك</p>
          </div>
        </div>

        {/* Fixed purchase button */}
        <div className="shrink-0 p-3 border-t bg-card safe-area-bottom">
          <Button
            className="w-full gap-2 bg-primary hover:bg-primary/90"
            onClick={() => {
              setForm(f => ({ ...f, carUrl: activeSite.url, name: user?.name ?? "", phone: user?.phone ?? "" }));
              setPurchaseOpen(true);
            }}
          >
            <ShoppingCart className="w-4 h-4" />
            طلب شراء عبر MARKLET
          </Button>
        </div>

        {/* Purchase request dialog */}
        <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
          <DialogContent className="max-w-lg mx-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                طلب شراء عبر MARKLET
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-sm text-primary">
                سيتواصل معك فريق MARKLET لمساعدتك في إتمام عملية الشراء من {activeSite.nameAr}.
              </div>
              <div className="space-y-2">
                <Label htmlFor="carUrl">رابط السيارة في المزاد</Label>
                <Input
                  id="carUrl"
                  placeholder="https://..."
                  value={form.carUrl}
                  onChange={e => setForm(f => ({ ...f, carUrl: e.target.value }))}
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">السعر الحالي</Label>
                <Input
                  id="price"
                  placeholder="مثال: $5,000"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="buyerName">الاسم الكامل *</Label>
                  <Input
                    id="buyerName"
                    placeholder="اسمك"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyerPhone">رقم الهاتف *</Label>
                  <Input
                    id="buyerPhone"
                    placeholder="+963..."
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    dir="ltr"
                    className="text-left"
                    type="tel"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات إضافية</Label>
                <Textarea
                  id="notes"
                  placeholder="أي تفاصيل إضافية تريد إضافتها..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleSubmitPurchase}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                إرسال الطلب
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const regions: { id: Region; labelAr: string; labelEn: string; emoji: string }[] = [
    { id: "arab",     labelAr: "مزادات عربية",   labelEn: "Arab Auctions",   emoji: "🇦🇪" },
    { id: "american", labelAr: "مزادات أمريكية",  labelEn: "US Auctions",     emoji: "🇺🇸" },
    { id: "korean",   labelAr: "مزادات كورية",   labelEn: "Korean Auctions", emoji: "🇰🇷" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ArrowIcon className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-lg leading-tight">🏁 المزادات العالمية</h1>
          <p className="text-xs text-muted-foreground">Global Auctions</p>
        </div>
        <Badge variant="outline" className="text-xs">تصفح فقط</Badge>
      </div>

      {/* Disclaimer */}
      <div className="mx-4 mt-4 rounded-xl bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-600 p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-sm font-medium text-amber-900 dark:text-amber-200 leading-relaxed">
          يعرض MARKLET المزادات العالمية للتصفح فقط.<br />
          عملية الشراء تتم مباشرة عبر موقع المزاد أو عبر فريق MARKLET عند طلب المساعدة.
        </p>
      </div>

      {/* Region sections */}
      <div className="px-4 mt-6 space-y-4">
        {regions.map(region => {
          const sites = sitesForRegion(region.id);
          const isOpen = activeRegion === region.id;
          const info = REGION_INFO[region.id];
          return (
            <div key={region.id} className="rounded-2xl border bg-card overflow-hidden">
              {/* Region header button */}
              <button
                className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                onClick={() => setActiveRegion(isOpen ? null : region.id)}
              >
                <span className="text-3xl">{region.emoji}</span>
                <div className="flex-1 text-start">
                  <div className="font-bold text-base">{region.labelAr}</div>
                  <div className="text-xs text-muted-foreground">{region.labelEn} · {sites.length} {sites.length === 1 ? "موقع" : "مواقع"}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${info.color}`}>
                  {sites.length}
                </span>
                {isOpen
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                }
              </button>

              {/* Sites list */}
              {isOpen && (
                <div className="border-t divide-y">
                  {sites.map(site => (
                    <button
                      key={site.id}
                      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-primary/5 transition-colors text-start"
                      onClick={() => openSite(site)}
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg shrink-0">
                        {site.flag}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{site.nameAr}</div>
                        <div className="text-xs text-muted-foreground">{site.description}</div>
                        <div className="text-xs text-primary mt-0.5">{site.nameEn}</div>
                      </div>
                      <div className="flex items-center gap-1 text-primary shrink-0">
                        <Globe className="w-4 h-4" />
                        <span className="text-xs font-medium">دخول</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info card */}
      <div className="mx-4 mt-6 rounded-2xl border bg-gradient-to-br from-primary/5 to-primary/10 p-5">
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-primary" />
          كيف يساعدك MARKLET؟
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">✓</span>
            تصفح المزادات العالمية مباشرة داخل التطبيق
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">✓</span>
            أرسل طلب شراء وسيتولى فريق MARKLET الباقي
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">✓</span>
            خبراؤنا يتحققون من حالة السيارة قبل الشراء
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">✓</span>
            نتولى الشحن والتخليص الجمركي إلى سوريا
          </li>
        </ul>
      </div>
    </div>
  );
}
