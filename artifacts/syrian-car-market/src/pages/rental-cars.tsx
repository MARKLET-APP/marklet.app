import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, MapPin, Trash2, Car, ShoppingCart, MessageCircle,
  DollarSign, Calendar, Phone, ImageIcon, Loader2, LogIn,
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

type RentalCar = {
  id: number; sellerId: number; brand: string; model: string;
  year: number | null; city: string | null;
  dailyPrice: number | null; weeklyPrice: number | null; monthlyPrice: number | null;
  description: string | null; images: string[] | null;
  createdAt: string; sellerName: string | null; sellerPhone: string | null;
};

type BuyRequest = {
  id: number; userId: number; brand: string | null; model: string | null;
  city: string | null; description: string | null;
  category: string | null; createdAt: string; userName: string | null;
};

const RENTAL_QK = ["rental-cars"];
const REQ_QK = ["buy-requests-rental"];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function RentalCarsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const [tab, setTab] = useState<"ads" | "requests">("ads");
  const [sellOpen, setSellOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const [sellForm, setSellForm] = useState({
    brand: "", model: "", year: "", city: "",
    dailyPrice: "", weeklyPrice: "", monthlyPrice: "",
    description: "",
  });

  const [reqForm, setReqForm] = useState({
    carType: "", city: "", startDate: "", endDate: "", description: "",
  });

  const { data: cars = [], isLoading } = useQuery<RentalCar[]>({
    queryKey: RENTAL_QK,
    queryFn: () => api.rentalCars.list() as Promise<RentalCar[]>,
  });

  const { data: requests = [], isLoading: reqLoading } = useQuery<BuyRequest[]>({
    queryKey: REQ_QK,
    queryFn: () => api.get("/api/buy-requests?category=rental").then((r) => r.json()),
  });

  const createSell = useMutation({
    mutationFn: (body: object) => api.rentalCars.create(body),
    onSuccess: (data: any) => {
      toast({ title: data.message ?? "تم نشر إعلان التأجير بنجاح" });
      setSellOpen(false);
      setSellForm({ brand: "", model: "", year: "", city: "", dailyPrice: "", weeklyPrice: "", monthlyPrice: "", description: "" });
      setUploadedImages([]);
      setPreviewImages([]);
      qc.invalidateQueries({ queryKey: RENTAL_QK });
    },
    onError: () => toast({ title: "حدث خطأ أثناء النشر", variant: "destructive" }),
  });

  const createRequest = useMutation({
    mutationFn: (body: object) => api.post("/api/buy-requests", body),
    onSuccess: () => {
      toast({ title: "تم نشر طلب الاستئجار بنجاح وهو بانتظار مراجعة الإدارة" });
      setReqOpen(false);
      setReqForm({ carType: "", city: "", startDate: "", endDate: "", description: "" });
      qc.invalidateQueries({ queryKey: REQ_QK });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const deleteCar = useMutation({
    mutationFn: (id: number) => api.rentalCars.delete(id),
    onSuccess: () => {
      toast({ title: "تم حذف الإعلان" });
      qc.invalidateQueries({ queryKey: RENTAL_QK });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingImages(true);
    const previews: string[] = [];
    files.forEach((f) => { const url = URL.createObjectURL(f); previews.push(url); });
    setPreviewImages((prev) => [...prev, ...previews]);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("image", file);
        const resp = await fetch(`${BASE}/api/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("scm_token")}` },
          body: fd,
        });
        const data = await resp.json();
        if (data.url) uploaded.push(data.url);
      }
      setUploadedImages((prev) => [...prev, ...uploaded]);
    } catch {
      toast({ title: "فشل رفع الصورة", variant: "destructive" });
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (idx: number) => {
    setPreviewImages((prev) => prev.filter((_, i) => i !== idx));
    setUploadedImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSellSubmit = () => {
    if (!user) {
      setSellOpen(false);
      navigate("/login");
      return;
    }
    if (!sellForm.brand || !sellForm.model) {
      toast({ title: "يرجى إدخال الشركة والموديل", variant: "destructive" });
      return;
    }
    if (!sellForm.dailyPrice && !sellForm.weeklyPrice && !sellForm.monthlyPrice) {
      toast({ title: "يرجى إدخال سعر واحد على الأقل", variant: "destructive" });
      return;
    }
    createSell.mutate({
      ...sellForm,
      year: sellForm.year ? Number(sellForm.year) : null,
      dailyPrice: sellForm.dailyPrice ? Number(sellForm.dailyPrice) : null,
      weeklyPrice: sellForm.weeklyPrice ? Number(sellForm.weeklyPrice) : null,
      monthlyPrice: sellForm.monthlyPrice ? Number(sellForm.monthlyPrice) : null,
      images: uploadedImages.length ? uploadedImages : null,
    });
  };

  const handleReqSubmit = () => {
    if (!user) {
      setReqOpen(false);
      navigate("/login");
      return;
    }
    if (!reqForm.carType) {
      toast({ title: "يرجى تحديد نوع السيارة", variant: "destructive" });
      return;
    }
    createRequest.mutate({
      brand: reqForm.carType,
      model: null,
      category: "rental",
      city: reqForm.city,
      description: [
        reqForm.description,
        reqForm.startDate ? `من: ${reqForm.startDate}` : "",
        reqForm.endDate ? `إلى: ${reqForm.endDate}` : "",
      ].filter(Boolean).join(" — "),
    });
  };

  const startChat = async (sellerId: number, initialMsg?: string) => {
    if (!user) { navigate("/login"); return; }
    if (user.id === sellerId) { toast({ title: "لا يمكنك مراسلة نفسك", variant: "destructive" }); return; }
    setStartingChat(true);
    try {
      const resp = await fetch(`${BASE}/api/chats/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("scm_token")}` },
        body: JSON.stringify({ sellerId, carId: null }),
      });
      if (!resp.ok) throw new Error();
      const data = await resp.json() as { id: number };
      const suffix = initialMsg ? `&initial=${encodeURIComponent(initialMsg)}` : "";
      navigate(`/messages?conversationId=${data.id}${suffix}`);
    } catch {
      toast({ title: "تعذّر فتح المحادثة", variant: "destructive" });
    } finally {
      setStartingChat(false);
    }
  };

  const formatPrice = (val: number | null, label: string) =>
    val ? `${val.toLocaleString()} $ ${label}` : null;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header + Action Buttons inside gradient */}
      <div className="relative overflow-hidden bg-gradient-to-l from-blue-600 to-blue-800 text-white px-4 pt-6 pb-5">
        <div className="header-watermark" style={{ backgroundImage: "url('/watermarks/rent-car.svg')" }} />
        <div className="relative z-[1] max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Car className="w-7 h-7" />
            <h1 className="text-2xl font-extrabold tracking-tight">سيارات للإيجار</h1>
          </div>
          <p className="text-blue-100 text-sm mb-4">استئجار السيارات بسهولة في سوريا</p>
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2 rounded-2xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm py-3 shadow-lg border-0"
              onClick={() => setSellOpen(true)}
            >
              <Plus className="w-5 h-5" /> نشر إعلان تأجير
            </Button>
            <Button
              className="flex-1 gap-2 rounded-2xl bg-blue-500/40 hover:bg-blue-500/60 text-white font-bold text-sm py-3 border border-white/40 shadow-sm"
              onClick={() => setReqOpen(true)}
            >
              <ShoppingCart className="w-5 h-5" /> طلب استئجار
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4">

        {/* Tabs */}
        <div className="flex border-b mb-5">
          <button
            className={cn("flex-1 pb-3 text-sm font-semibold transition-colors", tab === "ads" ? "text-blue-600 border-b-2 border-blue-600" : "text-muted-foreground")}
            onClick={() => setTab("ads")}
          >
            إعلانات التأجير {cars.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{cars.length}</Badge>}
          </button>
          <button
            className={cn("flex-1 pb-3 text-sm font-semibold transition-colors", tab === "requests" ? "text-blue-600 border-b-2 border-blue-600" : "text-muted-foreground")}
            onClick={() => setTab("requests")}
          >
            طلبات الاستئجار {requests.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{requests.length}</Badge>}
          </button>
        </div>

        {/* Rental Ads Tab */}
        {tab === "ads" && (
          <div className="space-y-4 pb-24">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
            ) : cars.length === 0 ? (
              <div className="bg-card border border-dashed rounded-2xl p-10 text-center text-muted-foreground shadow-sm">
                <Car className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">لا توجد إعلانات تأجير حالياً</p>
                <Button className="mt-4 bg-blue-600 hover:bg-blue-700 rounded-xl" onClick={() => { if (!user) navigate("/login"); else setSellOpen(true); }}>
                  انشر أول إعلان تأجير
                </Button>
              </div>
            ) : (
              cars.map((car) => (
                <div key={car.id} className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                  {/* Images */}
                  {car.images && car.images.length > 0 && (
                    <div className="relative h-48 overflow-hidden">
                      <img src={car.images[0]} alt={`${car.brand} ${car.model}`} className="w-full h-full object-cover" />
                      {car.images.length > 1 && (
                        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" /> {car.images.length}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-lg">{car.brand} {car.model}</h3>
                        {car.year && <p className="text-sm text-muted-foreground">{car.year}</p>}
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">للإيجار</Badge>
                    </div>

                    {/* Prices */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {[
                        formatPrice(car.dailyPrice, "/ يوم"),
                        formatPrice(car.weeklyPrice, "/ أسبوع"),
                        formatPrice(car.monthlyPrice, "/ شهر"),
                      ].filter(Boolean).map((p, i) => (
                        <div key={i} className="flex items-center gap-1 bg-green-50 text-green-700 rounded-xl px-3 py-1 text-sm font-semibold border border-green-100">
                          <DollarSign className="w-3.5 h-3.5" /> {p}
                        </div>
                      ))}
                    </div>

                    {car.city && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                        <MapPin className="w-3.5 h-3.5" /> {car.city}
                      </div>
                    )}
                    {car.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{car.description}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{car.sellerName}</span>
                      <div className="flex gap-2">
                        {user && user.id === car.sellerId && (
                          <Button size="sm" variant="outline" className="h-8 border-red-300 text-red-600 hover:bg-red-50 gap-1"
                            onClick={() => { if (confirm("حذف هذا الإعلان؟")) deleteCar.mutate(car.id); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {user && user.id !== car.sellerId && (
                          <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white gap-1"
                            onClick={() => startChat(car.sellerId, `مرحباً، أنا مهتم بتأجير ${[car.brand, car.model, car.year].filter(Boolean).join(" ")}. هل ما زالت متوفرة؟`)} disabled={startingChat}>
                            <MessageCircle className="w-3.5 h-3.5" /> مراسلة
                          </Button>
                        )}
                        {!user && (
                          <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white gap-1" onClick={() => navigate("/login")}>
                            <MessageCircle className="w-3.5 h-3.5" /> مراسلة
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Rental Requests Tab */}
        {tab === "requests" && (
          <div className="space-y-4 pb-24">
            {reqLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
            ) : requests.length === 0 ? (
              <div className="bg-card border border-dashed rounded-2xl p-10 text-center text-muted-foreground shadow-sm">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">لا توجد طلبات استئجار حالياً</p>
                <Button className="mt-4 bg-blue-600 hover:bg-blue-700 rounded-xl" onClick={() => { if (!user) navigate("/login"); else setReqOpen(true); }}>
                  انشر طلب استئجار
                </Button>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="bg-card border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                      <ShoppingCart className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-sm">{req.brand || "طلب استئجار"}</p>
                        <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 shrink-0">طلب استئجار</Badge>
                      </div>
                      {req.city && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="w-3 h-3" /> {req.city}
                        </div>
                      )}
                      {req.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{req.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 font-medium">{req.userName} · {new Date(req.createdAt).toLocaleDateString("ar-SY")}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-bold"
                    onClick={() => startChat(req.userId, `مرحباً، رأيت طلبك لاستئجار ${[req.brand, req.model].filter(Boolean).join(" ") || "سيارة"}. أنا أملك ما تبحث عنه!`)}
                    disabled={startingChat}
                  >
                    {startingChat ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
                    مراسلة صاحب الطلب
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Publish Rental Ad Dialog */}
      <Dialog open={sellOpen} onOpenChange={setSellOpen}>
        <DialogContent className="max-w-md rounded-3xl text-right max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Car className="w-5 h-5 text-blue-600" /> نشر إعلان تأجير سيارة
            </DialogTitle>
            <DialogDescription className="sr-only">نموذج نشر إعلان تأجير سيارة</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {!user && (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <LogIn className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-blue-800">يجب تسجيل الدخول أولاً</p>
                  <p className="text-blue-600 text-xs mt-0.5">سيتم إعادة توجيهك لتسجيل الدخول عند النشر</p>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs px-3"
                  onClick={() => { setSellOpen(false); navigate("/login"); }}>
                  دخول
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">الشركة *</label>
                <Input placeholder="مثال: تويوتا" value={sellForm.brand}
                  onChange={(e) => setSellForm((f) => ({ ...f, brand: e.target.value }))} className="rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">الموديل *</label>
                <Input placeholder="مثال: كامري" value={sellForm.model}
                  onChange={(e) => setSellForm((f) => ({ ...f, model: e.target.value }))} className="rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">سنة الصنع</label>
                <Input type="number" placeholder="2022" value={sellForm.year}
                  onChange={(e) => setSellForm((f) => ({ ...f, year: e.target.value }))} className="rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">المدينة</label>
                <Input placeholder="دمشق" value={sellForm.city}
                  onChange={(e) => setSellForm((f) => ({ ...f, city: e.target.value }))} className="rounded-xl" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-2 block text-muted-foreground">الأسعار بالدولار $ (ادخل واحداً على الأقل)</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs mb-1 block">اليومي</label>
                  <Input type="number" placeholder="50" value={sellForm.dailyPrice}
                    onChange={(e) => setSellForm((f) => ({ ...f, dailyPrice: e.target.value }))} className="rounded-xl" />
                </div>
                <div>
                  <label className="text-xs mb-1 block">الأسبوعي</label>
                  <Input type="number" placeholder="300" value={sellForm.weeklyPrice}
                    onChange={(e) => setSellForm((f) => ({ ...f, weeklyPrice: e.target.value }))} className="rounded-xl" />
                </div>
                <div>
                  <label className="text-xs mb-1 block">الشهري</label>
                  <Input type="number" placeholder="1000" value={sellForm.monthlyPrice}
                    onChange={(e) => setSellForm((f) => ({ ...f, monthlyPrice: e.target.value }))} className="rounded-xl" />
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">وصف السيارة</label>
              <textarea
                placeholder="أكواتشي، حالة ممتازة، مكيف، مشوار يومي..."
                value={sellForm.description}
                onChange={(e) => setSellForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="text-xs font-medium mb-2 block">صور السيارة</label>
              <label className="flex items-center gap-2 border-2 border-dashed border-muted-foreground/30 rounded-xl p-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{uploadingImages ? "جاري رفع الصور..." : "اضغط لرفع الصور"}</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImages} />
              </label>
              {previewImages.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {previewImages.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} className="w-16 h-16 object-cover rounded-xl border" />
                      <button onClick={() => removeImage(i)} className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSellSubmit}
              disabled={createSell.isPending || uploadingImages}
            >
              {createSell.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Plus className="w-4 h-4 ml-2" />}
              نشر إعلان التأجير
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rental Request Dialog */}
      <Dialog open={reqOpen} onOpenChange={setReqOpen}>
        <DialogContent className="max-w-md rounded-3xl text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <ShoppingCart className="w-5 h-5 text-blue-600" /> نشر طلب استئجار سيارة
            </DialogTitle>
            <DialogDescription className="sr-only">نموذج طلب استئجار سيارة</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {!user && (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <LogIn className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-blue-800">يجب تسجيل الدخول أولاً</p>
                  <p className="text-blue-600 text-xs mt-0.5">سيتم إعادة توجيهك لتسجيل الدخول عند الإرسال</p>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs px-3"
                  onClick={() => { setReqOpen(false); navigate("/login"); }}>
                  دخول
                </Button>
              </div>
            )}
            <div>
              <label className="text-xs font-medium mb-1 block">نوع السيارة المطلوب *</label>
              <Input placeholder="مثال: سيارة عائلية، SUV، سيدان" value={reqForm.carType}
                onChange={(e) => setReqForm((f) => ({ ...f, carType: e.target.value }))} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">المدينة</label>
              <Input placeholder="دمشق" value={reqForm.city}
                onChange={(e) => setReqForm((f) => ({ ...f, city: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block flex items-center gap-1"><Calendar className="w-3 h-3" /> من تاريخ</label>
                <Input type="date" value={reqForm.startDate}
                  onChange={(e) => setReqForm((f) => ({ ...f, startDate: e.target.value }))} className="rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block flex items-center gap-1"><Calendar className="w-3 h-3" /> إلى تاريخ</label>
                <Input type="date" value={reqForm.endDate}
                  onChange={(e) => setReqForm((f) => ({ ...f, endDate: e.target.value }))} className="rounded-xl" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">تفاصيل الطلب</label>
              <textarea
                placeholder="أي تفاصيل إضافية..."
                value={reqForm.description}
                onChange={(e) => setReqForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
            </div>
            <Button
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleReqSubmit}
              disabled={createRequest.isPending}
            >
              {createRequest.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <ShoppingCart className="w-4 h-4 ml-2" />}
              نشر طلب الاستئجار
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
