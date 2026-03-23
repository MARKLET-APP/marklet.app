import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { withApi } from "@/lib/runtimeConfig";
import { CarCard } from "@/components/CarCard";
import { ContactButtons } from "@/components/ContactButtons";
import { Car, Wrench, Trash2, CalendarDays, Filter, SlidersHorizontal, Search as SearchIcon, X, Plus, ShoppingCart, MapPin, Tag, History, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";

// ─── Search History ──────────────────────────────────────────────────────────
const HISTORY_KEY = "marklet_search_history";
const MAX_HISTORY = 12;

function useSearchHistory() {
  const [history, setHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); }
    catch { return []; }
  });

  const addSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    setHistory(prev => {
      const next = [trimmed, ...prev.filter(h => h !== trimmed)].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeSearch = useCallback((q: string) => {
    setHistory(prev => {
      const next = prev.filter(h => h !== q);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  return { history, addSearch, removeSearch, clearHistory };
}

type ListingType = "all" | "car" | "rental" | "part" | "junk";

type UnifiedResult = {
  id: number;
  _type: "car" | "motorcycle" | "plates" | "rental" | "part" | "junk";
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number | null;
  city?: string;
  images?: string[];
  description?: string;
  condition?: string;
  saleType?: string;
  category?: string;
  dailyPrice?: number | null;
  name?: string;
  sellerName?: string;
  sellerPhone?: string | null;
  sellerId?: number | null;
};

const TYPE_TABS: { key: ListingType; label: string; icon: any; color: string }[] = [
  { key: "all",    label: "الكل",         icon: SearchIcon,   color: "bg-primary text-white" },
  { key: "car",    label: "سيارات",       icon: Car,          color: "bg-blue-500 text-white" },
  { key: "rental", label: "إيجار",        icon: CalendarDays, color: "bg-purple-500 text-white" },
  { key: "part",   label: "قطع غيار",    icon: Wrench,       color: "bg-orange-500 text-white" },
  { key: "junk",   label: "خردة",         icon: Trash2,       color: "bg-gray-500 text-white" },
];

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  car:        { label: "سيارة للبيع",    color: "bg-blue-100 text-blue-700" },
  motorcycle: { label: "دراجة نارية",   color: "bg-indigo-100 text-indigo-700" },
  plates:     { label: "لوحة ترخيص",    color: "bg-pink-100 text-pink-700" },
  rental:     { label: "إيجار",          color: "bg-purple-100 text-purple-700" },
  part:       { label: "قطعة غيار",     color: "bg-orange-100 text-orange-700" },
  junk:       { label: "خردة",           color: "bg-gray-100 text-gray-700" },
};

function getImage(item: UnifiedResult): string | null {
  const imgs = item.images;
  if (!imgs || imgs.length === 0) return null;
  const first = imgs[0];
  if (!first) return null;
  if (first.startsWith("http") || first.startsWith("/")) return first;
  return first;
}

function getTitle(item: UnifiedResult): string {
  if (item._type === "part") return item.name || item.title || "قطعة غيار";
  if (item._type === "junk") return item.title || `${item.brand || ""} ${item.model || ""}`.trim() || "سيارة خردة";
  if (item._type === "rental") return `${item.brand || ""} ${item.model || ""} ${item.year || ""}`.trim() || "سيارة للإيجار";
  return item.title || `${item.brand || ""} ${item.model || ""} ${item.year || ""}`.trim() || "إعلان";
}

function getPrice(item: UnifiedResult): string {
  if (item._type === "rental") {
    return item.dailyPrice ? `${item.dailyPrice.toLocaleString()} $ / يوم` : "تواصل للسعر";
  }
  return item.price ? `${item.price.toLocaleString()} $` : "تواصل للسعر";
}


// ─── FilterPanel: MUST be outside SearchPage to avoid unmount on every render ───
type Filters = {
  brand: string; minYear: string; maxYear: string; minPrice: string;
  maxPrice: string; province: string; saleType: string; category: string; condition: string;
};
function FilterPanel({ filters, onChange, onClear }: {
  filters: Filters;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-bold text-foreground">الماركة</label>
        <select name="brand" value={filters.brand} onChange={onChange} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary transition-all outline-none">
          <option value="">الكل</option>
          <option value="Toyota">تويوتا (Toyota)</option>
          <option value="Hyundai">هيونداي (Hyundai)</option>
          <option value="Kia">كيا (Kia)</option>
          <option value="BMW">بي ام دبليو (BMW)</option>
          <option value="Mercedes">مرسيدس (Mercedes)</option>
          <option value="Honda">هوندا (Honda)</option>
          <option value="Nissan">نيسان (Nissan)</option>
          <option value="Audi">أودي (Audi)</option>
          <option value="Chevrolet">شيفروليه (Chevrolet)</option>
          <option value="Mitsubishi">ميتسوبيشي (Mitsubishi)</option>
          <option value="Mazda">مازدا (Mazda)</option>
          <option value="Volkswagen">فولكسفاغن (Volkswagen)</option>
          <option value="Lada">لادا (Lada)</option>
          <option value="Suzuki">سوزوكي (Suzuki)</option>
          <option value="Renault">رينو (Renault)</option>
          <option value="Peugeot">بيجو (Peugeot)</option>
        </select>
      </div>
      <div className="space-y-3">
        <label className="text-sm font-bold text-foreground">سنة الصنع</label>
        <div className="flex gap-2">
          <input type="text" inputMode="numeric" pattern="[0-9]*" name="minYear" placeholder="من" value={filters.minYear} onChange={onChange} autoComplete="off" className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary outline-none" />
          <input type="text" inputMode="numeric" pattern="[0-9]*" name="maxYear" placeholder="إلى" value={filters.maxYear} onChange={onChange} autoComplete="off" className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary outline-none" />
        </div>
      </div>
      <div className="space-y-3">
        <label className="text-sm font-bold text-foreground">السعر ($)</label>
        <div className="flex gap-2">
          <input type="text" inputMode="numeric" pattern="[0-9]*" name="minPrice" placeholder="من" value={filters.minPrice} onChange={onChange} autoComplete="off" className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary outline-none" />
          <input type="text" inputMode="numeric" pattern="[0-9]*" name="maxPrice" placeholder="إلى" value={filters.maxPrice} onChange={onChange} autoComplete="off" className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary outline-none" />
        </div>
      </div>
      <div className="space-y-3">
        <label className="text-sm font-bold text-foreground">المحافظة</label>
        <select name="province" value={filters.province} onChange={onChange} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary transition-all outline-none">
          <option value="">الكل</option>
          <option value="Damascus">دمشق</option>
          <option value="Aleppo">حلب</option>
          <option value="Homs">حمص</option>
          <option value="Lattakia">اللاذقية</option>
          <option value="Hama">حماة</option>
          <option value="Deir ez-Zor">دير الزور</option>
          <option value="Tartus">طرطوس</option>
          <option value="Idlib">إدلب</option>
        </select>
      </div>
      <Button variant="outline" onClick={onClear} className="w-full rounded-xl">
        <X className="w-4 h-4 ml-2" /> مسح الفلاتر
      </Button>
    </div>
  );
}

function UnifiedCard({ item, onClick }: { item: UnifiedResult; onClick?: () => void }) {
  const badge = TYPE_BADGE[item._type] ?? { label: item._type, color: "bg-muted text-muted-foreground" };
  const img = getImage(item);
  const title = getTitle(item);
  const price = getPrice(item);
  const isCar = item._type === "car" || item._type === "motorcycle" || item._type === "plates";

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col"
    >
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {img ? (
          <img src={img} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            {item._type === "part" ? <Wrench className="w-12 h-12 opacity-30" /> :
             item._type === "junk" ? <Trash2 className="w-12 h-12 opacity-30" /> :
             item._type === "rental" ? <CalendarDays className="w-12 h-12 opacity-30" /> :
             <Car className="w-12 h-12 opacity-30" />}
          </div>
        )}
        <span className={`absolute top-2 end-2 text-xs font-bold px-2.5 py-1 rounded-full ${badge.color}`}>
          {badge.label}
        </span>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-bold text-foreground text-sm line-clamp-2 leading-snug">{title}</h3>
        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="font-extrabold text-primary text-base">{price}</span>
          {item.city && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />{item.city}
            </span>
          )}
        </div>
        {item.condition && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Tag className="w-3 h-3" />{item.condition === "new" ? "جديد" : item.condition === "used" ? "مستعمل" : item.condition}
          </span>
        )}

        <div onClick={e => e.stopPropagation()} className="mt-1">
          <ContactButtons
            phone={isCar ? null : item.sellerPhone}
            sellerId={item.sellerId}
            listingId={item.id}
            size="sm"
            eligibleNavigateUrl={isCar ? `/cars/${item.id}` : undefined}
          />
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const { history, addSearch, removeSearch, clearHistory } = useSearchHistory();
  const [showHistory, setShowHistory] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const historyDropdownRef = useRef<HTMLDivElement>(null);

  const getInitialFilters = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      brand:     params.get("brand")    ?? "",
      minYear:   params.get("minYear")  ?? "",
      maxYear:   params.get("maxYear")  ?? "",
      minPrice:  params.get("minPrice") ?? "",
      maxPrice:  params.get("maxPrice") ?? "",
      province:  params.get("province") ?? "",
      saleType:  params.get("saleType") ?? "",
      category:  params.get("category") ?? "",
      condition: params.get("condition") ?? "",
    };
  };

  const getInitialSearch   = () => new URLSearchParams(window.location.search).get("q") ?? "";
  const getInitialType     = (): ListingType => {
    const t = new URLSearchParams(window.location.search).get("type") as ListingType;
    return TYPE_TABS.some(tab => tab.key === t) ? t : "all";
  };

  const [searchText, setSearchText]   = useState(getInitialSearch);
  const [filters, setFilters]         = useState(getInitialFilters);
  const [listingType, setListingType] = useState<ListingType>(getInitialType);
  const [results, setResults]         = useState<UnifiedResult[]>([]);
  const [isLoading, setIsLoading]     = useState(true);

  const [buyOpen, setBuyOpen]             = useState(false);
  const [buySubmitting, setBuySubmitting] = useState(false);
  const [buyForm, setBuyForm]             = useState({ brand: "", model: "", year: "", maxPrice: "", city: "", description: "" });

  useEffect(() => {
    setFilters(getInitialFilters());
    setSearchText(getInitialSearch());
    setListingType(getInitialType());
  }, [location]);

  // حفظ البحث تلقائياً بعد 1.5 ث من توقف الكتابة
  useEffect(() => {
    if (searchText.trim().length < 2) return;
    const timer = setTimeout(() => addSearch(searchText), 1500);
    return () => clearTimeout(timer);
  }, [searchText, addSearch]);

  // إغلاق الـ dropdown عند الضغط خارجه
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        historyDropdownRef.current &&
        !historyDropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowHistory(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (searchText.trim()) params.set("q", searchText.trim());
    if (filters.brand)     params.set("brand",    filters.brand);
    if (filters.minYear)   params.set("minYear",  filters.minYear);
    if (filters.maxYear)   params.set("maxYear",  filters.maxYear);
    if (filters.minPrice)  params.set("minPrice", filters.minPrice);
    if (filters.maxPrice)  params.set("maxPrice", filters.maxPrice);
    if (filters.province)  params.set("province", filters.province);

    const typeForApi = listingType === "all"
      ? (filters.category === "motorcycle" ? "motorcycle" : filters.category === "plates" ? "plates" : "all")
      : listingType;
    params.set("type", typeForApi);
    params.set("limit", "120");

    const token = localStorage.getItem("scm_token");
    fetch(withApi(`/api/search?${params.toString()}`), {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then(r => r.json())
      .then((data: any) => setResults(data.results ?? []))
      .catch(() => setResults([]))
      .finally(() => setIsLoading(false));
  }, [filters, listingType, searchText]);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target; // Capture before async setState
    setFilters(prev => ({ ...prev, [name]: value }));
  }, []);

  const clearAll = () => {
    setSearchText("");
    setListingType("all");
    setFilters({ brand: "", minYear: "", maxYear: "", minPrice: "", maxPrice: "", province: "", saleType: "", category: "", condition: "" });
  };

  const handleBuySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    setBuySubmitting(true);
    try {
      await api.post("/api/buy-requests", {
        brand:       buyForm.brand,
        model:       buyForm.model,
        year:        buyForm.year ? Number(buyForm.year) : undefined,
        maxPrice:    buyForm.maxPrice ? Number(buyForm.maxPrice) : undefined,
        city:        buyForm.city,
        description: buyForm.description,
        category:    listingType === "all" ? "cars" : listingType,
      });
      toast({ title: "تم إرسال طلب الشراء بنجاح" });
      setBuyOpen(false);
      setBuyForm({ brand: "", model: "", year: "", maxPrice: "", city: "", description: "" });
    } catch {
      toast({ title: "فشل إرسال الطلب", variant: "destructive" });
    } finally {
      setBuySubmitting(false);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: results.length };
    results.forEach(r => { c[r._type] = (c[r._type] ?? 0) + 1; });
    c.car = (c.car ?? 0) + (c.motorcycle ?? 0) + (c.plates ?? 0);
    return c;
  }, [results]);


  return (
    <div className="py-6 px-4 flex gap-8 max-w-7xl mx-auto w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-24 bg-card rounded-2xl border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6 text-primary">
            <Filter className="w-5 h-5" />
            <h2 className="text-xl font-bold">تصفية النتائج</h2>
          </div>
          <FilterPanel filters={filters} onChange={handleFilterChange} onClear={clearAll} />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Search bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <SearchIcon className="absolute end-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onFocus={() => setShowHistory(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchText.trim().length >= 2) {
                  addSearch(searchText);
                  setShowHistory(false);
                }
                if (e.key === "Escape") setShowHistory(false);
              }}
              placeholder="ابحث في جميع الخدمات..."
              className="w-full bg-card border-2 border-border rounded-xl py-3 pe-12 ps-4 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-foreground"
              autoComplete="off"
            />
            {searchText && (
              <button onClick={() => { setSearchText(""); searchInputRef.current?.focus(); }} className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}

            {/* ── History Dropdown ─────────────────────────────────── */}
            {showHistory && history.length > 0 && (
              <div
                ref={historyDropdownRef}
                className="absolute top-full end-0 start-0 mt-1.5 bg-card border-2 border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    عمليات البحث السابقة
                  </div>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); clearHistory(); }}
                    className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                  >
                    مسح الكل
                  </button>
                </div>
                <ul className="max-h-72 overflow-y-auto">
                  {history.map((item, idx) => (
                    <li key={idx} className="flex items-center group hover:bg-muted/40 transition-colors">
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSearchText(item);
                          setShowHistory(false);
                          addSearch(item);
                        }}
                        className="flex-1 flex items-center gap-3 px-4 py-2.5 text-right"
                      >
                        <History className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground truncate">{item}</span>
                      </button>
                      <button
                        onMouseDown={(e) => { e.preventDefault(); removeSearch(item); }}
                        className="px-3 py-2.5 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="حذف"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden shrink-0 h-12 px-4 rounded-xl border-2">
                <SlidersHorizontal className="w-5 h-5 ms-2" />
                تصفية
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] overflow-y-auto">
              <SheetHeader className="mb-6">
                <SheetTitle className="text-right">تصفية النتائج</SheetTitle>
              </SheetHeader>
              <FilterPanel filters={filters} onChange={handleFilterChange} onClear={clearAll} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Type Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
          {TYPE_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = listingType === tab.key;
            const count = tab.key === "all" ? results.length : counts[tab.key] ?? 0;
            return (
              <button
                key={tab.key}
                onClick={() => setListingType(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? tab.color + " shadow-md"
                    : "bg-card border border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isActive ? "bg-white/20" : "bg-muted"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-muted-foreground text-sm font-medium">
            {isLoading ? "جاري البحث..." : `${results.length} نتيجة`}
          </p>
          <div className="flex gap-2">
            {user && (
              <Button size="sm" onClick={() => navigate("/add-listing")} className="gap-1.5 rounded-xl text-xs h-8">
                <Plus className="w-3.5 h-3.5" /> نشر إعلان
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => { if (!user) { navigate("/login"); return; } setBuyOpen(true); }}
              className="gap-1.5 rounded-xl text-xs h-8 border-amber-400 text-amber-600 hover:bg-amber-50"
            >
              <ShoppingCart className="w-3.5 h-3.5" /> طلب شراء
            </Button>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-2xl border border-dashed">
            <SearchIcon className="w-16 h-16 text-muted mb-4 opacity-30" />
            <h3 className="text-xl font-bold text-foreground mb-2">لم نجد نتائج مطابقة</h3>
            <p className="text-muted-foreground mb-6">جرب تغيير كلمة البحث أو تقليل الفلاتر</p>
            <Button variant="outline" onClick={clearAll} className="rounded-xl">مسح الفلاتر</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {results.map(item => {
              if (item._type === "car" || item._type === "motorcycle" || item._type === "plates") {
                return <CarCard key={`car-${item.id}`} car={item as any} />;
              }
              return (
                <UnifiedCard
                  key={`${item._type}-${item.id}`}
                  item={item}
                  onClick={() => {
                    if (item._type === "rental") navigate(`/rental-cars`);
                    else if (item._type === "part") navigate(`/car-parts`);
                    else if (item._type === "junk") navigate(`/junk-cars`);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Buy Request Dialog */}
      <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">نشر طلب شراء</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBuySubmit} className="space-y-3 mt-2" autoComplete="off">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">الماركة</label>
                <Input value={buyForm.brand} onChange={e => { const v = e.target.value; setBuyForm(f => ({ ...f, brand: v })); }} placeholder="مثال: تويوتا" autoComplete="off" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">الموديل</label>
                <Input value={buyForm.model} onChange={e => { const v = e.target.value; setBuyForm(f => ({ ...f, model: v })); }} placeholder="مثال: كورولا" autoComplete="off" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">سنة الصنع</label>
                <Input type="text" inputMode="numeric" pattern="[0-9]*" value={buyForm.year} onChange={e => { const v = e.target.value; setBuyForm(f => ({ ...f, year: v })); }} placeholder="مثال: 2020" autoComplete="off" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">الحد الأقصى للسعر ($)</label>
                <Input type="text" inputMode="numeric" pattern="[0-9]*" value={buyForm.maxPrice} onChange={e => { const v = e.target.value; setBuyForm(f => ({ ...f, maxPrice: v })); }} placeholder="مثال: 15000" autoComplete="off" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">المدينة / المحافظة</label>
              <Input value={buyForm.city} onChange={e => { const v = e.target.value; setBuyForm(f => ({ ...f, city: v })); }} placeholder="مثال: دمشق" autoComplete="off" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">تفاصيل إضافية</label>
              <textarea
                value={buyForm.description}
                onChange={e => { const v = e.target.value; setBuyForm(f => ({ ...f, description: v })); }}
                placeholder="أي مواصفات أو متطلبات خاصة..."
                rows={3}
                className="w-full rounded-xl border-2 border-border bg-background px-3 py-2 text-sm focus:border-primary outline-none resize-none"
              />
            </div>
            <Button type="submit" disabled={buySubmitting} className="w-full rounded-xl gap-2">
              <ShoppingCart className="w-4 h-4" />
              {buySubmitting ? "جارٍ الإرسال..." : "إرسال طلب الشراء"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
