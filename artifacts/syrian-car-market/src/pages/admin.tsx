import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/auth";
import { 
  useAdminListUsers, useAdminUpdateUser, useAdminDeleteUser,
  useAdminListCars, useAdminDeleteCar,
  useGetSettings, useUpdateSettings
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Redirect } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, CheckCircle, Ban, RefreshCw, Settings, Users, Car, AlertTriangle, XCircle, Bell, ChevronDown, ChevronUp, Gauge, Fuel, MapPin, Phone, FileText, Palette, Calendar, Eye, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

export default function AdminDashboard() {
  const { user, isHydrated } = useAuthStore();
  const { toast } = useToast();

  const { data: users, isLoading: loadingUsers, refetch: refetchUsers } = useAdminListUsers({ query: { enabled: user?.role === 'admin' } });
  const { data: carsData, isLoading: loadingCars, refetch: refetchCars } = useAdminListCars({ query: { enabled: user?.role === 'admin' } });
  const { data: settings, isLoading: loadingSettings } = useGetSettings({ query: { enabled: user?.role === 'admin' } });
  const { data: dashboard } = useQuery<{ usersCount: number; listingsCount: number; missingCarsCount: number }>({
    queryKey: ["/admin/dashboard"],
    queryFn: () => api.admin.dashboard(),
    enabled: user?.role === 'admin',
  });

  type PendingCar = {
    id: number; brand: string; model: string; year: number; price: number;
    mileage: number | null; fuelType: string | null; transmission: string | null;
    condition: string | null; color: string | null; description: string | null;
    city: string; province: string; saleType: string | null; category: string | null;
    status: string; createdAt: string; sellerName: string; sellerPhone: string | null;
    primaryImage: string | null; images: string[];
  };
  const [expandedCarId, setExpandedCarId] = useState<number | null>(null);
  const [previewCar, setPreviewCar] = useState<PendingCar | null>(null);
  const [previewImgIdx, setPreviewImgIdx] = useState(0);

  const { data: pendingCars, isLoading: loadingPending, refetch: refetchPending } = useQuery<PendingCar[]>({
    queryKey: ["/admin/pending-cars"],
    queryFn: () => api.admin.pendingCars(),
    enabled: user?.role === 'admin',
  });

  const updateUserMutation = useAdminUpdateUser();
  const deleteUserMutation = useAdminDeleteUser();
  const deleteCarMutation = useAdminDeleteCar();
  const updateSettingsMutation = useUpdateSettings();

  const [settingsForm, setSettingsForm] = useState({
    platformName: "",
    primaryColor: "",
    secondaryColor: "",
    logoUrl: "",
    heroImageUrl: "",
  });

  useEffect(() => {
    if (settings) {
      setSettingsForm({
        platformName: settings.platformName || "",
        primaryColor: settings.primaryColor || "",
        secondaryColor: settings.secondaryColor || "",
        logoUrl: settings.logoUrl || "",
        heroImageUrl: settings.heroImageUrl || "",
      });
    }
  }, [settings]);

  if (!isHydrated) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user || user.role !== 'admin') return <Redirect to="/" />;

  const handleUserAction = async (id: number, action: 'verify' | 'ban' | 'unban' | 'delete') => {
    try {
      if (action === 'delete') {
        if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
        await deleteUserMutation.mutateAsync({ id });
      } else {
        const updates: any = {};
        if (action === 'verify') updates.isVerified = true;
        if (action === 'ban') updates.role = 'banned';
        if (action === 'unban') updates.role = 'user'; // default back to user
        
        await updateUserMutation.mutateAsync({ id, data: updates });
      }
      toast({ title: "تم الإجراء بنجاح" });
      refetchUsers();
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleDeleteCar = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإعلان؟')) return;
    try {
      await deleteCarMutation.mutateAsync({ id });
      toast({ title: "تم حذف الإعلان" });
      refetchCars();
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleCarStatus = async (id: number, status: "approved" | "rejected", fromPending = false) => {
    try {
      await api.admin.updateCarStatus(id, status);
      toast({ title: status === "approved" ? "تمت الموافقة على الإعلان" : "تم رفض الإعلان" });
      refetchCars();
      refetchPending();
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettingsMutation.mutateAsync({ data: settingsForm });
      toast({ title: "تم حفظ الإعدادات" });
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  return (
    <div className="py-8 px-4 max-w-7xl mx-auto w-full min-h-[70vh]">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">لوحة الإدارة</h1>
          <p className="text-muted-foreground mt-1">إدارة المستخدمين، الإعلانات، وإعدادات المنصة</p>
        </div>
      </div>

      {/* Dashboard stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "عدد المستخدمين", value: dashboard?.usersCount, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "عدد الإعلانات", value: dashboard?.listingsCount, icon: Car, color: "text-green-600", bg: "bg-green-50" },
          { label: "السيارات المفقودة", value: dashboard?.missingCarsCount, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-card border rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}>
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">{label}</p>
              <p className="text-3xl font-bold text-foreground">
                {value !== undefined ? value.toLocaleString("ar-EG") : <Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" />}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Pending items alert banner */}
      {(pendingCars?.length ?? 0) > 0 && (
        <div className="mb-6 flex items-center gap-4 bg-amber-50 border-2 border-amber-300 rounded-2xl px-5 py-4 shadow-sm">
          <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-amber-800 text-base">
              يوجد {pendingCars!.length} {pendingCars!.length === 1 ? "إعلان" : "إعلانات"} بانتظار مراجعتك
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              انتقل إلى تبويب <strong>«مراجعة»</strong> للموافقة على الإعلانات أو رفضها
            </p>
          </div>
          <span className="bg-amber-400 text-white text-2xl font-bold rounded-xl px-4 py-1">
            {pendingCars!.length}
          </span>
        </div>
      )}

      <Tabs defaultValue="review" className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-4 mb-8 h-14 bg-muted/50 rounded-xl p-1">
          <TabsTrigger value="users" className="rounded-lg font-bold text-base data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="w-4 h-4 ml-2" /> المستخدمين
          </TabsTrigger>
          <TabsTrigger value="review" className="rounded-lg font-bold text-base data-[state=active]:bg-background data-[state=active]:shadow-sm relative">
            <AlertTriangle className="w-4 h-4 ml-2 text-red-500" /> مراجعة
            {(pendingCars?.length ?? 0) > 0 && (
              <span className="absolute -top-1.5 -left-1.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center animate-pulse">
                {pendingCars!.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="listings" className="rounded-lg font-bold text-base data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Car className="w-4 h-4 ml-2" /> الإعلانات
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg font-bold text-base data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Settings className="w-4 h-4 ml-2" /> الإعدادات
          </TabsTrigger>
        </TabsList>
        
        {/* Users Tab */}
        <TabsContent value="users" className="bg-card border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-muted/20">
            <h2 className="text-xl font-bold">إدارة المستخدمين</h2>
            <Button variant="outline" size="sm" onClick={() => refetchUsers()}><RefreshCw className="w-4 h-4 ml-2" /> تحديث</Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">الدور</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingUsers ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : !users?.length ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">لا يوجد مستخدمين</TableCell></TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell dir="ltr" className="text-right">{u.phone}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'admin' ? 'default' : (u.role === 'dealer' || u.role === 'seller') ? 'secondary' : 'outline'}>
                          {u.role === 'admin' ? 'مدير' : u.role === 'dealer' ? 'تاجر' : u.role === 'seller' ? 'بائع' : u.role === 'inspector' ? 'فاحص' : 'مشتري'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {u.isVerified && <Badge className="bg-green-500 hover:bg-green-600">موثق</Badge>}
                          {u.role === 'banned' && <Badge variant="destructive">محظور</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!u.isVerified && u.role !== 'admin' && (
                            <Button size="sm" variant="outline" className="h-8 border-green-500 text-green-600 hover:bg-green-50" onClick={() => handleUserAction(u.id, 'verify')}>
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          {u.role !== 'admin' && u.role !== 'banned' && (
                            <Button size="sm" variant="outline" className="h-8 border-orange-500 text-orange-600 hover:bg-orange-50" onClick={() => handleUserAction(u.id, 'ban')}>
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
                          {u.role === 'banned' && (
                            <Button size="sm" variant="outline" className="h-8" onClick={() => handleUserAction(u.id, 'unban')}>
                              رفع الحظر
                            </Button>
                          )}
                          {u.role !== 'admin' && (
                            <Button size="sm" variant="outline" className="h-8 border-red-500 text-red-600 hover:bg-red-50" onClick={() => handleUserAction(u.id, 'delete')}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Review Tab — pending cars full preview cards */}
        <TabsContent value="review" className="bg-card border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-amber-50 dark:bg-amber-950/20">
            <div>
              <h2 className="text-xl font-bold">إعلانات بانتظار المراجعة</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {loadingPending ? "جارٍ التحميل..." : `${pendingCars?.length ?? 0} إعلان معلق`}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchPending()}>
              <RefreshCw className="w-4 h-4 ml-2" /> تحديث
            </Button>
          </div>

          <div className="p-4 space-y-4">
            {loadingPending ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : !pendingCars?.length ? (
              <div className="text-center py-16">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="font-bold text-lg">لا توجد إعلانات معلقة</p>
                <p className="text-muted-foreground text-sm mt-1">كل الإعلانات تمت مراجعتها</p>
              </div>
            ) : (
              pendingCars.map((car) => {
                const isExpanded = expandedCarId === car.id;
                const fuelMap: Record<string, string> = { petrol: "بنزين", diesel: "ديزل", electric: "كهربائي", hybrid: "هجين", gas: "غاز" };
                const transMap: Record<string, string> = { automatic: "أوتوماتيك", manual: "عادي" };
                const conditionMap: Record<string, string> = { excellent: "ممتازة", good: "جيدة", fair: "مقبولة", poor: "ضعيفة" };
                const saleMap: Record<string, string> = { cash: "نقدي", installment: "تقسيط", exchange: "مقايضة" };
                return (
                  <div key={car.id} className="border-2 border-amber-200 rounded-2xl overflow-hidden bg-background shadow-sm hover:shadow-md transition-shadow">

                    {/* Card Header — always visible */}
                    <div
                      className="flex items-center gap-4 p-4 cursor-pointer hover:bg-amber-50/50 transition-colors"
                      onClick={() => setExpandedCarId(isExpanded ? null : car.id)}
                    >
                      {/* Thumbnail */}
                      <div className="w-20 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                        {car.primaryImage
                          ? <img src={car.primaryImage} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Car className="w-8 h-8 text-muted-foreground/40" /></div>
                        }
                      </div>

                      {/* Basic info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-lg">{car.brand} {car.model} {car.year}</h3>
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">معلق</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span dir="ltr" className="font-bold text-primary text-base">${car.price.toLocaleString()}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{car.city}، {car.province}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(car.createdAt).toLocaleDateString('ar-SY')}</span>
                        </div>
                      </div>

                      {/* Quick action buttons + preview + expand toggle */}
                      <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                          onClick={() => { setPreviewCar(car); setPreviewImgIdx(0); }}
                        >
                          <Eye className="w-4 h-4" /> معاينة
                        </Button>
                        <Button
                          size="sm"
                          className="h-9 bg-green-500 hover:bg-green-600 text-white gap-1.5"
                          onClick={() => handleCarStatus(car.id, 'approved')}
                        >
                          <CheckCircle className="w-4 h-4" /> قبول
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 border-red-400 text-red-600 hover:bg-red-50 gap-1.5"
                          onClick={() => handleCarStatus(car.id, 'rejected')}
                        >
                          <XCircle className="w-4 h-4" /> رفض
                        </Button>
                        <button className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors" onClick={() => setExpandedCarId(isExpanded ? null : car.id)}>
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-amber-100 bg-amber-50/30">
                        {/* Full-width image */}
                        {car.primaryImage && (
                          <div className="w-full h-56 overflow-hidden">
                            <img src={car.primaryImage} alt={`${car.brand} ${car.model}`} className="w-full h-full object-cover" />
                          </div>
                        )}

                        <div className="p-5 space-y-5">
                          {/* Specs grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {[
                              { icon: Gauge, label: "المسافة", value: car.mileage ? `${car.mileage.toLocaleString()} كم` : null },
                              { icon: Fuel, label: "الوقود", value: car.fuelType ? fuelMap[car.fuelType] ?? car.fuelType : null },
                              { icon: Settings, label: "ناقل الحركة", value: car.transmission ? transMap[car.transmission] ?? car.transmission : null },
                              { icon: Car, label: "الحالة", value: car.condition ? conditionMap[car.condition] ?? car.condition : null },
                              { icon: Palette, label: "اللون", value: car.color ?? null },
                              { icon: FileText, label: "طريقة البيع", value: car.saleType ? saleMap[car.saleType] ?? car.saleType : null },
                            ].filter(s => s.value).map(({ icon: Icon, label, value }) => (
                              <div key={label} className="bg-background rounded-xl p-3 border flex items-center gap-2">
                                <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-muted-foreground">{label}</p>
                                  <p className="font-semibold text-sm">{value}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Description */}
                          {car.description && (
                            <div className="bg-background rounded-xl border p-4">
                              <p className="text-xs text-muted-foreground mb-1.5 font-medium">وصف الإعلان</p>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{car.description}</p>
                            </div>
                          )}

                          {/* Seller info */}
                          <div className="bg-background rounded-xl border p-4 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">البائع</p>
                              <p className="font-bold">{car.sellerName}</p>
                            </div>
                            {car.sellerPhone && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="w-4 h-4" />
                                <span dir="ltr" className="font-mono">{car.sellerPhone}</span>
                              </div>
                            )}
                          </div>

                          {/* Action buttons full-width */}
                          <div className="flex gap-3">
                            <Button
                              className="flex-1 h-11 bg-green-500 hover:bg-green-600 text-white gap-2 text-base font-bold"
                              onClick={() => handleCarStatus(car.id, 'approved')}
                            >
                              <CheckCircle className="w-5 h-5" /> الموافقة على الإعلان ونشره
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 h-11 border-2 border-red-400 text-red-600 hover:bg-red-50 gap-2 text-base font-bold"
                              onClick={() => handleCarStatus(car.id, 'rejected')}
                            >
                              <XCircle className="w-5 h-5" /> رفض الإعلان
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Listings Tab */}
        <TabsContent value="listings" className="bg-card border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-muted/20">
            <h2 className="text-xl font-bold">إدارة الإعلانات</h2>
            <Button variant="outline" size="sm" onClick={() => refetchCars()}><RefreshCw className="w-4 h-4 ml-2" /> تحديث</Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-right">المركبة</TableHead>
                  <TableHead className="text-right">السنة</TableHead>
                  <TableHead className="text-right">السعر</TableHead>
                  <TableHead className="text-right">البائع</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingCars ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : !carsData?.cars?.length ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">لا يوجد إعلانات</TableCell></TableRow>
                ) : (
                  carsData.cars.map((car) => (
                    <TableRow key={car.id}>
                      <TableCell className="font-medium">{car.brand} {car.model}</TableCell>
                      <TableCell>{car.year}</TableCell>
                      <TableCell>{car.price.toLocaleString('ar-SY')} ل.س</TableCell>
                      <TableCell>{(car as any).sellerName || 'مجهول'}</TableCell>
                      <TableCell className="text-center">
                        {(car as any).status === 'approved' && <Badge className="bg-green-500 hover:bg-green-600">مقبول</Badge>}
                        {(car as any).status === 'pending'  && <Badge variant="secondary" className="bg-amber-100 text-amber-700">معلق</Badge>}
                        {(car as any).status === 'rejected' && <Badge variant="destructive">مرفوض</Badge>}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm" variant="outline"
                            className="h-8 border-blue-500 text-blue-600 hover:bg-blue-50"
                            onClick={() => { setPreviewCar(car as unknown as PendingCar); setPreviewImgIdx(0); }}
                            title="معاينة الإعلان"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {(car as any).status !== 'approved' && (
                            <Button size="sm" variant="outline" className="h-8 border-green-500 text-green-600 hover:bg-green-50" onClick={() => handleCarStatus(car.id, 'approved')}>
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          {(car as any).status !== 'rejected' && (
                            <Button size="sm" variant="outline" className="h-8 border-orange-500 text-orange-600 hover:bg-orange-50" onClick={() => handleCarStatus(car.id, 'rejected')}>
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="h-8 border-red-500 text-red-600 hover:bg-red-50" onClick={() => handleDeleteCar(car.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="bg-card border rounded-2xl shadow-sm">
          <div className="p-6 border-b bg-muted/20">
            <h2 className="text-xl font-bold">إعدادات المنصة</h2>
          </div>
          <div className="p-6">
            {loadingSettings ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
                <div className="space-y-2">
                  <label className="text-sm font-bold block">اسم المنصة</label>
                  <Input 
                    value={settingsForm.platformName} 
                    onChange={e => setSettingsForm({...settingsForm, platformName: e.target.value})} 
                    className="rounded-xl border-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold block">اللون الأساسي (Primary)</label>
                    <Input 
                      value={settingsForm.primaryColor} 
                      onChange={e => setSettingsForm({...settingsForm, primaryColor: e.target.value})}
                      placeholder="hsl(142 71% 29%)"
                      className="rounded-xl border-2"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold block">اللون الثانوي (Secondary)</label>
                    <Input 
                      value={settingsForm.secondaryColor} 
                      onChange={e => setSettingsForm({...settingsForm, secondaryColor: e.target.value})}
                      placeholder="hsl(43 74% 49%)"
                      className="rounded-xl border-2"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold block">رابط الشعار</label>
                  <Input 
                    value={settingsForm.logoUrl} 
                    onChange={e => setSettingsForm({...settingsForm, logoUrl: e.target.value})}
                    className="rounded-xl border-2 text-left"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold block">رابط صورة الهيدر</label>
                  <Input 
                    value={settingsForm.heroImageUrl} 
                    onChange={e => setSettingsForm({...settingsForm, heroImageUrl: e.target.value})}
                    className="rounded-xl border-2 text-left"
                    dir="ltr"
                  />
                </div>
                <Button type="submit" size="lg" className="rounded-xl px-8 mt-4" disabled={updateSettingsMutation.isPending}>
                  {updateSettingsMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'حفظ التغييرات'}
                </Button>
              </form>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ===== Full Car Preview Dialog ===== */}
      {previewCar && (
      <Dialog open={!!previewCar} onOpenChange={(open) => { if (!open) setPreviewCar(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" dir="rtl">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="text-xl font-bold">
              معاينة الإعلان — {previewCar.brand} {previewCar.model} {previewCar.year}
            </DialogTitle>
          </DialogHeader>

          {/* Image gallery */}
          <div className="relative bg-black/90 overflow-hidden" style={{ minHeight: 280 }}>
            {(previewCar.images ?? []).length > 0 ? (
              <>
                <img
                  src={(previewCar.images ?? [])[previewImgIdx]}
                  alt=""
                  className="w-full object-contain"
                  style={{ maxHeight: 360 }}
                />
                {/* Navigation arrows */}
                {(previewCar.images ?? []).length > 1 && (
                  <>
                    <button
                      onClick={() => setPreviewImgIdx(i => (i + 1) % (previewCar.images ?? []).length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setPreviewImgIdx(i => (i - 1 + (previewCar.images ?? []).length) % (previewCar.images ?? []).length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    {/* Dots */}
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                      {(previewCar.images ?? []).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setPreviewImgIdx(i)}
                          className={`w-2 h-2 rounded-full transition-all ${i === previewImgIdx ? 'bg-white scale-125' : 'bg-white/50'}`}
                        />
                      ))}
                    </div>
                    {/* Counter */}
                    <span className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full font-mono">
                      {previewImgIdx + 1} / {(previewCar.images ?? []).length}
                    </span>
                  </>
                )}
                {/* Thumbnail strip */}
                {(previewCar.images ?? []).length > 1 && (
                  <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-black/70">
                    {(previewCar.images ?? []).map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setPreviewImgIdx(i)}
                        className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === previewImgIdx ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-white/60 gap-3">
                <ImageOff className="w-12 h-12" />
                <p className="text-sm">لم يرفع البائع أي صور</p>
              </div>
            )}
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Price + location */}
            <div className="flex items-center justify-between">
              <span dir="ltr" className="text-2xl font-bold text-primary">${previewCar.price.toLocaleString()}</span>
              <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4" /> {previewCar.city}، {previewCar.province}
              </span>
            </div>

            {/* Specs grid */}
            {(() => {
              const fuelMap: Record<string, string> = { petrol: "بنزين", diesel: "ديزل", electric: "كهربائي", hybrid: "هجين", gas: "غاز" };
              const transMap: Record<string, string> = { automatic: "أوتوماتيك", manual: "عادي" };
              const conditionMap: Record<string, string> = { excellent: "ممتازة", good: "جيدة", fair: "مقبولة", poor: "ضعيفة" };
              const saleMap: Record<string, string> = { cash: "نقدي", installment: "تقسيط", exchange: "مقايضة" };
              const specs = [
                { label: "المسافة", value: previewCar.mileage ? `${previewCar.mileage.toLocaleString()} كم` : null },
                { label: "الوقود", value: previewCar.fuelType ? fuelMap[previewCar.fuelType] ?? previewCar.fuelType : null },
                { label: "ناقل الحركة", value: previewCar.transmission ? transMap[previewCar.transmission] ?? previewCar.transmission : null },
                { label: "الحالة", value: previewCar.condition ? conditionMap[previewCar.condition] ?? previewCar.condition : null },
                { label: "اللون", value: previewCar.color },
                { label: "طريقة البيع", value: previewCar.saleType ? saleMap[previewCar.saleType] ?? previewCar.saleType : null },
              ].filter(s => s.value);
              return specs.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {specs.map(({ label, value }) => (
                    <div key={label} className="bg-muted/50 rounded-xl p-3 text-center">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-bold text-sm mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              ) : null;
            })()}

            {/* Description */}
            {previewCar.description && (
              <div className="border rounded-xl p-4 bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground mb-2">وصف البائع</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{previewCar.description}</p>
              </div>
            )}

            {/* Seller */}
            <div className="border rounded-xl p-4 flex items-center justify-between bg-muted/10">
              <div>
                <p className="text-xs text-muted-foreground">البائع</p>
                <p className="font-bold">{previewCar.sellerName}</p>
              </div>
              {previewCar.sellerPhone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span dir="ltr" className="font-mono">{previewCar.sellerPhone}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pb-2">
              <Button
                className="flex-1 h-11 bg-green-500 hover:bg-green-600 text-white gap-2 font-bold"
                onClick={() => { handleCarStatus(previewCar.id, 'approved'); setPreviewCar(null); }}
              >
                <CheckCircle className="w-5 h-5" /> الموافقة ونشر الإعلان
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-11 border-2 border-red-400 text-red-600 hover:bg-red-50 gap-2 font-bold"
                onClick={() => { handleCarStatus(previewCar.id, 'rejected'); setPreviewCar(null); }}
              >
                <XCircle className="w-5 h-5" /> رفض الإعلان
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}