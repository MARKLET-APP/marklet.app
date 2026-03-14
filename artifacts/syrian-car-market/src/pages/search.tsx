import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { CarCard } from "@/components/CarCard";
import { Filter, SlidersHorizontal, Search as SearchIcon, X, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";

type Car = any;

const SALE_TYPE_LABELS: Record<string, string> = {
  rental: "سيارات للإيجار",
  sale: "سيارات للبيع",
};

const CONDITION_LABELS: Record<string, string> = {
  new: "سيارات جديدة",
  used: "سيارات مستعملة",
};

const CATEGORY_LABELS: Record<string, string> = {
  motorcycle: "دراجات نارية",
  plates: "أرقام اللوحات",
  cars: "سيارات",
};

function getPageTitle(saleType: string, category: string, condition: string) {
  if (condition && CONDITION_LABELS[condition]) return CONDITION_LABELS[condition];
  if (category && CATEGORY_LABELS[category]) return CATEGORY_LABELS[category];
  if (saleType && SALE_TYPE_LABELS[saleType]) return SALE_TYPE_LABELS[saleType];
  return "نتائج البحث";
}

function getResultLabel(category: string, condition: string) {
  if (category === "motorcycle") return "دراجة";
  return "سيارة";
}

function getBuyRequestCategory(category: string, condition: string, saleType: string) {
  if (category === "motorcycle") return "motorcycle";
  if (saleType === "rental") return "rental";
  return "cars";
}

export default function SearchPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const getInitialFilters = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      brand: params.get("brand") ?? "",
      minYear: params.get("minYear") ?? "",
      maxYear: params.get("maxYear") ?? "",
      minPrice: params.get("minPrice") ?? "",
      maxPrice: params.get("maxPrice") ?? "",
      city: params.get("city") ?? "",
      saleType: params.get("saleType") ?? "",
      category: params.get("category") ?? "",
      condition: params.get("condition") ?? "",
    };
  };

  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState(getInitialFilters);
  const [cars, setCars] = useState<Car[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [buyOpen, setBuyOpen] = useState(false);
  const [buySubmitting, setBuySubmitting] = useState(false);
  const [buyForm, setBuyForm] = useState({ brand: "", model: "", year: "", maxPrice: "", city: "", description: "" });

  useEffect(() => {
    setFilters(getInitialFilters());
  }, [location]);

  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (filters.brand) params.set("brand", filters.brand);
    if (filters.minYear) params.set("minYear", filters.minYear);
    if (filters.maxYear) params.set("maxYear", filters.maxYear);
    if (filters.minPrice) params.set("minPrice", filters.minPrice);
    if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
    if (filters.city) params.set("city", filters.city);
    if (filters.saleType) params.set("saleType", filters.saleType);
    if (filters.category) params.set("category", filters.category);
    if (filters.condition) params.set("condition", filters.condition);
    params.set("limit", "100");

    const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
    const token = localStorage.getItem("scm_token");
    fetch(`${BASE}/api/cars?${params.toString()}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then(r => r.json())
      .then((data: any) => setCars(data.cars ?? []))
      .catch(() => setCars([]))
      .finally(() => setIsLoading(false));
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const clearAll = () => {
    setSearchText("");
    setFilters({ brand: "", minYear: "", maxYear: "", minPrice: "", maxPrice: "", city: "", saleType: "", category: "", condition: "" });
  };

  const handleBuySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    setBuySubmitting(true);
    try {
      const cat = getBuyRequestCategory(filters.category, filters.condition, filters.saleType);
      await api.post("/api/buy-requests", {
        brand: buyForm.brand,
        model: buyForm.model,
        year: buyForm.year ? Number(buyForm.year) : undefined,
        maxPrice: buyForm.maxPrice ? Number(buyForm.maxPrice) : undefined,
        city: buyForm.city,
        description: buyForm.description,
        category: cat,
        condition: filters.condition || undefined,
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

  const filteredCars = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return cars;
    return cars.filter((car: Car) =>
      car.brand?.toLowerCase().includes(q) ||
      car.model?.toLowerCase().includes(q) ||
      car.title?.toLowerCase().includes(q) ||
      car.description?.toLowerCase().includes(q)
    );
  }, [cars, searchText]);

  const condition = filters.condition ?? "";
  const pageTitle = getPageTitle(filters.saleType, filters.category, condition);
  const hasActiveFilter = filters.saleType || filters.category || condition;

  const showActionButtons = condition === "new" || condition === "used" || filters.category === "motorcycle";
  const FilterContent = () => (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-bold text-foreground">الماركة</label>
        <select name="brand" value={filters.brand} onChange={handleFilterChange} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none">
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
        </select>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-bold text-foreground">سنة الصنع</label>
        <div className="flex gap-2">
          <input type="number" name="minYear" placeholder="من" value={filters.minYear} onChange={handleFilterChange} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary outline-none" />
          <input type="number" name="maxYear" placeholder="إلى" value={filters.maxYear} onChange={handleFilterChange} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary outline-none" />
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-bold text-foreground">السعر ($)</label>
        <div className="flex gap-2">
          <input type="number" name="minPrice" placeholder="من" value={filters.minPrice} onChange={handleFilterChange} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary outline-none" />
          <input type="number" name="maxPrice" placeholder="إلى" value={filters.maxPrice} onChange={handleFilterChange} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary outline-none" />
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-bold text-foreground">المحافظة</label>
        <select name="city" value={filters.city} onChange={handleFilterChange} className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary transition-all outline-none">
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

      <Button variant="outline" onClick={clearAll} className="w-full rounded-xl">
        <X className="w-4 h-4 ml-2" /> مسح الفلاتر
      </Button>
    </div>
  );

  return (
    <div className="py-6 px-4 flex gap-8 max-w-7xl mx-auto w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-24 bg-card rounded-2xl border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6 text-primary">
            <Filter className="w-5 h-5" />
            <h2 className="text-xl font-bold">تصفية النتائج</h2>
          </div>
          <FilterContent />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Page title + action buttons */}
        {hasActiveFilter && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-2xl font-extrabold text-foreground">{pageTitle}</h1>
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground gap-1 rounded-xl">
                <X className="w-4 h-4" /> مسح
              </Button>
            </div>

            {/* Buy / Sell action buttons */}
            {showActionButtons && (
              <div className="flex gap-3">
                {user && (
                  <Button
                    onClick={() => navigate("/add-listing")}
                    className="flex-1 gap-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    نشر إعلان بيع
                  </Button>
                )}
                <Button
                  onClick={() => {
                    if (!user) { navigate("/login"); return; }
                    setBuyOpen(true);
                  }}
                  variant="outline"
                  className="flex-1 gap-2 rounded-xl border-2 border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-bold"
                >
                  <ShoppingCart className="w-4 h-4" />
                  طلب شراء
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Search + filter toggle */}
        <div className="flex items-center gap-4 mb-5">
          <div className="flex-1 relative">
            <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="ابحث بالماركة، الموديل، أو الوصف..."
              className="w-full bg-card border-2 border-border rounded-xl py-3 pr-12 pl-4 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-foreground"
            />
            {searchText && (
              <button onClick={() => setSearchText("")} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile Filter Toggle */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden shrink-0 h-12 px-4 rounded-xl border-2">
                <SlidersHorizontal className="w-5 h-5 ml-2" />
                تصفية
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] overflow-y-auto">
              <SheetHeader className="mb-6">
                <SheetTitle className="text-right">تصفية النتائج</SheetTitle>
              </SheetHeader>
              <FilterContent />
            </SheetContent>
          </Sheet>
        </div>

        {/* Results count */}
        <div className="mb-4 text-muted-foreground font-medium text-sm">
          {isLoading ? "جاري البحث..." : `تم العثور على ${filteredCars.length} ${getResultLabel(filters.category, condition)}`}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>
        ) : filteredCars.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-2xl border border-dashed">
            <SearchIcon className="w-16 h-16 text-muted mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">لم نجد نتائج مطابقة</h3>
            <p className="text-muted-foreground mb-6">جرب تغيير خيارات البحث أو تقليل الفلاتر المستخدمة</p>
            {showActionButtons && (
              <div className="flex gap-3 flex-wrap justify-center">
                {user && (
                  <Button onClick={() => navigate("/add-listing")} className="gap-2 rounded-xl">
                    <Plus className="w-4 h-4" /> أضف أول إعلان
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!user) { navigate("/login"); return; }
                    setBuyOpen(true);
                  }}
                  className="gap-2 rounded-xl border-2 border-amber-400 text-amber-600"
                >
                  <ShoppingCart className="w-4 h-4" /> اطلب شراء
                </Button>
              </div>
            )}
            {!showActionButtons && (
              <Button variant="outline" onClick={clearAll} className="rounded-xl">مسح الفلاتر</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCars.map((car: Car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        )}
      </div>

      {/* Buy Request Dialog */}
      <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              طلب شراء – {pageTitle}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBuySubmit} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">الماركة</label>
                <Input
                  value={buyForm.brand}
                  onChange={e => setBuyForm(f => ({ ...f, brand: e.target.value }))}
                  placeholder="مثال: تويوتا"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">الموديل</label>
                <Input
                  value={buyForm.model}
                  onChange={e => setBuyForm(f => ({ ...f, model: e.target.value }))}
                  placeholder="مثال: كورولا"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">سنة الصنع</label>
                <Input
                  type="number"
                  value={buyForm.year}
                  onChange={e => setBuyForm(f => ({ ...f, year: e.target.value }))}
                  placeholder="مثال: 2020"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">الحد الأقصى للسعر ($)</label>
                <Input
                  type="number"
                  value={buyForm.maxPrice}
                  onChange={e => setBuyForm(f => ({ ...f, maxPrice: e.target.value }))}
                  placeholder="مثال: 15000"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">المدينة / المحافظة</label>
              <Input
                value={buyForm.city}
                onChange={e => setBuyForm(f => ({ ...f, city: e.target.value }))}
                placeholder="مثال: دمشق"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">تفاصيل إضافية</label>
              <textarea
                value={buyForm.description}
                onChange={e => setBuyForm(f => ({ ...f, description: e.target.value }))}
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
