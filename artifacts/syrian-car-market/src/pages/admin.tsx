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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, CheckCircle, Ban, RefreshCw, Settings, Users, Car, AlertTriangle, XCircle } from "lucide-react";
import { api } from "@/lib/api";

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

  const handleCarStatus = async (id: number, status: "approved" | "rejected") => {
    try {
      await api.admin.updateCarStatus(id, status);
      toast({ title: status === "approved" ? "تمت الموافقة على الإعلان" : "تم رفض الإعلان" });
      refetchCars();
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

      <Tabs defaultValue="users" className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-3 mb-8 h-14 bg-muted/50 rounded-xl p-1">
          <TabsTrigger value="users" className="rounded-lg font-bold text-base data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="w-4 h-4 ml-2" /> المستخدمين
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
                        <Badge variant={u.role === 'admin' ? 'default' : u.role === 'dealer' ? 'secondary' : 'outline'}>
                          {u.role === 'admin' ? 'مدير' : u.role === 'dealer' ? 'معرض' : 'مستخدم'}
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
    </div>
  );
}