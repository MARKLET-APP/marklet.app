import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { withApi } from "@/lib/runtimeConfig";
import { 
  useAdminListUsers, useAdminUpdateUser, useAdminDeleteUser,
  useGetSettings, useUpdateSettings
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { api, apiRequest } from "@/lib/api";
import { Redirect, useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, CheckCircle, Ban, RefreshCw, Settings, Users, Car, AlertTriangle, XCircle, Bell, ChevronDown, ChevronUp, Gauge, Fuel, MapPin, Phone, FileText, Palette, Calendar, Eye, EyeOff, ChevronLeft, ChevronRight, ImageOff, Inbox, MessageSquare, MessageCircle, ShoppingCart as CartIcon, Star, Sparkles, Wrench, Building2, Store, Recycle, Plus, Edit2, Shield, ShieldCheck } from "lucide-react";

export default function AdminDashboard() {
  const { user, isHydrated } = useAuthStore();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const handleAdminReply = async (targetUserId: number, itemId: number) => {
    if (!user) return;
    setReplyingTo(itemId);
    try {
      const token = localStorage.getItem("scm_token");
      const res = await fetch(withApi("/api/chats/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sellerId: targetUserId, carId: null }),
      });
      if (!res.ok) throw new Error("فشل بدء المحادثة");
      const conv = await res.json();
      navigate(`/messages?conversationId=${conv.id}`);
    } catch {
      toast({ title: "تعذّر فتح المحادثة", variant: "destructive" });
    } finally {
      setReplyingTo(null);
    }
  };

  const { data: users, isLoading: loadingUsers, refetch: refetchUsers } = useAdminListUsers({ query: { enabled: user?.role === 'admin' } });
  const { data: carsData, isLoading: loadingCars, refetch: refetchCars } = useQuery({
    queryKey: ["/admin/cars"],
    queryFn: () => api.admin.listCars(),
    enabled: user?.role === 'admin',
    staleTime: 0,
  });
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
  const [previewBuyRequest, setPreviewBuyRequest] = useState<any | null>(null);
  const [previewRental, setPreviewRental] = useState<any | null>(null);
  const [previewRentalImgIdx, setPreviewRentalImgIdx] = useState(0);

  const { data: pendingCars, isLoading: loadingPending, refetch: refetchPending } = useQuery<PendingCar[]>({
    queryKey: ["/admin/pending-cars"],
    queryFn: () => api.admin.pendingCars(),
    enabled: user?.role === 'admin',
  });

  const { data: adminBuyRequests = [], refetch: refetchBuyRequests } = useQuery({
    queryKey: ["/admin/buy-requests"],
    queryFn: () => api.admin.listBuyRequests(),
    enabled: user?.role === 'admin',
  });
  const adminCarBuyRequests = (adminBuyRequests as any[]).filter(r => r.category !== "parts");
  const adminPartsBuyRequests = (adminBuyRequests as any[]).filter(r => r.category === "parts");
  const pendingBuyRequests = adminCarBuyRequests.filter(r => r.status === "pending");
  const pendingPartRequests = adminPartsBuyRequests.filter(r => r.status === "pending");

  const { data: adminJunkCars = [], refetch: refetchJunkCars } = useQuery<any[]>({
    queryKey: ["/admin/junk-cars"],
    queryFn: () => api.get("/api/admin/junk-cars").then(r => r.json()),
    enabled: user?.role === 'admin',
  });

  const { data: supportMessages = [], refetch: refetchSupport } = useQuery({
    queryKey: ["/support"],
    queryFn: () => api.admin.listSupportMessages(),
    enabled: user?.role === 'admin',
  });

  const { data: feedbackList = [], refetch: refetchFeedback } = useQuery({
    queryKey: ["/feedback"],
    queryFn: () => api.admin.listFeedback(),
    enabled: user?.role === 'admin',
  });

  const { data: pendingRentals = [], refetch: refetchRentals } = useQuery<any[]>({
    queryKey: ["/admin/rental-cars/pending"],
    queryFn: () => apiRequest<any[]>("/api/admin/rental-cars/pending"),
    enabled: user?.role === 'admin',
  });

  const { data: pendingCarParts = [], refetch: refetchCarParts } = useQuery<any[]>({
    queryKey: ["/admin/car-parts/pending"],
    queryFn: () => apiRequest<any[]>("/api/admin/car-parts/pending"),
    enabled: user?.role === 'admin',
  });

  const { data: pendingJunkCars = [], refetch: refetchJunkCarsAdmin } = useQuery<any[]>({
    queryKey: ["/admin/junk-cars/pending"],
    queryFn: () => apiRequest<any[]>("/api/admin/junk-cars/pending"),
    enabled: user?.role === 'admin',
  });

  const { data: adminStats } = useQuery<any>({
    queryKey: ["/admin/stats"],
    queryFn: () => apiRequest("/api/admin/stats"),
    enabled: user?.role === 'admin',
  });

  const { data: dealers = [], isLoading: loadingDealers, refetch: refetchDealers } = useQuery<any[]>({
    queryKey: ["/admin/dealers"],
    queryFn: () => apiRequest("/api/admin/dealers"),
    enabled: user?.role === 'admin',
  });

  const { data: inspectionCenters = [], isLoading: loadingInspection, refetch: refetchInspection } = useQuery<any[]>({
    queryKey: ["/admin/inspection-centers"],
    queryFn: () => apiRequest("/api/admin/inspection-centers"),
    enabled: user?.role === 'admin',
  });

  const { data: scrapCenters = [], isLoading: loadingScrap, refetch: refetchScrap } = useQuery<any[]>({
    queryKey: ["/admin/scrap-centers"],
    queryFn: () => apiRequest("/api/admin/scrap-centers"),
    enabled: user?.role === 'admin',
  });

  const { data: showrooms = [], isLoading: loadingShowrooms, refetch: refetchShowrooms } = useQuery<any[]>({
    queryKey: ["/admin/showrooms"],
    queryFn: () => apiRequest("/api/admin/showrooms"),
    enabled: user?.role === 'admin',
  });

  const [dealerSearch, setDealerSearch] = useState("");
  const [inspectionSearch, setInspectionSearch] = useState("");
  const [scrapSearch, setScrapSearch] = useState("");
  const [showroomSearch, setShowroomSearch] = useState("");

  type CenterForm = { name: string; city: string; address: string; phone: string; whatsapp: string; description: string };
  const emptyCenterForm: CenterForm = { name: "", city: "", address: "", phone: "", whatsapp: "", description: "" };
  const [inspectionForm, setInspectionForm] = useState<CenterForm>(emptyCenterForm);
  const [editingInspection, setEditingInspection] = useState<any | null>(null);
  const [showInspectionDialog, setShowInspectionDialog] = useState(false);
  const [scrapForm, setScrapForm] = useState<CenterForm>(emptyCenterForm);
  const [editingScrap, setEditingScrap] = useState<any | null>(null);
  const [showScrapDialog, setShowScrapDialog] = useState(false);

  type ShowroomForm = { name: string; city: string; address: string; phone: string; whatsapp: string; email: string; description: string; ownerEmail: string };
  const emptyShowroomForm: ShowroomForm = { name: "", city: "", address: "", phone: "", whatsapp: "", email: "", description: "", ownerEmail: "" };
  const [showroomForm, setShowroomForm] = useState<ShowroomForm>(emptyShowroomForm);
  const [editingShowroom, setEditingShowroom] = useState<any | null>(null);
  const [showShowroomDialog, setShowShowroomDialog] = useState(false);
  const [linkUserEmail, setLinkUserEmail] = useState("");
  const [linkingShowroomId, setLinkingShowroomId] = useState<number | null>(null);

  const handleRentalApproval = async (id: number, action: "approve" | "reject") => {
    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      await api.patch(`${BASE}/api/admin/rental-cars/${id}/approve`, { approve: action === "approve" });
      toast({ title: action === "approve" ? "تمت الموافقة على إعلان التأجير" : "تم رفض إعلان التأجير" });
      refetchRentals();
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleCarPartApproval = async (id: number, action: "approve" | "reject") => {
    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      await api.patch(`${BASE}/api/admin/car-parts/${id}/approve`, { approve: action === "approve" });
      toast({ title: action === "approve" ? "تمت الموافقة على إعلان القطعة" : "تم رفض إعلان القطعة" });
      refetchCarParts();
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleJunkCarApproval = async (id: number, action: "approve" | "reject") => {
    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      await api.patch(`${BASE}/api/admin/junk-cars/${id}/approve`, { approve: action === "approve" });
      toast({ title: action === "approve" ? "تمت الموافقة على الإعلان" : "تم رفض الإعلان" });
      refetchJunkCarsAdmin();
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const totalInboxUnread = (supportMessages as any[]).length;
  const totalReviewPending = (pendingCars?.length ?? 0) + pendingBuyRequests.length + pendingPartRequests.length + pendingRentals.length + pendingCarParts.length + pendingJunkCars.length;

  const handleBuyRequestStatus = async (id: number, status: "approved" | "rejected") => {
    try {
      await api.admin.updateBuyRequestStatus(id, status);
      toast({ title: status === "approved" ? "تمت الموافقة على الطلب" : "تم رفض الطلب" });
      refetchBuyRequests();
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const updateUserMutation = useAdminUpdateUser();
  const deleteUserMutation = useAdminDeleteUser();
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
      await api.admin.deleteCar(id);
      toast({ title: "تم حذف الإعلان" });
      refetchCars();
      refetchPending();
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleFeatureToggle = useCallback(async (id: number, field: "isFeatured" | "isHighlighted" | "isActive", currentValue: boolean) => {
    try {
      await api.patch(`/api/admin/cars/${id}/feature`, { [field]: !currentValue });
      const labels: Record<string, [string, string]> = {
        isFeatured: ["✨ تم تمييز الإعلان", "تم إلغاء تمييز الإعلان"],
        isHighlighted: ["🔆 تم إبراز الإعلان", "تم إلغاء إبراز الإعلان"],
        isActive: ["👁️ تم إظهار الإعلان", "🚫 تم إخفاء الإعلان من الإعلانات المميزة"],
      };
      toast({ title: labels[field][currentValue ? 1 : 0] });
      refetchCars();
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  }, [refetchCars, toast]);

  const handleCarStatus = async (id: number, status: "approved" | "rejected", fromPending = false) => {
    try {
      await api.admin.updateCarStatus(id, status);
      toast({ title: status === "approved" ? "✅ تمت الموافقة على الإعلان ونشره — تم إشعار المستخدم" : "❌ تم رفض الإعلان — تم إشعار المستخدم" });
      refetchCars();
      refetchPending();
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  // ─── Link / unlink car to showroom ──────────────────────────────────────────
  const [carShowroomSelections, setCarShowroomSelections] = useState<Record<number, string>>({});
  const [linkingCarId, setLinkingCarId] = useState<number | null>(null);

  const linkCarToShowroom = async (carId: number, showroomId: string) => {
    try {
      setLinkingCarId(carId);
      await apiRequest(`/api/admin/cars/${carId}/showroom`, "PATCH", {
        showroomId: showroomId ? Number(showroomId) : null,
      });
      toast({ title: showroomId ? "✅ تم ربط الإعلان بالمعرض" : "✅ تم إلغاء ربط الإعلان بالمعرض" });
      refetchPending();
      refetchCars();
    } catch {
      toast({ title: "حدث خطأ أثناء ربط المعرض", variant: "destructive" });
    } finally {
      setLinkingCarId(null);
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

  const handleDealerToggle = async (id: number, field: "isVerified" | "isFeaturedSeller", currentVal: boolean) => {
    try {
      await apiRequest(`/api/admin/dealers/${id}`, "PATCH", { [field]: !currentVal });
      toast({ title: "تم التحديث بنجاح" });
      refetchDealers();
    } catch { toast({ title: "حدث خطأ", variant: "destructive" }); }
  };

  const handlePromoteDealer = async (id: number) => {
    if (!confirm("هل تريد ترقية هذا المستخدم إلى تاجر وتوثيقه؟")) return;
    try {
      await apiRequest(`/api/admin/users/${id}/promote-dealer`, "PATCH", {});
      toast({ title: "تم ترقية المستخدم إلى تاجر" });
      refetchUsers();
      refetchDealers();
    } catch { toast({ title: "حدث خطأ", variant: "destructive" }); }
  };

  const saveInspectionCenter = async () => {
    try {
      if (editingInspection) {
        await apiRequest(`/api/admin/inspection-centers/${editingInspection.id}`, "PATCH", inspectionForm);
        toast({ title: "تم تحديث مركز الفحص" });
      } else {
        await apiRequest("/api/admin/inspection-centers", "POST", inspectionForm);
        toast({ title: "تم إضافة مركز الفحص" });
      }
      setShowInspectionDialog(false);
      setInspectionForm(emptyCenterForm);
      setEditingInspection(null);
      refetchInspection();
    } catch { toast({ title: "حدث خطأ", variant: "destructive" }); }
  };

  const deleteInspectionCenter = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف مركز الفحص؟")) return;
    try {
      await apiRequest(`/api/admin/inspection-centers/${id}`, "DELETE");
      toast({ title: "تم حذف مركز الفحص" });
      refetchInspection();
    } catch { toast({ title: "حدث خطأ", variant: "destructive" }); }
  };

  const toggleInspectionField = async (id: number, field: "isVerified" | "isFeatured", current: boolean) => {
    try {
      await apiRequest(`/api/admin/inspection-centers/${id}`, "PATCH", { [field]: !current });
      toast({ title: "تم التحديث" });
      refetchInspection();
    } catch { toast({ title: "حدث خطأ", variant: "destructive" }); }
  };

  const saveScrapCenter = async () => {
    try {
      if (editingScrap) {
        await apiRequest(`/api/admin/scrap-centers/${editingScrap.id}`, "PATCH", scrapForm);
        toast({ title: "تم تحديث مركز الخردة" });
      } else {
        await apiRequest("/api/admin/scrap-centers", "POST", scrapForm);
        toast({ title: "تم إضافة مركز الخردة" });
      }
      setShowScrapDialog(false);
      setScrapForm(emptyCenterForm);
      setEditingScrap(null);
      refetchScrap();
    } catch { toast({ title: "حدث خطأ", variant: "destructive" }); }
  };

  const deleteScrapCenter = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف مركز الخردة؟")) return;
    try {
      await apiRequest(`/api/admin/scrap-centers/${id}`, "DELETE");
      toast({ title: "تم حذف مركز الخردة" });
      refetchScrap();
    } catch { toast({ title: "حدث خطأ", variant: "destructive" }); }
  };

  const toggleScrapField = async (id: number, field: "isVerified" | "isFeatured", current: boolean) => {
    try {
      await apiRequest(`/api/admin/scrap-centers/${id}`, "PATCH", { [field]: !current });
      toast({ title: "تم التحديث" });
      refetchScrap();
    } catch { toast({ title: "حدث خطأ", variant: "destructive" }); }
  };

  const saveShowroom = async () => {
    try {
      const payload = { name: showroomForm.name, city: showroomForm.city, address: showroomForm.address, phone: showroomForm.phone, whatsapp: showroomForm.whatsapp, email: showroomForm.email, description: showroomForm.description };
      if (editingShowroom) {
        await apiRequest(`/api/admin/showrooms/${editingShowroom.id}`, "PATCH", payload);
        toast({ title: "تم تحديث المعرض" });
      } else {
        await apiRequest("/api/admin/showrooms", "POST", payload);
        toast({ title: "تم إضافة المعرض" });
      }
      setShowShowroomDialog(false);
      setShowroomForm(emptyShowroomForm);
      setEditingShowroom(null);
      refetchShowrooms();
    } catch { toast({ title: "حدث خطأ", variant: "destructive" }); }
  };

  const deleteShowroom = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف المعرض؟")) return;
    try {
      await apiRequest(`/api/admin/showrooms/${id}`, "DELETE");
      toast({ title: "تم حذف المعرض" });
      refetchShowrooms();
    } catch { toast({ title: "حدث خطأ", variant: "destructive" }); }
  };

  const toggleShowroomField = async (id: number, field: "isVerified" | "isFeatured" | "isSuspended", current: boolean, ownerUserId?: number) => {
    try {
      await apiRequest(`/api/admin/showrooms/${id}`, "PATCH", { [field]: !current, ...(field === "isVerified" && ownerUserId ? { ownerUserId } : {}) });
      toast({ title: "تم التحديث" });
      refetchShowrooms();
    } catch { toast({ title: "حدث خطأ", variant: "destructive" }); }
  };

  const linkShowroomUser = async (showroomId: number) => {
    if (!linkUserEmail.trim()) return;
    try {
      const result = await apiRequest(`/api/admin/showrooms/${showroomId}/link-user`, "POST", { email: linkUserEmail });
      toast({ title: `تم ربط المعرض بـ ${(result as any).user?.name}` });
      setLinkUserEmail("");
      setLinkingShowroomId(null);
      refetchShowrooms();
    } catch { toast({ title: "لم يُعثر على مستخدم بهذا البريد", variant: "destructive" }); }
  };

  return (
    <div className="py-8 px-4 max-w-7xl mx-auto w-full min-h-[70vh]">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
          <Settings className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">لوحة الإدارة</h1>
          <p className="text-muted-foreground mt-1">إدارة المستخدمين، الإعلانات، وإعدادات المنصة</p>
        </div>
        <Link href="/admin/system-audit">
          <Button variant="outline" className="gap-2 rounded-xl border-green-300 text-green-700 hover:bg-green-50 hidden sm:flex">
            <ShieldCheck className="w-4 h-4" /> تدقيق النظام
          </Button>
        </Link>
      </div>

      {/* Dashboard stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: "المستخدمين", value: adminStats?.totalUsers ?? dashboard?.usersCount, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "التجار", value: adminStats?.totalDealers, icon: Store, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "المعارض", value: adminStats?.totalShowrooms, icon: Building2, color: "text-primary", bg: "bg-primary/10" },
          { label: "الإعلانات", value: adminStats?.totalListings ?? dashboard?.listingsCount, icon: Car, color: "text-green-600", bg: "bg-green-50" },
          { label: "مراكز الفحص", value: adminStats?.totalInspectionCenters, icon: Building2, color: "text-cyan-600", bg: "bg-cyan-50" },
          { label: "مراكز الخردة", value: adminStats?.totalScrapCenters, icon: Recycle, color: "text-orange-600", bg: "bg-orange-50" },
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
        <TabsList className="grid w-full grid-cols-5 mb-2 h-auto bg-muted/50 rounded-xl p-1 gap-1">
          <TabsTrigger value="users" className="rounded-lg font-bold text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5">
            <Users className="w-4 h-4 ml-1" /> المستخدمين
          </TabsTrigger>
          <TabsTrigger value="dealers" className="rounded-lg font-bold text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5">
            <Store className="w-4 h-4 ml-1 text-violet-500" /> التجار
          </TabsTrigger>
          <TabsTrigger value="showrooms" className="rounded-lg font-bold text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5">
            <Building2 className="w-4 h-4 ml-1 text-primary" /> المعارض
          </TabsTrigger>
          <TabsTrigger value="inspection" className="rounded-lg font-bold text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5">
            <Building2 className="w-4 h-4 ml-1 text-cyan-500" /> مراكز الفحص
          </TabsTrigger>
          <TabsTrigger value="scrap" className="rounded-lg font-bold text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5">
            <Recycle className="w-4 h-4 ml-1 text-orange-500" /> مراكز الخردة
          </TabsTrigger>
        </TabsList>
        <TabsList className="grid w-full grid-cols-4 mb-8 h-auto bg-muted/50 rounded-xl p-1 gap-1">
          <TabsTrigger value="review" className="rounded-lg font-bold text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5 relative">
            <AlertTriangle className="w-4 h-4 ml-1 text-red-500" /> مراجعة
            {totalReviewPending > 0 && (
              <span className="absolute -top-1.5 -left-1.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center animate-pulse">
                {totalReviewPending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="listings" className="rounded-lg font-bold text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5">
            <Car className="w-4 h-4 ml-1" /> الإعلانات
          </TabsTrigger>
          <TabsTrigger value="inbox" className="rounded-lg font-bold text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5 relative">
            <Inbox className="w-4 h-4 ml-1 text-blue-500" /> الرسائل
            {totalInboxUnread > 0 && (
              <span className="absolute -top-1.5 -left-1.5 bg-blue-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center animate-pulse">
                {totalInboxUnread}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg font-bold text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5">
            <Settings className="w-4 h-4 ml-1" /> الإعدادات
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
                  <TableHead className="text-center">مميّز</TableHead>
                  <TableHead className="text-center">اشتراك</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingUsers ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : !users?.length ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">لا يوجد مستخدمين</TableCell></TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id} className={(u as any).isBanned ? "opacity-50" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          {u.isVerified && <Badge className="bg-green-500 hover:bg-green-600 text-xs mt-0.5">موثق</Badge>}
                        </div>
                      </TableCell>
                      <TableCell dir="ltr" className="text-right">{u.phone}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'admin' ? 'default' : (u.role === 'dealer' || u.role === 'seller') ? 'secondary' : 'outline'}>
                          {u.role === 'admin' ? 'مدير' : u.role === 'dealer' ? 'تاجر' : u.role === 'seller' ? 'بائع' : u.role === 'inspector' ? 'فاحص' : 'مشتري'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="ghost" title={u.isPremium ? "إلغاء المميّز" : "منح المميّز"} className={u.isPremium ? "text-amber-500" : "text-muted-foreground"} onClick={() => apiRequest(`/api/admin/users/${u.id}`, "PATCH", { isPremium: !u.isPremium }).then(() => refetchUsers()).catch(() => {})}>
                          <Star className={`w-5 h-5 ${u.isPremium ? "fill-amber-500" : ""}`} />
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="ghost" title={(u as any).subscriptionActive ? "إلغاء الاشتراك" : "تفعيل الاشتراك"} className={(u as any).subscriptionActive ? "text-violet-600" : "text-muted-foreground"} onClick={() => apiRequest(`/api/admin/users/${u.id}`, "PATCH", { subscriptionActive: !(u as any).subscriptionActive }).then(() => refetchUsers()).catch(() => {})}>
                          <CheckCircle className={`w-5 h-5 ${(u as any).subscriptionActive ? "fill-violet-100" : ""}`} />
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!u.isVerified && u.role !== 'admin' && (
                            <Button size="sm" variant="outline" title="توثيق" className="h-7 w-7 p-0 border-green-500 text-green-600 hover:bg-green-50" onClick={() => handleUserAction(u.id, 'verify')}>
                              <CheckCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {u.role !== 'admin' && !(u as any).isBanned && (
                            <Button size="sm" variant="outline" title="حظر" className="h-7 w-7 p-0 border-orange-500 text-orange-600 hover:bg-orange-50" onClick={() => handleUserAction(u.id, 'ban')}>
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {(u as any).isBanned && (
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => handleUserAction(u.id, 'unban')}>
                              رفع الحظر
                            </Button>
                          )}
                          {u.role !== 'admin' && (
                            <Button size="sm" variant="outline" title="حذف" className="h-7 w-7 p-0 border-red-500 text-red-600 hover:bg-red-50" onClick={() => handleUserAction(u.id, 'delete')}>
                              <Trash2 className="w-3.5 h-3.5" />
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

        {/* Dealers Tab */}
        <TabsContent value="dealers" className="bg-card border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-violet-50 dark:bg-violet-950/10">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2"><Store className="w-5 h-5 text-violet-600" /> إدارة التجار</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{dealers.length} تاجر مسجّل</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchDealers()}><RefreshCw className="w-4 h-4 ml-2" /> تحديث</Button>
          </div>
          <div className="p-4 border-b">
            <Input
              placeholder="بحث بالاسم أو الهاتف أو المعرض..."
              value={dealerSearch}
              onChange={e => setDealerSearch(e.target.value)}
              className="max-w-sm"
              dir="rtl"
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-right">التاجر</TableHead>
                  <TableHead className="text-right">المعرض / الهاتف</TableHead>
                  <TableHead className="text-right">المدينة</TableHead>
                  <TableHead className="text-center">موثّق</TableHead>
                  <TableHead className="text-center">مميّز</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingDealers ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : dealers.filter(d => !dealerSearch || d.name?.includes(dealerSearch) || d.phone?.includes(dealerSearch) || d.showroomName?.includes(dealerSearch)).length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">لا يوجد تجار</TableCell></TableRow>
                ) : dealers.filter(d => !dealerSearch || d.name?.includes(dealerSearch) || d.phone?.includes(dealerSearch) || d.showroomName?.includes(dealerSearch)).map((dealer) => (
                  <TableRow key={dealer.id}>
                    <TableCell>
                      <div>
                        <p className="font-bold">{dealer.name}</p>
                        <p className="text-xs text-muted-foreground">{dealer.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {dealer.showroomName && <p className="font-medium text-sm">{dealer.showroomName}</p>}
                        <p className="text-xs text-muted-foreground" dir="ltr">{dealer.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>{dealer.city || "—"}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm" variant="ghost"
                        className={dealer.isVerified ? "text-green-600" : "text-muted-foreground"}
                        onClick={() => handleDealerToggle(dealer.id, "isVerified", dealer.isVerified)}
                        title={dealer.isVerified ? "إلغاء التوثيق" : "توثيق التاجر"}
                      >
                        {dealer.isVerified ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm" variant="ghost"
                        className={dealer.isFeaturedSeller ? "text-amber-500" : "text-muted-foreground"}
                        onClick={() => handleDealerToggle(dealer.id, "isFeaturedSeller", dealer.isFeaturedSeller)}
                        title={dealer.isFeaturedSeller ? "إلغاء التمييز" : "جعله مميزاً"}
                      >
                        <Star className={`w-5 h-5 ${dealer.isFeaturedSeller ? "fill-amber-500" : ""}`} />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="outline" className="h-8 border-red-400 text-red-600 hover:bg-red-50" onClick={() => handleUserAction(dealer.id, 'delete')}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 border-t bg-muted/10">
            <p className="text-xs text-muted-foreground">لترقية مستخدم إلى تاجر، انتقل إلى تبويب <strong>المستخدمين</strong> وعدّل دوره.</p>
          </div>
        </TabsContent>

        {/* Inspection Centers Tab */}
        <TabsContent value="inspection" className="bg-card border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-cyan-50 dark:bg-cyan-950/10">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2"><Building2 className="w-5 h-5 text-cyan-600" /> مراكز الفحص</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{inspectionCenters.length} مركز مسجّل</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchInspection()}><RefreshCw className="w-4 h-4 ml-2" /> تحديث</Button>
              <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white gap-1" onClick={() => { setEditingInspection(null); setInspectionForm(emptyCenterForm); setShowInspectionDialog(true); }}>
                <Plus className="w-4 h-4" /> إضافة مركز
              </Button>
            </div>
          </div>
          <div className="p-4 border-b">
            <Input placeholder="بحث بالاسم أو المدينة..." value={inspectionSearch} onChange={e => setInspectionSearch(e.target.value)} className="max-w-sm" dir="rtl" />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">المدينة</TableHead>
                  <TableHead className="text-right">الهاتف / واتساب</TableHead>
                  <TableHead className="text-center">موثّق</TableHead>
                  <TableHead className="text-center">مميّز</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingInspection ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : inspectionCenters.filter(c => !inspectionSearch || c.name?.includes(inspectionSearch) || c.city?.includes(inspectionSearch)).length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">لا يوجد مراكز فحص</TableCell></TableRow>
                ) : inspectionCenters.filter(c => !inspectionSearch || c.name?.includes(inspectionSearch) || c.city?.includes(inspectionSearch)).map((center) => (
                  <TableRow key={center.id}>
                    <TableCell className="font-medium">{center.name}</TableCell>
                    <TableCell>{center.city}</TableCell>
                    <TableCell>
                      <div dir="ltr" className="text-sm">
                        {center.phone && <p>{center.phone}</p>}
                        {center.whatsapp && <p className="text-green-600">{center.whatsapp}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" className={center.isVerified ? "text-green-600" : "text-muted-foreground"} onClick={() => toggleInspectionField(center.id, "isVerified", !!center.isVerified)}>
                        {center.isVerified ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" className={center.isFeatured ? "text-amber-500" : "text-muted-foreground"} onClick={() => toggleInspectionField(center.id, "isFeatured", !!center.isFeatured)}>
                        <Star className={`w-5 h-5 ${center.isFeatured ? "fill-amber-500" : ""}`} />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <Button size="sm" variant="outline" className="h-8" onClick={() => { setEditingInspection(center); setInspectionForm({ name: center.name, city: center.city, address: center.address || "", phone: center.phone || "", whatsapp: center.whatsapp || "", description: center.description || "" }); setShowInspectionDialog(true); }}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 border-red-400 text-red-600 hover:bg-red-50" onClick={() => deleteInspectionCenter(center.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Scrap Centers Tab */}
        <TabsContent value="scrap" className="bg-card border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-orange-50 dark:bg-orange-950/10">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2"><Recycle className="w-5 h-5 text-orange-600" /> مراكز الخردة</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{scrapCenters.length} مركز مسجّل</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchScrap()}><RefreshCw className="w-4 h-4 ml-2" /> تحديث</Button>
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white gap-1" onClick={() => { setEditingScrap(null); setScrapForm(emptyCenterForm); setShowScrapDialog(true); }}>
                <Plus className="w-4 h-4" /> إضافة مركز
              </Button>
            </div>
          </div>
          <div className="p-4 border-b">
            <Input placeholder="بحث بالاسم أو المدينة..." value={scrapSearch} onChange={e => setScrapSearch(e.target.value)} className="max-w-sm" dir="rtl" />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">المدينة / العنوان</TableHead>
                  <TableHead className="text-right">الهاتف / واتساب</TableHead>
                  <TableHead className="text-center">موثّق</TableHead>
                  <TableHead className="text-center">مميّز</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingScrap ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : scrapCenters.filter(c => !scrapSearch || c.name?.includes(scrapSearch) || c.city?.includes(scrapSearch)).length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">لا يوجد مراكز خردة</TableCell></TableRow>
                ) : scrapCenters.filter(c => !scrapSearch || c.name?.includes(scrapSearch) || c.city?.includes(scrapSearch)).map((center) => (
                  <TableRow key={center.id}>
                    <TableCell className="font-medium">{center.name}</TableCell>
                    <TableCell>
                      <div>
                        <p>{center.city}</p>
                        {center.address && <p className="text-xs text-muted-foreground">{center.address}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div dir="ltr" className="text-sm">
                        {center.phone && <p>{center.phone}</p>}
                        {center.whatsapp && <p className="text-green-600">{center.whatsapp}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" className={center.isVerified ? "text-green-600" : "text-muted-foreground"} onClick={() => toggleScrapField(center.id, "isVerified", !!center.isVerified)}>
                        {center.isVerified ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" className={center.isFeatured ? "text-amber-500" : "text-muted-foreground"} onClick={() => toggleScrapField(center.id, "isFeatured", !!center.isFeatured)}>
                        <Star className={`w-5 h-5 ${center.isFeatured ? "fill-amber-500" : ""}`} />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <Button size="sm" variant="outline" className="h-8" onClick={() => { setEditingScrap(center); setScrapForm({ name: center.name, city: center.city, address: center.address || "", phone: center.phone || "", whatsapp: center.whatsapp || "", description: center.description || "" }); setShowScrapDialog(true); }}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 border-red-400 text-red-600 hover:bg-red-50" onClick={() => deleteScrapCenter(center.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Showrooms Tab */}
        <TabsContent value="showrooms" className="bg-card border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-primary/5">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> معارض السيارات</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{showrooms.length} معرض مسجّل</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchShowrooms()}><RefreshCw className="w-4 h-4 ml-2" /> تحديث</Button>
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-white gap-1" onClick={() => { setEditingShowroom(null); setShowroomForm(emptyShowroomForm); setShowShowroomDialog(true); }}>
                <Plus className="w-4 h-4" /> إضافة معرض
              </Button>
            </div>
          </div>
          <div className="p-4 border-b">
            <Input placeholder="بحث بالاسم أو المدينة أو المالك..." value={showroomSearch} onChange={e => setShowroomSearch(e.target.value)} className="max-w-sm" dir="rtl" />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-right">المعرض</TableHead>
                  <TableHead className="text-right">المالك</TableHead>
                  <TableHead className="text-right">المدينة / الهاتف</TableHead>
                  <TableHead className="text-center">موثّق</TableHead>
                  <TableHead className="text-center">مميّز</TableHead>
                  <TableHead className="text-center">موقوف</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingShowrooms ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : showrooms.filter(s => !showroomSearch || s.name?.includes(showroomSearch) || s.city?.includes(showroomSearch) || s.ownerName?.includes(showroomSearch)).length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">لا يوجد معارض</TableCell></TableRow>
                ) : showrooms.filter(s => !showroomSearch || s.name?.includes(showroomSearch) || s.city?.includes(showroomSearch) || s.ownerName?.includes(showroomSearch)).map((showroom) => (
                  <TableRow key={showroom.id} className={showroom.isSuspended ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {showroom.logo ? (
                          <img src={showroom.logo} alt="" className="w-9 h-9 rounded-lg object-cover border" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center border">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold">{showroom.name}</p>
                          {showroom.email && <p className="text-xs text-muted-foreground">{showroom.email}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {showroom.ownerName ? (
                        <div>
                          <p className="text-sm font-medium">{showroom.ownerName}</p>
                          <p className="text-xs text-muted-foreground" dir="ltr">{showroom.ownerPhone}</p>
                        </div>
                      ) : (
                        linkingShowroomId === showroom.id ? (
                          <div className="flex gap-1">
                            <Input className="h-7 text-xs w-32" placeholder="بريد إلكتروني" value={linkUserEmail} onChange={e => setLinkUserEmail(e.target.value)} dir="ltr" />
                            <Button size="sm" className="h-7 text-xs" onClick={() => linkShowroomUser(showroom.id)}>ربط</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setLinkingShowroomId(showroom.id)}>ربط مستخدم</Button>
                        )
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{showroom.city}</p>
                        {showroom.phone && <p className="text-xs text-muted-foreground" dir="ltr">{showroom.phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" className={showroom.isVerified ? "text-green-600" : "text-muted-foreground"} onClick={() => toggleShowroomField(showroom.id, "isVerified", showroom.isVerified, showroom.ownerUserId)}>
                        {showroom.isVerified ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" className={showroom.isFeatured ? "text-amber-500" : "text-muted-foreground"} onClick={() => toggleShowroomField(showroom.id, "isFeatured", showroom.isFeatured)}>
                        <Star className={`w-5 h-5 ${showroom.isFeatured ? "fill-amber-500" : ""}`} />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" className={showroom.isSuspended ? "text-red-600" : "text-muted-foreground"} onClick={() => toggleShowroomField(showroom.id, "isSuspended", showroom.isSuspended)} title={showroom.isSuspended ? "رفع الإيقاف" : "إيقاف المعرض"}>
                        {showroom.isSuspended ? <Ban className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <Button size="sm" variant="outline" className="h-8" onClick={() => { setEditingShowroom(showroom); setShowroomForm({ name: showroom.name, city: showroom.city, address: showroom.address || "", phone: showroom.phone || "", whatsapp: showroom.whatsapp || "", email: showroom.email || "", description: showroom.description || "", ownerEmail: showroom.ownerEmail || "" }); setShowShowroomDialog(true); }}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 border-red-400 text-red-600 hover:bg-red-50" onClick={() => deleteShowroom(showroom.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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

                          {/* ── ربط بمعرض ── */}
                          {showrooms.length > 0 && (
                            <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
                              <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5" /> ربط الإعلان بمعرض (اختياري)
                              </p>
                              <div className="flex gap-2">
                                <select
                                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-right"
                                  value={carShowroomSelections[car.id] ?? (car.showroomId ? String(car.showroomId) : "")}
                                  onChange={e => setCarShowroomSelections(prev => ({ ...prev, [car.id]: e.target.value }))}
                                  dir="rtl"
                                >
                                  <option value="">— بدون معرض —</option>
                                  {showrooms.map((sr: any) => (
                                    <option key={sr.id} value={String(sr.id)}>{sr.name} ({sr.city})</option>
                                  ))}
                                </select>
                                <Button
                                  size="sm"
                                  className="h-9 gap-1.5 shrink-0"
                                  disabled={linkingCarId === car.id}
                                  onClick={() => linkCarToShowroom(car.id, carShowroomSelections[car.id] ?? "")}
                                >
                                  {linkingCarId === car.id
                                    ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                                    : <Building2 className="w-3.5 h-3.5" />}
                                  ربط
                                </Button>
                              </div>
                              {car.showroomId && (
                                <p className="text-[10px] text-primary mt-1.5 flex items-center gap-1">
                                  <Building2 className="w-3 h-3" /> مربوط بمعرض — اختر "بدون معرض" لإلغاء الربط
                                </p>
                              )}
                            </div>
                          )}

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

          {/* ===== Buy Requests sub-section ===== */}
          <div className="border-t-4 border-border mt-2">
          <div className="p-5 border-b flex justify-between items-center bg-blue-50/50 dark:bg-blue-950/10">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CartIcon className="w-5 h-5 text-primary" /> طلبات شراء السيارات
                {pendingBuyRequests.length > 0 && (
                  <Badge className="bg-amber-500 hover:bg-amber-600">{pendingBuyRequests.length} معلق</Badge>
                )}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">{adminCarBuyRequests.length} طلب إجمالاً</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchBuyRequests()}><RefreshCw className="w-4 h-4 ml-2" /> تحديث</Button>
          </div>
          <div className="p-4 space-y-3">
            {adminCarBuyRequests.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">لا توجد طلبات شراء سيارات</div>
            ) : adminCarBuyRequests.map((r: any) => (
              <div key={r.id} className="border rounded-xl p-4 bg-background flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-bold text-foreground">{r.brand || "أي ماركة"} {r.model || ""}</p>
                    <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                      {r.status === "approved" ? "موافق عليه" : r.status === "rejected" ? "مرفوض" : "معلق"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {r.maxPrice && <span className="text-primary font-bold">حتى {Number(r.maxPrice).toLocaleString()} {r.currency ?? "USD"}</span>}
                    {r.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.city}</span>}
                    {r.userName && <span>المستخدم: {r.userName}</span>}
                    {r.userPhone && <span dir="ltr">{r.userPhone}</span>}
                  </div>
                  {r.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{r.description}</p>}
                  <p className="text-xs text-muted-foreground/60 mt-1">{new Date(r.createdAt).toLocaleDateString("ar-EG")}</p>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                  <Button size="sm" variant="outline" className="h-8 gap-1 border-primary/40 text-primary hover:bg-primary/5" onClick={() => setPreviewBuyRequest(r)}>
                    <Eye className="w-3.5 h-3.5" /> معاينة
                  </Button>
                  {r.status === "pending" && (
                    <>
                      <Button size="sm" className="h-8 bg-green-500 hover:bg-green-600 text-white" onClick={() => handleBuyRequestStatus(r.id, "approved")}>
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 border-red-400 text-red-600 hover:bg-red-50" onClick={() => handleBuyRequestStatus(r.id, "rejected")}>
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive" title="حذف الطلب"
                    onClick={async () => {
                      if (!confirm(`حذف طلب شراء "${r.brand || "هذا الطلب"}"؟`)) return;
                      try { await api.delete(`/api/admin/buy-requests/${r.id}`); toast({ title: "✅ تم حذف طلب الشراء" }); refetchBuyRequests(); }
                      catch { toast({ title: "حدث خطأ أثناء الحذف", variant: "destructive" }); }
                    }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          </div>{/* end buy-requests sub-section */}

          {/* ===== Car Parts Buy Requests sub-section ===== */}
          <div className="border-t-4 border-border mt-2">
            <div className="p-5 border-b flex justify-between items-center bg-orange-50/50 dark:bg-orange-950/10">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-orange-500" /> طلبات شراء قطع السيارات
                  {pendingPartRequests.length > 0 && (
                    <Badge className="bg-orange-500 hover:bg-orange-600 text-white">{pendingPartRequests.length} معلق</Badge>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">{adminPartsBuyRequests.length} طلب إجمالاً</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchBuyRequests()}><RefreshCw className="w-4 h-4 ml-2" /> تحديث</Button>
            </div>
            <div className="p-4 space-y-3">
              {adminPartsBuyRequests.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">لا توجد طلبات شراء قطع</div>
              ) : adminPartsBuyRequests.map((r: any) => (
                <div key={r.id} className="border rounded-xl p-4 bg-background flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Wrench className="w-3 h-3" /> قطعة
                      </span>
                      <p className="font-bold text-foreground">{r.brand || "قطعة غير محددة"}</p>
                      <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                        {r.status === "approved" ? "موافق عليه" : r.status === "rejected" ? "مرفوض" : "معلق"}
                      </Badge>
                    </div>
                    {r.model && <p className="text-sm text-muted-foreground">نوع السيارة: {r.model}</p>}
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                      {r.maxPrice && <span className="text-primary font-bold">حتى {Number(r.maxPrice).toLocaleString()} {r.currency ?? "USD"}</span>}
                      {r.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.city}</span>}
                      {r.userName && <span>المستخدم: {r.userName}</span>}
                      {r.userPhone && <span dir="ltr">{r.userPhone}</span>}
                    </div>
                    {r.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                    <p className="text-xs text-muted-foreground/60 mt-1">{new Date(r.createdAt).toLocaleDateString("ar-EG")}</p>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                    <Button size="sm" variant="outline" className="h-8 gap-1 border-orange-400/60 text-orange-600 hover:bg-orange-50" onClick={() => setPreviewBuyRequest(r)}>
                      <Eye className="w-3.5 h-3.5" /> معاينة
                    </Button>
                    {r.status === "pending" && (
                      <>
                        <Button size="sm" className="h-8 bg-green-500 hover:bg-green-600 text-white" onClick={() => handleBuyRequestStatus(r.id, "approved")}>
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 border-red-400 text-red-600 hover:bg-red-50" onClick={() => handleBuyRequestStatus(r.id, "rejected")}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive" title="حذف الطلب"
                      onClick={async () => {
                        if (!confirm(`حذف طلب قطعة "${r.brand || "هذا الطلب"}"؟`)) return;
                        try { await api.delete(`/api/admin/buy-requests/${r.id}`); toast({ title: "✅ تم حذف طلب القطعة" }); refetchBuyRequests(); }
                        catch { toast({ title: "حدث خطأ أثناء الحذف", variant: "destructive" }); }
                      }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>{/* end car parts buy-requests sub-section */}

          {/* ===== Rental Cars Pending Approval sub-section ===== */}
          <div className="border-t-4 border-border mt-2">
            <div className="p-5 border-b flex justify-between items-center bg-blue-50/50 dark:bg-blue-950/10">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  🚗 إعلانات التأجير المعلقة
                  {pendingRentals.length > 0 && (
                    <Badge className="bg-blue-600 hover:bg-blue-700 text-white">{pendingRentals.length} معلق</Badge>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">إعلانات تأجير السيارات بانتظار الموافقة</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchRentals()}><RefreshCw className="w-4 h-4 ml-2" /> تحديث</Button>
            </div>
            <div className="p-4 space-y-3">
              {pendingRentals.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="font-bold">لا توجد إعلانات تأجير معلقة</p>
                </div>
              ) : pendingRentals.map((r: any) => (
                <div key={r.id} className="border-2 border-blue-200 rounded-2xl p-4 bg-background flex items-start justify-between gap-4 hover:shadow-md transition-shadow">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-foreground text-base">{[r.brand, r.model, r.year].filter(Boolean).join(" ") || "سيارة للإيجار"}</p>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">معلق للمراجعة</Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {r.dailyPrice && <span className="text-primary font-bold">${r.dailyPrice} / يوم</span>}
                      {r.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.city}</span>}
                      {(r.sellerName || r.userName) && <span>المالك: {r.sellerName || r.userName}</span>}
                      {r.sellerPhone && <span dir="ltr">{r.sellerPhone}</span>}
                    </div>
                    {r.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                    {r.createdAt && <p className="text-xs text-muted-foreground/60 mt-1">{new Date(r.createdAt).toLocaleDateString("ar-EG")}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                      onClick={() => { setPreviewRental(r); setPreviewRentalImgIdx(0); }}
                    >
                      <Eye className="w-4 h-4" /> معاينة
                    </Button>
                    <Button
                      size="sm"
                      className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                      onClick={() => handleRentalApproval(r.id, "approve")}
                    >
                      <CheckCircle className="w-4 h-4" /> موافقة
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 border-red-400 text-red-600 hover:bg-red-50 gap-1.5"
                      onClick={() => handleRentalApproval(r.id, "reject")}
                    >
                      <XCircle className="w-4 h-4" /> رفض
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>{/* end rental-cars sub-section */}

          {/* Car Parts Pending */}
          <div className="border-t-4 border-border mt-2">
            <div className="p-5 border-b flex justify-between items-center bg-orange-50/50 dark:bg-orange-950/10">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-orange-600" /> قطع السيارات المعلقة
                  {pendingCarParts.length > 0 && (
                    <Badge className="bg-orange-600 hover:bg-orange-700 text-white">{pendingCarParts.length} معلق</Badge>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">إعلانات قطع الغيار بانتظار الموافقة</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchCarParts()}><RefreshCw className="w-4 h-4 ml-2" /> تحديث</Button>
            </div>
            <div className="p-4 space-y-3">
              {pendingCarParts.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="font-bold">لا توجد قطع معلقة</p>
                </div>
              ) : pendingCarParts.map((p: any) => (
                <div key={p.id} className="border-2 border-orange-200 rounded-2xl p-4 bg-background hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      {p.images?.[0] && <img src={p.images[0]} alt={p.name} className="w-16 h-16 rounded-xl object-cover border shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-bold text-foreground">{p.name}</p>
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">معلق</Badge>
                          {p.condition && <Badge variant="outline" className="text-xs">{p.condition}</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          {p.price && <span className="text-primary font-bold">${Number(p.price).toLocaleString()}</span>}
                          {p.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.city}</span>}
                          {p.sellerName && <span>البائع: {p.sellerName}</span>}
                          {(p.carType || p.model) && <span>{[p.carType, p.model, p.year].filter(Boolean).join(" • ")}</span>}
                        </div>
                        {p.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                      <Button size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" onClick={() => handleCarPartApproval(p.id, "approve")}>
                        <CheckCircle className="w-4 h-4" /> موافقة
                      </Button>
                      <Button size="sm" variant="outline" className="h-9 border-red-400 text-red-600 hover:bg-red-50 gap-1.5" onClick={() => handleCarPartApproval(p.id, "reject")}>
                        <XCircle className="w-4 h-4" /> رفض
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>{/* end car-parts sub-section */}

          {/* Junk Cars Pending */}
          <div className="border-t-4 border-border mt-2">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/10">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  🚗 السيارات المعطوبة المعلقة
                  {pendingJunkCars.length > 0 && (
                    <Badge className="bg-slate-600 hover:bg-slate-700 text-white">{pendingJunkCars.length} معلق</Badge>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">إعلانات السيارات المعطوبة والخردة بانتظار الموافقة</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchJunkCarsAdmin()}><RefreshCw className="w-4 h-4 ml-2" /> تحديث</Button>
            </div>
            <div className="p-4 space-y-3">
              {pendingJunkCars.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="font-bold">لا توجد سيارات معطوبة معلقة</p>
                </div>
              ) : pendingJunkCars.map((j: any) => (
                <div key={j.id} className="border-2 border-slate-200 rounded-2xl p-4 bg-background hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      {j.images?.[0] && <img src={j.images[0]} alt={j.type ?? "خردة"} className="w-16 h-16 rounded-xl object-cover border shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-bold text-foreground">{[j.type, j.model, j.year].filter(Boolean).join(" ") || "سيارة معطوبة"}</p>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-xs">معلق</Badge>
                          {j.condition && <Badge className={j.condition === "خردة كاملة" ? "bg-destructive/10 text-destructive text-xs" : "bg-amber-100 text-amber-700 text-xs"}>{j.condition}</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          {j.price && <span className="text-primary font-bold">${Number(j.price).toLocaleString()}</span>}
                          {j.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{j.city}</span>}
                          {j.sellerName && <span>البائع: {j.sellerName}</span>}
                        </div>
                        {j.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{j.description}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                      <Button size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" onClick={() => handleJunkCarApproval(j.id, "approve")}>
                        <CheckCircle className="w-4 h-4" /> موافقة
                      </Button>
                      <Button size="sm" variant="outline" className="h-9 border-red-400 text-red-600 hover:bg-red-50 gap-1.5" onClick={() => handleJunkCarApproval(j.id, "reject")}>
                        <XCircle className="w-4 h-4" /> رفض
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>{/* end junk-cars sub-section */}

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
                  <TableHead className="text-center">التمييز</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingCars ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : !carsData?.cars?.length ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">لا يوجد إعلانات</TableCell></TableRow>
                ) : (
                  carsData.cars.map((car) => (
                    <TableRow key={car.id} className={(car as any).isFeatured ? "bg-amber-50/40 dark:bg-amber-900/10" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          {(car as any).isFeatured && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                          {(car as any).isHighlighted && <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                          {car.brand} {car.model}
                        </div>
                      </TableCell>
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
                            className={`h-8 px-2 ${(car as any).isFeatured ? "border-amber-500 bg-amber-50 text-amber-600 hover:bg-amber-100" : "border-muted-foreground/30 text-muted-foreground hover:border-amber-400 hover:text-amber-500"}`}
                            onClick={() => handleFeatureToggle(car.id, "isFeatured", !!(car as any).isFeatured)}
                            title={(car as any).isFeatured ? "إلغاء التمييز" : "تمييز الإعلان"}
                          >
                            <Star className={`w-4 h-4 ${(car as any).isFeatured ? "fill-amber-500" : ""}`} />
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            className={`h-8 px-2 ${(car as any).isHighlighted ? "border-blue-500 bg-blue-50 text-blue-600 hover:bg-blue-100" : "border-muted-foreground/30 text-muted-foreground hover:border-blue-400 hover:text-blue-500"}`}
                            onClick={() => handleFeatureToggle(car.id, "isHighlighted", !!(car as any).isHighlighted)}
                            title={(car as any).isHighlighted ? "إلغاء الإبراز" : "إبراز الإعلان"}
                          >
                            <Sparkles className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            className={`h-8 px-2 ${!(car as any).isActive ? "border-red-500 bg-red-50 text-red-600 hover:bg-red-100" : "border-muted-foreground/30 text-muted-foreground hover:border-red-400 hover:text-red-500"}`}
                            onClick={() => handleFeatureToggle(car.id, "isActive", !!(car as any).isActive)}
                            title={(car as any).isActive ? "إخفاء من المميزة" : "إظهار في المميزة"}
                          >
                            {(car as any).isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                        </div>
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

          {/* Scrap Listings Section */}
          <div className="border-t-4 border-border">
            <div className="p-5 border-b flex justify-between items-center bg-orange-50/50 dark:bg-orange-950/10">
              <h2 className="text-xl font-bold flex items-center gap-2">🔧 إعلانات السكراب والخردة
                <Badge variant="secondary">{adminJunkCars.length}</Badge>
              </h2>
              <Button variant="outline" size="sm" onClick={() => refetchJunkCars()}><RefreshCw className="w-4 h-4 ml-2" /> تحديث</Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-right">السيارة</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">السعر</TableHead>
                    <TableHead className="text-right">البائع</TableHead>
                    <TableHead className="text-right">المدينة</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminJunkCars.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد إعلانات سكراب</TableCell></TableRow>
                  ) : adminJunkCars.map((j: any) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-medium">{[j.type, j.model, j.year].filter(Boolean).join(" ") || "سيارة معطوبة"}</TableCell>
                      <TableCell><Badge variant="outline">{j.condition ?? "—"}</Badge></TableCell>
                      <TableCell>{j.price ? `$${Number(j.price).toLocaleString()}` : "—"}</TableCell>
                      <TableCell>{j.sellerName ?? "—"} {j.sellerPhone ? <span className="text-xs text-muted-foreground" dir="ltr"> ({j.sellerPhone})</span> : null}</TableCell>
                      <TableCell>{j.city ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-8" onClick={async () => {
                          if (!confirm("حذف هذا الإعلان؟")) return;
                          await api.delete(`/api/admin/junk-cars/${j.id}`);
                          refetchJunkCars();
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Inbox Tab */}
        <TabsContent value="inbox" className="space-y-6">

          {/* Auction Requests — dedicated section */}
          {(() => {
            const auctionReqs = (supportMessages as any[]).filter(m => m.type === "auction_request");
            if (auctionReqs.length === 0) return null;
            return (
              <div className="bg-card border-2 border-primary/30 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b flex justify-between items-center bg-primary/5">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <span className="text-xl">🏁</span> طلبات شراء عبر المزادات
                    <Badge className="bg-primary text-white">{auctionReqs.length}</Badge>
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => refetchSupport()}><RefreshCw className="w-4 h-4 ml-2" /> تحديث</Button>
                </div>
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {auctionReqs.map((m: any) => (
                    <div key={m.id} className="border border-primary/20 rounded-xl p-4 bg-primary/5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary/20 text-primary border border-primary/30 text-xs">🏁 طلب مزاد</Badge>
                          <Badge variant={m.status === "open" ? "secondary" : "outline"} className="text-xs">
                            {m.status === "open" ? "مفتوح" : m.status === "closed" ? "مغلق" : m.status}
                          </Badge>
                          {m.userName && <span className="text-sm font-bold text-primary">{m.userName}</span>}
                          {!m.userName && <span className="text-sm text-muted-foreground">زائر</span>}
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleDateString("ar-EG")}</span>
                      </div>
                      {/* Render formatted message lines */}
                      <div className="bg-background rounded-lg p-3 space-y-1">
                        {m.message.split("\n").filter(Boolean).map((line: string, i: number) => (
                          <p key={i} className={`text-sm ${i === 0 ? "font-bold text-primary" : "text-foreground"}`} dir={line.startsWith("http") ? "ltr" : "rtl"}>
                            {line}
                          </p>
                        ))}
                      </div>
                      {m.userPhone && <p className="text-xs text-muted-foreground mt-2" dir="ltr">📞 {m.userPhone}</p>}
                      {m.userId && (
                        <div className="mt-3 pt-3 border-t flex justify-end">
                          <Button
                            size="sm"
                            className="h-8 gap-1.5 bg-primary text-white hover:bg-primary/90"
                            disabled={replyingTo === m.id}
                            onClick={() => handleAdminReply(m.userId, m.id)}
                          >
                            {replyingTo === m.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <MessageCircle className="w-3.5 h-3.5" />
                            }
                            رد على {m.userName || "المستخدم"}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Support Messages (non-auction) */}
          <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b flex justify-between items-center bg-muted/20">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" /> رسائل الدعم والشكاوي
                <Badge variant="secondary">{(supportMessages as any[]).filter(m => m.type !== "auction_request").length}</Badge>
              </h2>
              <Button variant="outline" size="sm" onClick={() => refetchSupport()}><RefreshCw className="w-4 h-4 ml-2" /> تحديث</Button>
            </div>
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {(supportMessages as any[]).filter(m => m.type !== "auction_request").length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">لا توجد رسائل</div>
              ) : (supportMessages as any[]).filter(m => m.type !== "auction_request").map((m: any) => (
                <div key={m.id} className="border rounded-xl p-4 bg-background">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {m.type === "complaint" ? "شكوى"
                          : m.type === "suggestion" ? "اقتراح"
                          : m.type === "missing_car" ? "سيارة مفقودة"
                          : m.type === "general" ? "عام"
                          : m.type === "auction_request" ? "🏁 طلب مزاد"
                          : m.type}
                      </Badge>
                      {m.userName && <span className="text-sm font-medium">{m.userName}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleDateString("ar-EG")}</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-line">{m.message}</p>
                  {m.userPhone && <p className="text-xs text-muted-foreground mt-1" dir="ltr">{m.userPhone}</p>}
                  {m.userId && (
                    <div className="mt-3 pt-3 border-t flex justify-end">
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                        variant="ghost"
                        disabled={replyingTo === m.id}
                        onClick={() => handleAdminReply(m.userId, m.id)}
                      >
                        {replyingTo === m.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <MessageCircle className="w-3.5 h-3.5" />
                        }
                        رد على {m.userName || "المستخدم"}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Feedback / Ratings */}
          <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b flex justify-between items-center bg-muted/20">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" /> تقييمات التطبيق
                <Badge variant="secondary">{(feedbackList as any[]).length}</Badge>
              </h2>
              <Button variant="outline" size="sm" onClick={() => refetchFeedback()}><RefreshCw className="w-4 h-4 ml-2" /> تحديث</Button>
            </div>
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {(feedbackList as any[]).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">لا توجد تقييمات</div>
              ) : (feedbackList as any[]).map((f: any) => (
                <div key={f.id} className="border rounded-xl p-4 bg-background">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      {f.userName && <p className="text-sm font-bold mb-0.5">{f.userName}</p>}
                      <p className="text-sm text-foreground">{f.feedback}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{new Date(f.createdAt).toLocaleDateString("ar-EG")}</span>
                  </div>
                  {f.userId && (
                    <div className="pt-2 border-t flex justify-end">
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                        variant="ghost"
                        disabled={replyingTo === f.id}
                        onClick={() => handleAdminReply(f.userId, f.id)}
                      >
                        {replyingTo === f.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <MessageCircle className="w-3.5 h-3.5" />
                        }
                        رد على {f.userName || "المستخدم"}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
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

      {/* ===== Buy Request Full Preview Dialog ===== */}
      {previewBuyRequest && (
      <Dialog open={!!previewBuyRequest} onOpenChange={(open) => { if (!open) setPreviewBuyRequest(null); }}>
        <DialogContent className="max-w-lg w-full rounded-2xl p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CartIcon className="w-5 h-5 text-primary" />
              تفاصيل طلب الشراء #{previewBuyRequest.id}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-5">
            {/* Status badge */}
            <div className="flex items-center gap-2 flex-wrap">
              {previewBuyRequest.category === "parts" && (
                <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <Wrench className="w-3 h-3" /> قطعة سيارة
                </span>
              )}
              <Badge variant={previewBuyRequest.status === "approved" ? "default" : previewBuyRequest.status === "rejected" ? "destructive" : "secondary"} className="text-sm px-3 py-1">
                {previewBuyRequest.status === "approved" ? "✓ موافق عليه" : previewBuyRequest.status === "rejected" ? "✗ مرفوض" : "⏳ معلق"}
              </Badge>
              <span className="text-xs text-muted-foreground">{new Date(previewBuyRequest.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</span>
            </div>

            {/* Info */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              <h3 className="font-bold text-base mb-2 flex items-center gap-2">
                {previewBuyRequest.category === "parts" ? <Wrench className="w-4 h-4 text-orange-500" /> : <Car className="w-4 h-4" />}
                {previewBuyRequest.category === "parts" ? "القطعة المطلوبة" : "المركبة المطلوبة"}
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="col-span-2">
                  <span className="text-muted-foreground">{previewBuyRequest.category === "parts" ? "اسم القطعة: " : "الماركة: "}</span>
                  <span className="font-medium">{previewBuyRequest.brand || (previewBuyRequest.category === "parts" ? "غير محدد" : "أي ماركة")}</span>
                </div>
                <div><span className="text-muted-foreground">{previewBuyRequest.category === "parts" ? "نوع السيارة: " : "الموديل: "}</span><span className="font-medium">{previewBuyRequest.model || "—"}</span></div>
                {previewBuyRequest.maxPrice && (
                  <div className="col-span-2"><span className="text-muted-foreground">الحد الأقصى للسعر: </span>
                    <span className="font-bold text-primary">{Number(previewBuyRequest.maxPrice).toLocaleString()} {previewBuyRequest.currency ?? "USD"}</span>
                  </div>
                )}
                {previewBuyRequest.city && (
                  <div className="col-span-2 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium">{previewBuyRequest.city}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {previewBuyRequest.description && (
              <div className="space-y-1">
                <p className="text-sm font-bold text-muted-foreground flex items-center gap-1"><FileText className="w-4 h-4" /> تفاصيل إضافية</p>
                <p className="text-sm leading-relaxed bg-muted/20 rounded-xl p-3 whitespace-pre-wrap">{previewBuyRequest.description}</p>
              </div>
            )}

            {/* Buyer info */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-1">
              <h3 className="font-bold text-sm mb-2 text-muted-foreground flex items-center gap-1"><Users className="w-4 h-4" /> معلومات المشتري</h3>
              {previewBuyRequest.userName && <p className="font-bold">{previewBuyRequest.userName}</p>}
              {previewBuyRequest.userPhone && (
                <p className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span dir="ltr" className="font-mono">{previewBuyRequest.userPhone}</span>
                </p>
              )}
            </div>

            {/* Action buttons */}
            {previewBuyRequest.status === "pending" && (
              <div className="flex gap-3 pt-1">
                <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-2 h-11 rounded-xl"
                  onClick={() => { handleBuyRequestStatus(previewBuyRequest.id, "approved"); setPreviewBuyRequest(null); }}>
                  <CheckCircle className="w-5 h-5" /> قبول الطلب
                </Button>
                <Button variant="outline" className="flex-1 border-red-400 text-red-600 hover:bg-red-50 gap-2 h-11 rounded-xl"
                  onClick={() => { handleBuyRequestStatus(previewBuyRequest.id, "rejected"); setPreviewBuyRequest(null); }}>
                  <XCircle className="w-5 h-5" /> رفض الطلب
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* ===== Rental Car Full Preview Dialog ===== */}
      {previewRental && (
      <Dialog open={!!previewRental} onOpenChange={(open) => { if (!open) setPreviewRental(null); }}>
        <DialogContent className="max-w-lg w-full rounded-2xl p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600" />
              معاينة إعلان التأجير — {[previewRental.brand, previewRental.model, previewRental.year].filter(Boolean).join(" ") || "سيارة للإيجار"}
            </DialogTitle>
          </DialogHeader>

          {/* Images */}
          <div className="bg-black relative">
            {(previewRental.images ?? []).length > 0 ? (
              <>
                <div className="relative h-60 overflow-hidden">
                  <img
                    src={(previewRental.images ?? [])[previewRentalImgIdx]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {(previewRental.images ?? []).length > 1 && (
                    <>
                      <button
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
                        onClick={() => setPreviewRentalImgIdx(i => (i + 1) % (previewRental.images ?? []).length)}
                      ><ChevronLeft className="w-4 h-4" /></button>
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
                        onClick={() => setPreviewRentalImgIdx(i => (i - 1 + (previewRental.images ?? []).length) % (previewRental.images ?? []).length)}
                      ><ChevronRight className="w-4 h-4" /></button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {(previewRental.images ?? []).map((_: any, i: number) => (
                          <button key={i} onClick={() => setPreviewRentalImgIdx(i)}
                            className={`w-2 h-2 rounded-full transition-all ${i === previewRentalImgIdx ? 'bg-white scale-125' : 'bg-white/50'}`} />
                        ))}
                      </div>
                      <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                        {previewRentalImgIdx + 1} / {(previewRental.images ?? []).length}
                      </span>
                    </>
                  )}
                </div>
                {(previewRental.images ?? []).length > 1 && (
                  <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-black/70">
                    {(previewRental.images ?? []).map((img: string, i: number) => (
                      <button key={i} onClick={() => setPreviewRentalImgIdx(i)}
                        className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === previewRentalImgIdx ? 'border-blue-400' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-white/60 gap-3">
                <ImageOff className="w-10 h-10" />
                <p className="text-sm">لم يرفع صاحب الإعلان أي صور</p>
              </div>
            )}
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Prices */}
            <div className="grid grid-cols-3 gap-3">
              {previewRental.dailyPrice && (
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 text-center border border-blue-200">
                  <p className="text-xs text-muted-foreground">يومي</p>
                  <p className="font-extrabold text-blue-700 text-base" dir="ltr">${previewRental.dailyPrice}</p>
                </div>
              )}
              {previewRental.weeklyPrice && (
                <div className="bg-muted/40 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">أسبوعي</p>
                  <p className="font-bold text-sm" dir="ltr">${previewRental.weeklyPrice}</p>
                </div>
              )}
              {previewRental.monthlyPrice && (
                <div className="bg-muted/40 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">شهري</p>
                  <p className="font-bold text-sm" dir="ltr">${previewRental.monthlyPrice}</p>
                </div>
              )}
            </div>

            {/* Location + Date */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              {previewRental.city && (
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{previewRental.city}</span>
              )}
              {previewRental.createdAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />{new Date(previewRental.createdAt).toLocaleDateString("ar-EG")}
                </span>
              )}
            </div>

            {/* Description */}
            {previewRental.description && (
              <div className="border rounded-xl p-4 bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground mb-2">وصف الإعلان</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{previewRental.description}</p>
              </div>
            )}

            {/* Owner info */}
            <div className="border rounded-xl p-4 flex items-center justify-between bg-muted/10">
              <div>
                <p className="text-xs text-muted-foreground">صاحب الإعلان</p>
                <p className="font-bold">{previewRental.sellerName || "مجهول"}</p>
              </div>
              {previewRental.sellerPhone && (
                <a href={`tel:${previewRental.sellerPhone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Phone className="w-4 h-4" />
                  <span dir="ltr" className="font-mono">{previewRental.sellerPhone}</span>
                </a>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pb-1">
              <Button
                className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold rounded-xl"
                onClick={() => { handleRentalApproval(previewRental.id, "approve"); setPreviewRental(null); }}
              >
                <CheckCircle className="w-5 h-5" /> الموافقة ونشر الإعلان
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-11 border-2 border-red-400 text-red-600 hover:bg-red-50 gap-2 font-bold rounded-xl"
                onClick={() => { handleRentalApproval(previewRental.id, "reject"); setPreviewRental(null); }}
              >
                <XCircle className="w-5 h-5" /> رفض الإعلان
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Showroom Dialog */}
      <Dialog open={showShowroomDialog} onOpenChange={setShowShowroomDialog}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {editingShowroom ? "تعديل المعرض" : "إضافة معرض جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">اسم المعرض *</label>
                <Input value={showroomForm.name} onChange={e => setShowroomForm(f => ({ ...f, name: e.target.value }))} placeholder="معرض النجمة" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">المدينة *</label>
                <Input value={showroomForm.city} onChange={e => setShowroomForm(f => ({ ...f, city: e.target.value }))} placeholder="دمشق" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">العنوان</label>
              <Input value={showroomForm.address} onChange={e => setShowroomForm(f => ({ ...f, address: e.target.value }))} placeholder="شارع..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">الهاتف</label>
                <Input value={showroomForm.phone} onChange={e => setShowroomForm(f => ({ ...f, phone: e.target.value }))} placeholder="+963..." dir="ltr" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">واتساب</label>
                <Input value={showroomForm.whatsapp} onChange={e => setShowroomForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="+963..." dir="ltr" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">البريد الإلكتروني</label>
              <Input value={showroomForm.email} onChange={e => setShowroomForm(f => ({ ...f, email: e.target.value }))} placeholder="info@showroom.sy" dir="ltr" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">الوصف</label>
              <Input value={showroomForm.description} onChange={e => setShowroomForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف المعرض..." />
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={saveShowroom} disabled={!showroomForm.name || !showroomForm.city}>
                <CheckCircle className="w-4 h-4 ml-2" /> {editingShowroom ? "حفظ التعديلات" : "إضافة المعرض"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowShowroomDialog(false)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inspection Center Dialog */}
      <Dialog open={showInspectionDialog} onOpenChange={setShowInspectionDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-600" />
              {editingInspection ? "تعديل مركز الفحص" : "إضافة مركز فحص جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">اسم المركز *</label>
                <Input value={inspectionForm.name} onChange={e => setInspectionForm(f => ({ ...f, name: e.target.value }))} placeholder="مركز الفحص الفني" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">المدينة *</label>
                <Input value={inspectionForm.city} onChange={e => setInspectionForm(f => ({ ...f, city: e.target.value }))} placeholder="دمشق" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">العنوان</label>
              <Input value={inspectionForm.address} onChange={e => setInspectionForm(f => ({ ...f, address: e.target.value }))} placeholder="شارع..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">الهاتف</label>
                <Input value={inspectionForm.phone} onChange={e => setInspectionForm(f => ({ ...f, phone: e.target.value }))} placeholder="+963..." dir="ltr" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">واتساب</label>
                <Input value={inspectionForm.whatsapp} onChange={e => setInspectionForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="+963..." dir="ltr" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">الوصف</label>
              <Input value={inspectionForm.description} onChange={e => setInspectionForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف المركز..." />
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1 bg-cyan-600 hover:bg-cyan-700" onClick={saveInspectionCenter} disabled={!inspectionForm.name || !inspectionForm.city}>
                <CheckCircle className="w-4 h-4 ml-2" /> {editingInspection ? "حفظ التعديلات" : "إضافة المركز"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowInspectionDialog(false)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scrap Center Dialog */}
      <Dialog open={showScrapDialog} onOpenChange={setShowScrapDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Recycle className="w-5 h-5 text-orange-600" />
              {editingScrap ? "تعديل مركز الخردة" : "إضافة مركز خردة جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">اسم المركز *</label>
                <Input value={scrapForm.name} onChange={e => setScrapForm(f => ({ ...f, name: e.target.value }))} placeholder="مركز خردة..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">المدينة *</label>
                <Input value={scrapForm.city} onChange={e => setScrapForm(f => ({ ...f, city: e.target.value }))} placeholder="دمشق" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">العنوان</label>
              <Input value={scrapForm.address} onChange={e => setScrapForm(f => ({ ...f, address: e.target.value }))} placeholder="شارع..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">الهاتف</label>
                <Input value={scrapForm.phone} onChange={e => setScrapForm(f => ({ ...f, phone: e.target.value }))} placeholder="+963..." dir="ltr" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">واتساب</label>
                <Input value={scrapForm.whatsapp} onChange={e => setScrapForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="+963..." dir="ltr" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">الوصف</label>
              <Input value={scrapForm.description} onChange={e => setScrapForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف المركز..." />
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={saveScrapCenter} disabled={!scrapForm.name || !scrapForm.city}>
                <CheckCircle className="w-4 h-4 ml-2" /> {editingScrap ? "حفظ التعديلات" : "إضافة المركز"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowScrapDialog(false)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}