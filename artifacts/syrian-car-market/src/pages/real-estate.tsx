// UI_ID: REAL_ESTATE_01
// NAME: العقارات
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, MapPin, Building2, Bed, Ruler, Loader2, Eye } from "lucide-react";

import { useStartChat } from "@/hooks/use-start-chat";
import { MultiImageUpload } from "@/components/MultiImageUpload";
import { SYRIAN_PROVINCES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LISTING_TYPES = ["بيع", "إيجار"];
const SUB_CATEGORIES = ["شقق", "منازل وفيلات", "أراضي", "مكاتب", "محلات تجارية", "مستودعات", "استديو", "غرفة"];

type RealEstate = {
  id: number; sellerId: number; title: string; listingType: string; subCategory: string;
  price: string; area: string | null; rooms: number | null; province: string; city: string;
  images: string[] | null; isFeatured: boolean; viewCount: number; createdAt: string;
  sellerName: string | null;
};

type DetailedRealEstate = RealEstate & {
  bathrooms: number | null; floor: number | null; location: string | null;
  description: string | null; sellerPhone: string | null;
};

const RE_QK = (p: object) => ["real-estate", p];

const emptyForm = {
  title: "", listingType: "بيع", subCategory: "شقق",
  price: "", currency: "USD", area: "", rooms: "", bathrooms: "", floor: "",
  province: "", city: "", location: "", description: "", images: [] as string[],
};

export default function RealEstatePage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [filterType, setFilterType] = useState("__all__");
  const [filterSub, setFilterSub] = useState("__all__");
  const [filterProv, setFilterProv] = useState("__all__");
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<DetailedRealEstate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { startChat } = useStartChat();

  const activeType = filterType === "__all__" ? "" : filterType;
  const activeSub = filterSub === "__all__" ? "" : filterSub;
  const activeProv = filterProv === "__all__" ? "" : filterProv;
  const filters = { listingType: activeType, subCategory: activeSub, province: activeProv, q };
  const { data: listings = [], isLoading } = useQuery<RealEstate[]>({
    queryKey: RE_QK(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (activeType) params.set("listingType", activeType);
      if (activeSub) params.set("subCategory", activeSub);
      if (activeProv) params.set("province", activeProv);
      return apiRequest<RealEstate[]>(`/api/real-estate?${params}`);
    },
  });

  const { data: detailData, isLoading: detailLoading } = useQuery<DetailedRealEstate>({
    queryKey: ["real-estate-detail", detail?.id],
    queryFn: () => apiRequest<DetailedRealEstate>(`/api/real-estate/${detail?.id}`),
    enabled: !!detail?.id,
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => apiRequest("/api/real-estate", "POST", body),
    onSuccess: () => {
      toast({ title: "تم نشر إعلانك بنجاح" });
      setAddOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["real-estate"] });
    },
    onError: () => toast({ title: "فشل نشر الإعلان", variant: "destructive" }),
  });

  const f = (k: keyof typeof emptyForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!form.title || !form.price || !form.province || !form.city) {
      toast({ title: "يرجى تعبئة الحقول الإلزامية", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      title: form.title, listingType: form.listingType, subCategory: form.subCategory,
      price: `${form.price} ${form.currency}`, area: form.area || null,
      rooms: form.rooms ? Number(form.rooms) : null, bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
      floor: form.floor ? Number(form.floor) : null, province: form.province, city: form.city,
      location: form.location || null, description: form.description || null, images: form.images,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-lg">العقارات</h1>
          <Badge variant="secondary" className="mr-auto">{listings.length} إعلان</Badge>
          {user && (
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1">
              <Plus className="w-4 h-4" />أضف إعلان
            </Button>
          )}
        </div>
        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث في العقارات..."
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && setQ(search)}
            className="pr-9"
          />
        </div>
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 text-xs min-w-[90px]"><SelectValue placeholder="النوع" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">الكل</SelectItem>
              {LISTING_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterSub} onValueChange={setFilterSub}>
            <SelectTrigger className="h-8 text-xs min-w-[110px]"><SelectValue placeholder="الفئة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">الكل</SelectItem>
              {SUB_CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterProv} onValueChange={setFilterProv}>
            <SelectTrigger className="h-8 text-xs min-w-[110px]"><SelectValue placeholder="المحافظة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">الكل</SelectItem>
              {SYRIAN_PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          {(activeType || activeSub || activeProv || q) && (
            <Button variant="ghost" size="sm" className="h-8 text-xs shrink-0"
              onClick={() => { setFilterType("__all__"); setFilterSub("__all__"); setFilterProv("__all__"); setQ(""); setSearch(""); }}>
              مسح
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>لا توجد إعلانات عقارية حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {listings.map(item => (
              <RealEstateCard key={item.id} item={item} onOpen={() => setDetail(item)} />
            ))}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={open => !open && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          {detailLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : detailData ? (
            <div className="space-y-4">
              {detailData.images && detailData.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {detailData.images.map((img, i) => (
                    <img key={i} src={img} alt="" className="h-48 rounded-lg object-cover flex-shrink-0" />
                  ))}
                </div>
              )}
              <DialogHeader>
                <DialogTitle className="text-right text-lg">{detailData.title}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{detailData.listingType}</Badge>
                <Badge variant="secondary">{detailData.subCategory}</Badge>
              </div>
              <div className="text-2xl font-bold text-primary">{detailData.price}</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {detailData.area && <InfoRow icon={<Ruler className="w-4 h-4" />} label="المساحة" val={`${detailData.area} م²`} />}
                {detailData.rooms && <InfoRow icon={<Bed className="w-4 h-4" />} label="غرف" val={String(detailData.rooms)} />}
                {detailData.bathrooms && <InfoRow icon={<>🚿</>} label="حمامات" val={String(detailData.bathrooms)} />}
                {detailData.floor !== null && detailData.floor !== undefined && <InfoRow icon={<>🏢</>} label="الطابق" val={String(detailData.floor)} />}
                <InfoRow icon={<MapPin className="w-4 h-4" />} label="الموقع" val={`${detailData.province} - ${detailData.city}`} />
              </div>
              {detailData.description && (
                <div className="bg-muted/30 rounded-lg p-3 text-sm">{detailData.description}</div>
              )}
              <div className="border-t pt-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{detailData.sellerName || "البائع"}</p>
                  {detailData.sellerPhone && <p className="text-sm text-muted-foreground">{detailData.sellerPhone}</p>}
                </div>
                <div className="flex gap-2">
                  {detailData.sellerPhone && (
                    <a href={`tel:${detailData.sellerPhone}`}>
                      <Button size="sm" variant="outline">📞 اتصال</Button>
                    </a>
                  )}
                  {user && detailData.sellerId !== user.id && (
                    <Button size="sm" onClick={() => { startChat(detailData.sellerId); setDetail(null); }}>
                      💬 محادثة
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="text-right">نشر إعلان عقاري</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>العنوان *</Label>
              <Input placeholder="مثال: شقة للبيع في دمشق - المزة" value={form.title} onChange={e => f("title", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>نوع الإعلان *</Label>
                <Select value={form.listingType} onValueChange={v => f("listingType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LISTING_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>الفئة *</Label>
                <Select value={form.subCategory} onValueChange={v => f("subCategory", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SUB_CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label>السعر *</Label>
                <Input type="number" placeholder="السعر" value={form.price} onChange={e => f("price", e.target.value)} />
              </div>
              <div>
                <Label>العملة</Label>
                <Select value={form.currency} onValueChange={v => f("currency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="SYP">SYP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المساحة (م²)</Label>
                <Input type="number" placeholder="المساحة" value={form.area} onChange={e => f("area", e.target.value)} />
              </div>
              <div>
                <Label>عدد الغرف</Label>
                <Input type="number" placeholder="الغرف" value={form.rooms} onChange={e => f("rooms", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>عدد الحمامات</Label>
                <Input type="number" placeholder="الحمامات" value={form.bathrooms} onChange={e => f("bathrooms", e.target.value)} />
              </div>
              <div>
                <Label>رقم الطابق</Label>
                <Input type="number" placeholder="الطابق" value={form.floor} onChange={e => f("floor", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المحافظة *</Label>
                <Select value={form.province} onValueChange={v => f("province", v)}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{SYRIAN_PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>المدينة *</Label>
                <Input placeholder="المدينة أو الحي" value={form.city} onChange={e => f("city", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>تفاصيل الموقع</Label>
              <Input placeholder="مثال: قرب مسجد الروضة، شارع الثورة" value={form.location} onChange={e => f("location", e.target.value)} />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea placeholder="وصف تفصيلي للعقار..." value={form.description} onChange={e => f("description", e.target.value)} rows={3} />
            </div>
            <div>
              <Label>الصور</Label>
              <MultiImageUpload images={form.images} onChange={imgs => setForm(p => ({ ...p, images: imgs }))} />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              نشر الإعلان
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RealEstateCard({ item, onOpen }: { item: RealEstate; onOpen: () => void }) {
  const img = item.images?.[0];
  return (
    <div
      className={cn("bg-card border border-border/60 rounded-xl overflow-hidden cursor-pointer hover:border-primary/50 transition-colors", item.isFeatured && "border-yellow-500/50")}
      onClick={onOpen}
    >
      <div className="relative">
        {img ? (
          <img src={img} alt={item.title} className="w-full h-44 object-cover" />
        ) : (
          <div className="w-full h-44 bg-muted flex items-center justify-center">
            <Building2 className="w-12 h-12 opacity-30" />
          </div>
        )}
        {item.isFeatured && (
          <Badge className="absolute top-2 right-2 bg-yellow-500 text-black text-xs">مميز ⭐</Badge>
        )}
        <Badge className="absolute top-2 left-2 text-xs" variant="secondary">{item.listingType}</Badge>
      </div>
      <div className="p-3">
        <p className="font-semibold text-sm line-clamp-1 mb-1">{item.title}</p>
        <p className="text-primary font-bold mb-2">{item.price}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.province}</span>
          {item.area && <span className="flex items-center gap-1"><Ruler className="w-3 h-3" />{item.area} م²</span>}
          {item.rooms && <span className="flex items-center gap-1"><Bed className="w-3 h-3" />{item.rooms} غرف</span>}
          <span className="flex items-center gap-1 mr-auto"><Eye className="w-3 h-3" />{item.viewCount}</span>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, val }: { icon: React.ReactNode; label: string; val: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{val}</span>
    </div>
  );
}
