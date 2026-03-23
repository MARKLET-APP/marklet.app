import { useState, useRef } from "react";
import { useAuthStore } from "@/lib/auth";
import { API_BASE, withApi } from "@/lib/runtimeConfig";
import {
  useGetUser,
  useListCars,
  useGetUserReviews
} from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Redirect, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CarCard } from "@/components/CarCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  User, MapPin, Phone, ShieldCheck, Star,
  Settings, LogOut, Loader2, Edit3, Mail, Camera,
  Store, Building2, Upload, Check, X, ShoppingCart, DollarSign, Trash2, Sparkles, Crown, Lock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API = `${API_BASE}/api`;

function getAvatarUrl(profilePhoto?: string | null, name?: string, email?: string) {
  if (profilePhoto) return profilePhoto;
  const display = name || email || "User";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(display)}&background=16a34a&color=fff&size=200&bold=true`;
}

export default function Profile() {
  const { user, isHydrated, logout } = useAuthStore();
  const { toast } = useToast();
  const token = typeof window !== "undefined" ? localStorage.getItem("scm_token") : null;
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    province: user?.province || "",
    city: user?.city || "",
    showroomName: (user as any)?.showroomName || "",
    showroomAddress: (user as any)?.showroomAddress || "",
    showroomPhone: (user as any)?.showroomPhone || "",
  });

  const { data: profileData, isLoading: loadingProfile, refetch: refetchProfile } = useGetUser(user?.id || 0, {
    query: { enabled: !!user?.id }
  });

  const { data: userCars, isLoading: loadingCars } = useListCars(
    { sellerId: user?.id },
    { query: { enabled: !!user?.id } }
  );

  const { data: reviews, isLoading: loadingReviews } = useGetUserReviews(user?.id || 0, {
    query: { enabled: !!user?.id }
  });

  const qc = useQueryClient();
  const { data: myBuyRequests = [], isLoading: loadingBuyRequests } = useQuery<any[]>({
    queryKey: ["my-buy-requests", user?.id],
    queryFn: async () => {
      const token = localStorage.getItem("scm_token");
      const r = await fetch(withApi("/api/buy-requests"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data.filter((r: any) => r.userId === user?.id) : [];
    },
    enabled: !!user?.id,
  });

  const deleteBuyRequestMutation = useMutation({
    mutationFn: (id: number) => api.buyRequests.delete(id),
    onSuccess: () => {
      toast({ title: "تم حذف الطلب" });
      qc.invalidateQueries({ queryKey: ["my-buy-requests", user?.id] });
    },
    onError: () => toast({ title: "خطأ في الحذف", variant: "destructive" }),
  });

  if (!isHydrated) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <Redirect to="/login" />;

  const cp = (profileData as any) || user as any;
  const isDealer = cp.role === "seller" || cp.role === "dealer";
  const photoUrl = localPhoto || cp.profilePhoto || getAvatarUrl(cp.profilePhoto, cp.name, cp.email);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: "الحجم كبير", description: "الحد الأقصى للصورة 3 ميجابايت", variant: "destructive" });
      return;
    }
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const r = await fetch(`${API}/users/${user.id}/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!r.ok) throw new Error("فشل رفع الصورة");
      const { profilePhoto } = await r.json();
      setLocalPhoto(profilePhoto);
      toast({ title: "تم تحديث الصورة الشخصية" });
      refetchProfile();
    } catch {
      toast({ title: "خطأ", description: "فشل رفع الصورة الشخصية", variant: "destructive" });
    } finally { setUploadingPhoto(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await fetch(`${API}/users/${user.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!r.ok) throw new Error();
      toast({ title: "تم التحديث بنجاح", description: "تم تحديث بيانات ملفك الشخصي." });
      setIsEditing(false);
      refetchProfile();
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ أثناء تحديث البيانات.", variant: "destructive" });
    }
  };

  const roleLabel: Record<string, string> = {
    admin: "مدير المنصة",
    dealer: "تاجر شراء وبيع",
    seller: "بائع سيارات",
    inspector: "فاحص سيارات",
    buyer: "مشتري",
  };

  return (
    <div className="py-8 px-4 max-w-7xl mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Profile Sidebar ── */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-br from-primary/20 to-accent/10" />

            <div className="relative pt-10 flex flex-col items-center text-center">
              {/* Avatar with upload */}
              <div className="relative mb-4">
                <div className="w-28 h-28 rounded-full bg-background border-4 border-background shadow-xl flex items-center justify-center overflow-hidden">
                  {uploadingPhoto ? (
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  ) : (
                    <img
                      src={photoUrl}
                      alt={cp.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = getAvatarUrl(null, cp.name, cp.email);
                      }}
                    />
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
                  title="تغيير الصورة"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>

              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 justify-center">
                {cp.name}
                {cp.isVerified && <ShieldCheck className="w-5 h-5 text-primary" />}
              </h2>
              <p className="text-muted-foreground mb-1 text-sm">{roleLabel[cp.role] ?? "مستخدم"}</p>

              <div className="flex items-center justify-center gap-1 text-accent font-bold mb-6">
                <Star className="w-4 h-4 fill-accent" />
                <span>{cp.averageRating?.toFixed(1) || cp.rating?.toFixed(1) || "0.0"}</span>
                <span className="text-muted-foreground font-normal text-sm">({cp.reviewCount || 0} تقييم)</span>
              </div>

              {!isEditing ? (
                <div className="w-full space-y-3 mb-6 text-right">
                  {cp.email && (
                    <div className="flex items-center gap-3 text-muted-foreground p-3 bg-secondary/30 rounded-xl">
                      <Mail className="w-5 h-5 text-primary shrink-0" />
                      <span className="truncate text-sm" dir="ltr">{cp.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-muted-foreground p-3 bg-secondary/30 rounded-xl">
                    <Phone className="w-5 h-5 text-primary shrink-0" />
                    <span dir="ltr">{cp.phone || "غير محدد"}</span>
                  </div>
                  {(cp.province || cp.city) && (
                    <div className="flex items-center gap-3 text-muted-foreground p-3 bg-secondary/30 rounded-xl">
                      <MapPin className="w-5 h-5 text-primary shrink-0" />
                      <span>{cp.province}{cp.city ? `، ${cp.city}` : ""}</span>
                    </div>
                  )}

                  {/* Showroom info for sellers/dealers */}
                  {isDealer && cp.showroomName && (
                    <div className="mt-4 pt-4 border-t border-border/50 space-y-3 text-right">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">معلومات المعرض</p>
                      {cp.showroomName && (
                        <div className="flex items-center gap-3 text-muted-foreground p-3 bg-primary/5 rounded-xl">
                          <Store className="w-5 h-5 text-primary shrink-0" />
                          <span className="font-medium text-foreground">{cp.showroomName}</span>
                        </div>
                      )}
                      {cp.showroomAddress && (
                        <div className="flex items-center gap-3 text-muted-foreground p-3 bg-secondary/30 rounded-xl">
                          <Building2 className="w-5 h-5 text-primary shrink-0" />
                          <span>{cp.showroomAddress}</span>
                        </div>
                      )}
                      {cp.showroomPhone && (
                        <div className="flex items-center gap-3 text-muted-foreground p-3 bg-secondary/30 rounded-xl">
                          <Phone className="w-5 h-5 text-primary shrink-0" />
                          <span dir="ltr">{cp.showroomPhone}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditForm({
                          name: cp.name || "",
                          phone: cp.phone || "",
                          province: cp.province || "",
                          city: cp.city || "",
                          showroomName: cp.showroomName || "",
                          showroomAddress: cp.showroomAddress || "",
                          showroomPhone: cp.showroomPhone || "",
                        });
                        setIsEditing(true);
                      }}
                      className="rounded-xl w-full"
                    >
                      <Edit3 className="w-4 h-4 ml-2" /> تعديل
                    </Button>
                    <Button variant="outline" onClick={logout} className="rounded-xl w-full text-destructive hover:text-destructive">
                      <LogOut className="w-4 h-4 ml-2" /> خروج
                    </Button>
                  </div>
                  {cp.role === "admin" && (
                    <Link href="/admin">
                      <Button className="w-full mt-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                        <Settings className="w-4 h-4 ml-2" /> لوحة الإدارة
                      </Button>
                    </Link>
                  )}
                  {cp.role === "dealer" && (
                    <Link href="/showroom/manage">
                      <Button className="w-full mt-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Store className="w-4 h-4 ml-2" /> إدارة معرضي
                      </Button>
                    </Link>
                  )}

                  {/* ── وضع الحساب (Role Switcher) ── */}
                  {cp.role !== "admin" && cp.role !== "inspector" && (
                    <AccountModeSelector currentRole={cp.role} userId={cp.id} onRoleChanged={refetchProfile} />
                  )}

                  {/* ── دعوة الأصدقاء ── */}
                  <InviteFriends userId={cp.id} />
                </div>
              ) : (
                /* ── Edit Form ── */
                <form onSubmit={handleUpdate} className="w-full space-y-4 text-right mb-6">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">الاسم</label>
                    <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary outline-none text-sm" required />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">رقم الهاتف</label>
                    <input type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary outline-none text-sm" dir="ltr" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground mb-1 block">المحافظة</label>
                      <input type="text" value={editForm.province} onChange={e => setEditForm({ ...editForm, province: e.target.value })}
                        className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary outline-none text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground mb-1 block">المدينة</label>
                      <input type="text" value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                        className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary outline-none text-sm" />
                    </div>
                  </div>

                  {/* Showroom fields for seller/dealer */}
                  {isDealer && (
                    <div className="space-y-3 pt-3 border-t border-border/50">
                      <p className="text-xs font-bold text-primary flex items-center gap-1">
                        <Store className="w-3.5 h-3.5" /> معلومات المعرض
                      </p>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">اسم المعرض</label>
                        <input type="text" value={editForm.showroomName} onChange={e => setEditForm({ ...editForm, showroomName: e.target.value })}
                          placeholder="مثال: معرض النور للسيارات"
                          className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary outline-none text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">عنوان المعرض</label>
                        <input type="text" value={editForm.showroomAddress} onChange={e => setEditForm({ ...editForm, showroomAddress: e.target.value })}
                          placeholder="مثال: شارع الثورة، دمشق"
                          className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary outline-none text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">هاتف المعرض</label>
                        <input type="text" value={editForm.showroomPhone} onChange={e => setEditForm({ ...editForm, showroomPhone: e.target.value })}
                          placeholder="+963..."
                          className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary outline-none text-sm" dir="ltr" />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" className="flex-1 rounded-xl gap-1">
                      <Check className="w-4 h-4" /> حفظ
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="flex-1 rounded-xl gap-1">
                      <X className="w-4 h-4" /> إلغاء
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Stats card */}
          <div className="bg-card border rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wide">إحصائيات</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-primary/5 rounded-2xl p-3">
                <p className="text-2xl font-extrabold text-primary">{cp.listingCount ?? userCars?.cars?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">إعلان</p>
              </div>
              <div className="bg-accent/5 rounded-2xl p-3">
                <p className="text-2xl font-extrabold text-accent">{cp.reviewCount || 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">تقييم</p>
              </div>
              <div className="bg-blue-500/5 rounded-2xl p-3">
                <p className="text-2xl font-extrabold text-blue-500">{(cp.averageRating || cp.rating || 0).toFixed(1)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">نجوم</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="lg:col-span-2 space-y-8">

          {/* My Listings */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">إعلاناتي</h3>
              <Link href="/add-listing">
                <Button variant="outline" size="sm" className="rounded-xl">+ إضافة إعلان</Button>
              </Link>
            </div>

            {loadingCars ? (
              <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : !userCars?.cars || userCars.cars.length === 0 ? (
              <div className="bg-card border border-dashed rounded-2xl p-10 text-center text-muted-foreground shadow-sm">
                <Upload className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">لا يوجد لديك أي إعلانات حالياً</p>
                <Link href="/add-listing">
                  <Button className="mt-4 rounded-xl">انشر أول إعلان</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {userCars.cars.map((car) => (
                  <div key={car.id} className="relative group">
                    <CarCard car={car} />
                    {(car as any).isFeatured ? (
                      <div className="mt-2 flex items-center gap-1.5 text-amber-600 text-xs font-medium bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                        <span>إعلان مميز</span>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full rounded-xl border-dashed border-amber-400 text-amber-600 hover:bg-amber-50 hover:border-amber-500 gap-1.5 text-xs"
                        onClick={() => setShowFeatureModal(true)}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        تمييز الإعلان
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Featured Subscription Modal */}
          <Dialog open={showFeatureModal} onOpenChange={setShowFeatureModal}>
            <DialogContent className="max-w-sm rounded-3xl text-right" dir="rtl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                  <Crown className="w-5 h-5 text-amber-500" />
                  تمييز الإعلان
                </DialogTitle>
                <DialogDescription className="sr-only">تمييز الإعلان يتطلب اشتراكاً مدفوعاً</DialogDescription>
              </DialogHeader>
              <div className="py-2 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center space-y-2">
                  <Sparkles className="w-10 h-10 text-amber-500 mx-auto" />
                  <p className="font-bold text-amber-800">الإعلانات المميزة</p>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    تظهر الإعلانات المميزة في أعلى نتائج البحث وفي قسم "الإعلانات المميزة" على الصفحة الرئيسية، مما يزيد من فرص البيع بشكل كبير.
                  </p>
                </div>
                <div className="bg-muted/40 rounded-2xl p-4 flex items-start gap-3">
                  <Lock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">يتطلب اشتراكاً مدفوعاً</p>
                    <p className="text-xs text-muted-foreground mt-0.5">سيتم تفعيل هذه الميزة قريباً ضمن نافذة الاشتراكات. ترقّب الإطلاق!</p>
                  </div>
                </div>
                <Button className="w-full rounded-xl gap-2" disabled>
                  <Crown className="w-4 h-4" />
                  الاشتراك قريباً
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* My Buy Requests */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" /> طلباتي
                {myBuyRequests.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{myBuyRequests.length}</Badge>
                )}
              </h3>
              <Link href="/buy-requests">
                <Button variant="outline" size="sm" className="rounded-xl">عرض الكل</Button>
              </Link>
            </div>
            {loadingBuyRequests ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : myBuyRequests.length === 0 ? (
              <div className="bg-card border border-dashed rounded-2xl p-10 text-center text-muted-foreground shadow-sm">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">لا يوجد لديك طلبات شراء</p>
                <Link href="/buy-requests">
                  <Button className="mt-4 rounded-xl" size="sm">أضف طلب شراء</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myBuyRequests.map((r: any) => (
                  <div key={r.id} className="bg-card border rounded-2xl p-4 flex items-start justify-between gap-4 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-foreground">
                          {r.brand || "أي ماركة"} {r.model || ""}
                          {r.minYear || r.maxYear ? ` (${r.minYear || ""}–${r.maxYear || ""})` : ""}
                        </p>
                        <Badge
                          variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {r.status === "approved" ? "موافق عليه" : r.status === "rejected" ? "مرفوض" : "بانتظار الموافقة"}
                        </Badge>
                      </div>
                      {r.maxPrice && (
                        <p className="text-sm text-primary font-bold flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          حتى {Number(r.maxPrice).toLocaleString()} {r.currency ?? "USD"}
                        </p>
                      )}
                      {r.city && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {r.city}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/50 mt-1">{new Date(r.createdAt).toLocaleDateString("ar-EG")}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => deleteBuyRequestMutation.mutate(r.id)}
                      disabled={deleteBuyRequestMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviews */}
          <div>
            <h3 className="text-xl font-bold text-foreground mb-6">التقييمات</h3>
            {loadingReviews ? (
              <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : !reviews || reviews.length === 0 ? (
              <div className="bg-card border border-dashed rounded-2xl p-10 text-center text-muted-foreground shadow-sm">
                <Star className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>لا يوجد تقييمات حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-card border rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-foreground">{review.reviewer?.name || "مستخدم"}</div>
                      <div className="flex text-accent">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < review.rating ? "fill-accent" : "text-muted-foreground"}`} />
                        ))}
                      </div>
                    </div>
                    {review.comment && <p className="text-muted-foreground">{review.comment}</p>}
                    <div className="text-xs text-muted-foreground/60 mt-3">
                      {new Date(review.createdAt).toLocaleDateString("ar-EG")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InviteFriends({ userId }: { userId: number }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const appUrl = typeof window !== "undefined" ? `${window.location.origin}?ref=${userId}` : "";
  const shareMsg = `انضم إلى MARKLET — السوق الأول للسيارات في سورية 🚗\n${appUrl}`;

  const copyLink = () => {
    navigator.clipboard.writeText(appUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "تم نسخ الرابط" });
    });
  };

  const shareChannels = [
    { label: "واتساب", color: "#25D366", url: `https://wa.me/?text=${encodeURIComponent(shareMsg)}`, icon: "💬" },
    { label: "فيسبوك", color: "#1877F2", url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl)}`, icon: "👥" },
    { label: "تيليغرام", color: "#229ED9", url: `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(shareMsg)}`, icon: "✈️" },
  ];

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-l from-primary/10 to-accent/10 border border-primary/20 hover:border-primary/40 transition-all"
      >
        <span className="text-2xl">🎁</span>
        <div className="flex-1 text-right">
          <div className="font-bold text-sm text-primary">دعوة الأصدقاء</div>
          <div className="text-xs text-muted-foreground">ادعُ أصدقاءك واحصل على مكافآت</div>
        </div>
        <span className="text-muted-foreground text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3 animate-in slide-in-from-top-2">
          <div className="bg-primary/5 rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">رابط الدعوة الخاص بك</p>
            <p className="font-mono text-xs text-primary break-all">{appUrl}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {shareChannels.map(ch => (
              <a key={ch.label} href={ch.url} target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 p-3 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: ch.color }}>
                <span className="text-lg">{ch.icon}</span>
                {ch.label}
              </a>
            ))}
          </div>
          <button
            onClick={copyLink}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-primary/40 text-sm font-bold text-primary hover:bg-primary/5 transition-colors"
          >
            {copied ? "✓ تم النسخ" : "نسخ الرابط"}
          </button>
          <div className="bg-accent/10 rounded-xl p-3 text-center">
            <p className="text-xs text-accent font-bold">🎁 مكافأة الدعوة</p>
            <p className="text-xs text-muted-foreground mt-1">لكل صديق ينضم بدعوتك، تحصل على إعلان مميز مجاني</p>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountModeSelector({ currentRole, userId, onRoleChanged }: {
  currentRole: string;
  userId: number;
  onRoleChanged: () => void;
}) {
  const [switching, setSwitching] = useState(false);
  const { toast } = useToast();
  const { setAuth } = useAuthStore();

  const modes = [
    { role: "buyer", label: "مشتري", icon: "🛒", desc: "تصفح وتقديم طلبات شراء" },
    { role: "seller", label: "بائع", icon: "🚗", desc: "نشر إعلانات بيع" },
    { role: "dealer", label: "تاجر / معرض", icon: "🏢", desc: "نشر إعلانات متعددة" },
  ];

  const switchMode = async (newRole: string) => {
    if (newRole === currentRole) return;
    setSwitching(true);
    try {
      const token = localStorage.getItem("scm_token");
      const res = await fetch(withApi(`/api/users/${userId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      if (token) setAuth(updated, token);
      onRoleChanged();
      toast({ title: "تم تغيير وضع الحساب", description: `أنت الآن في وضع ${modes.find(m => m.role === newRole)?.label}` });
    } catch {
      toast({ title: "حدث خطأ أثناء تغيير الوضع", variant: "destructive" });
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">وضع الحساب</p>
      <div className="space-y-2">
        {modes.map(m => (
          <button
            key={m.role}
            onClick={() => switchMode(m.role)}
            disabled={switching}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-right ${
              currentRole === m.role
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/40 hover:bg-secondary/50 text-foreground"
            }`}
          >
            <span className="text-xl shrink-0">{m.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">{m.label}</div>
              <div className="text-xs text-muted-foreground">{m.desc}</div>
            </div>
            {currentRole === m.role && (
              <span className="text-[10px] bg-primary text-white rounded-full px-2 py-0.5 shrink-0">نشط</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
