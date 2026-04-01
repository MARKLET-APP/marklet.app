// UI_ID: JOBS_01 — CLEAN REBUILD
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { useStartChat } from "@/hooks/use-start-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { BottomSheetSelect } from "@/components/ui/bottom-sheet-select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Plus, MapPin, Briefcase, Loader2, Building, Clock,
  Star, FileText, Sparkles, UploadCloud,
} from "lucide-react";
import { SYRIAN_PROVINCES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { BuyRequestCard } from "@/components/BuyRequestCard";

const SUB_CATEGORIES = ["وظيفة شاغرة", "طلب توظيف", "عمالة منزلية", "عمال مهرة"];

// ── initialForm defined OUTSIDE component — never recreated on render ────────
const initialJobForm = {
  title: "",
  subCategory: "وظيفة شاغرة",
  company: "",
  salary: "",
  salaryUnit: "شهري",
  salaryCurrency: "USD",
  jobType: "دوام كامل",
  experience: "بدون خبرة",
  field: "أخرى",
  province: "",
  city: "",
  phone: "",
  description: "",
  requirements: "",
};
const JOB_TYPES = ["دوام كامل", "دوام جزئي", "عن بعد", "عقد مؤقت"];
const EXPERIENCE_LEVELS = ["بدون خبرة", "أقل من سنة", "1-3 سنوات", "3-5 سنوات", "أكثر من 5 سنوات"];
const FIELDS = [
  "تقنية المعلومات", "هندسة", "طب وصحة", "تعليم", "تجارة ومبيعات",
  "مالية ومحاسبة", "تصميم وفنون", "قانون", "إعلام وصحافة", "خدمة عملاء",
  "بناء وعقارات", "نقل ولوجستيك", "زراعة", "سياحة وفنادق", "أخرى",
];

type Job = {
  id: number; posterId: number; title: string; subCategory: string;
  company: string | null; salary: string | null; jobType: string | null;
  experience: string | null; field: string | null; province: string; city: string;
  isFeatured: boolean; viewCount: number; createdAt: string; posterName: string | null;
};

// ── Main page ────────────────────────────────────────────────────────────────
export default function JobsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { startChat, loading: startingChat } = useStartChat();

  // Filter state
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [filterSub, setFilterSub] = useState("__all__");
  const [filterField, setFilterField] = useState("__all__");
  const [filterProv, setFilterProv] = useState("__all__");
  const [tab, setTab] = useState<"listings" | "requests">("listings");
  const [addOpen, setAddOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  // ── form — initialJobForm defined OUTSIDE (never recreated) ────────────────
  const [form, setForm] = useState(initialJobForm);

  // BottomSheetSelect: receives value directly
  const update = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const resetForm = () => setForm(initialJobForm);

  // Text inputs/textareas: event-based, skips re-render if value unchanged
  const handleInput = (field: keyof typeof initialJobForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setForm(prev => {
        if (prev[field] === value) return prev;
        return { ...prev, [field]: value };
      });
    };

  // ── CLEAN apply form ─────────────────────────────────────────────────────
  const [applyForm, setApplyForm] = useState({
    jobTitle: "", field: "أخرى", experience: "بدون خبرة", province: "", city: "", description: "",
  });
  const updateApply = (k: string, v: string) => setApplyForm(prev => ({ ...prev, [k]: v }));
  const handleApplyInput = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setApplyForm(prev => {
        if ((prev as any)[field] === value) return prev;
        return { ...prev, [field]: value };
      });
    };

  // ── CV upload ────────────────────────────────────────────────────────────
  const [cvUploading, setCvUploading] = useState(false);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const cvRef = useRef<HTMLInputElement>(null);

  const handleCvUpload = async (file: File) => {
    setCvUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const token = localStorage.getItem("scm_token");
      const res = await fetch(import.meta.env.BASE_URL + "api/upload-image?folder=jobs", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (!data.success || !data.url) throw new Error(data.message || "Upload failed");
      setCvUrl(data.url);
      toast({ title: "تم رفع السيرة الذاتية بنجاح" });
    } catch {
      toast({ title: "فشل رفع السيرة الذاتية", variant: "destructive" });
    } finally {
      setCvUploading(false);
    }
  };

  // ── AI description ────────────────────────────────────────────────────────
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const handleAiDescription = async () => {
    if (!form.subCategory || !form.province) {
      toast({ title: "يرجى تحديد نوع الإعلان والمحافظة أولاً", variant: "destructive" });
      return;
    }
    setAiDescLoading(true);
    try {
      const res = await apiRequest<{ description: string }>("/api/jobs/ai-description", "POST", {
        title: form.title || form.subCategory,
        subCategory: form.subCategory,
        company: form.company || undefined,
        field: form.field !== "أخرى" ? form.field : undefined,
        jobType: form.jobType || undefined,
        experience: form.experience || undefined,
        province: form.province,
      });
      update("description", res.description);
      toast({ title: "تم توليد الوصف بنجاح ✨" });
    } catch {
      toast({ title: "فشل توليد الوصف", variant: "destructive" });
    } finally {
      setAiDescLoading(false);
    }
  };

  // ── Queries ───────────────────────────────────────────────────────────────
  const activeSub = filterSub === "__all__" ? "" : filterSub;
  const activeField = filterField === "__all__" ? "" : filterField;
  const activeProv = filterProv === "__all__" ? "" : filterProv;

  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ["jobs", { activeSub, activeField, activeProv, q }],
    queryFn: () => {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (activeSub) p.set("subCategory", activeSub);
      if (activeField) p.set("field", activeField);
      if (activeProv) p.set("province", activeProv);
      return apiRequest<Job[]>(`/api/jobs?${p}`);
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: applyReqs = [], isLoading: applyLoading } = useQuery({
    queryKey: ["buy-requests", "jobs"],
    queryFn: () => apiRequest<any[]>("/api/buy-requests?category=jobs"),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (body: object) => apiRequest("/api/jobs", "POST", body),
    onSuccess: () => {
      toast({ title: "تم نشر الإعلان بنجاح" });
      setAddOpen(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: () => toast({ title: "فشل نشر الإعلان", variant: "destructive" }),
  });

  const applyMutation = useMutation({
    mutationFn: (body: object) => apiRequest("/api/buy-requests", "POST", body),
    onSuccess: () => {
      toast({ title: "تم إرسال طلب التوظيف بنجاح" });
      setApplyOpen(false);
      setApplyForm({ jobTitle: "", field: "أخرى", experience: "بدون خبرة", province: "", city: "", description: "" });
      setCvUrl(null);
      qc.invalidateQueries({ queryKey: ["buy-requests", "jobs"] });
    },
    onError: () => toast({ title: "فشل إرسال الطلب", variant: "destructive" }),
  });

  const deleteApplyMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/buy-requests/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["buy-requests", "jobs"] }),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!form.title || !form.province || !form.city) {
      toast({ title: "يرجى تعبئة الحقول الإلزامية", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      title: form.title,
      subCategory: form.subCategory,
      company: form.company || null,
      salary: form.salary ? `${form.salary} / ${form.salaryUnit}` : null,
      salaryCurrency: form.salaryCurrency,
      jobType: form.jobType,
      experience: form.experience,
      field: form.field,
      province: form.province,
      city: form.city,
      phone: form.phone || null,
      description: form.description || null,
      requirements: form.requirements || null,
      cvUrl: cvUrl || null,
    });
  };

  const handleApplySubmit = () => {
    if (!applyForm.province || !applyForm.city) {
      toast({ title: "يرجى تحديد المحافظة والمدينة", variant: "destructive" });
      return;
    }
    applyMutation.mutate({
      brand: applyForm.jobTitle || applyForm.field,
      model: applyForm.experience,
      city: applyForm.city,
      description: `المحافظة: ${applyForm.province} | المجال: ${applyForm.field}${applyForm.description ? `\n${applyForm.description}` : ""}`,
      category: "jobs",
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24" dir="rtl">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-l from-amber-600 to-orange-800 text-white px-4 pt-6 pb-5">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none flex items-center justify-center">
          <Briefcase size={320} strokeWidth={0.5} color="white" />
        </div>
        <div className="relative z-[1] max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Briefcase className="w-7 h-7" />
            <h1 className="text-2xl font-extrabold tracking-tight">الوظائف</h1>
          </div>
          <p className="text-amber-100 text-sm mb-4">آلاف الفرص الوظيفية في مختلف القطاعات</p>
          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2 rounded-2xl bg-white text-amber-800 hover:bg-amber-50 font-bold text-sm py-3 shadow-lg border-0"
              onClick={() => { if (!user) { navigate("/login"); return; } setAddOpen(true); }}
            >
              <Plus className="w-5 h-5" /> نشر إعلان وظيفي
            </Button>
            <Button
              className="flex-1 gap-2 rounded-2xl bg-amber-500/40 hover:bg-amber-500/60 text-white font-bold text-sm py-3 border border-white/40 shadow-sm"
              onClick={() => { if (!user) { navigate("/login"); return; } setApplyOpen(true); }}
            >
              <FileText className="w-5 h-5" /> طلب توظيف
            </Button>
          </div>
        </div>
      </div>

      {/* ── Search + Filters ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3">
        <div className="relative mb-2">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن وظيفة..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && setQ(search)}
            className="pr-9"
            style={{ fontSize: 16 }}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <div style={{ flexShrink: 0, width: 120 }}>
            <NativeSelect value={filterSub} onValueChange={setFilterSub} className="h-8 text-xs" style={{ paddingRight: 6, width: "100%", fontSize: 16 }}>
              <option value="__all__">الكل</option>
              {SUB_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
            </NativeSelect>
          </div>
          <div style={{ flexShrink: 0, width: 120 }}>
            <NativeSelect value={filterField} onValueChange={setFilterField} className="h-8 text-xs" style={{ paddingRight: 6, width: "100%", fontSize: 16 }}>
              <option value="__all__">الكل</option>
              {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
            </NativeSelect>
          </div>
          <div style={{ flexShrink: 0, width: 115 }}>
            <NativeSelect value={filterProv} onValueChange={setFilterProv} className="h-8 text-xs" style={{ paddingRight: 6, width: "100%", fontSize: 16 }}>
              <option value="__all__">الكل</option>
              {SYRIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </NativeSelect>
          </div>
          {(activeSub || activeField || activeProv || q) && (
            <Button variant="ghost" size="sm" className="h-8 text-xs shrink-0"
              onClick={() => { setFilterSub("__all__"); setFilterField("__all__"); setFilterProv("__all__"); setQ(""); setSearch(""); }}>
              مسح
            </Button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b px-4">
        <button
          className={cn("flex-1 pb-3 pt-3 text-sm font-semibold transition-colors", tab === "listings" ? "text-amber-700 dark:text-amber-400 border-b-2 border-amber-700 dark:border-amber-400" : "text-muted-foreground")}
          onClick={() => setTab("listings")}
        >
          إعلانات الوظائف {jobs.length > 0 && <span className="mr-1 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 rounded-full px-2 py-0.5">{jobs.length}</span>}
        </button>
        <button
          className={cn("flex-1 pb-3 pt-3 text-sm font-semibold transition-colors", tab === "requests" ? "text-amber-700 dark:text-amber-400 border-b-2 border-amber-700 dark:border-amber-400" : "text-muted-foreground")}
          onClick={() => setTab("requests")}
        >
          طلبات التوظيف {(applyReqs as any[]).length > 0 && <span className="mr-1 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 rounded-full px-2 py-0.5">{(applyReqs as any[]).length}</span>}
        </button>
      </div>

      {/* ── Content ── */}
      <div className="p-4">
        {tab === "listings" && (
          isLoading
            ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            : jobs.length === 0
              ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>لا توجد وظائف حالياً</p>
                </div>
              )
              : (
                <div className="flex flex-col gap-3">
                  {jobs.map(job => (
                    <JobCard key={job.id} job={job} onOpen={() => navigate(`/jobs/${job.id}`)} />
                  ))}
                </div>
              )
        )}

        {tab === "requests" && (
          applyLoading
            ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            : (applyReqs as any[]).length === 0
              ? (
                <div className="text-center py-16 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-lg font-bold mb-2">لا توجد طلبات توظيف حالياً</p>
                  <p className="text-sm mb-4">هل تبحث عن عمل؟ انشر ملفك الوظيفي</p>
                  {user && <Button onClick={() => setApplyOpen(true)} className="gap-2 bg-amber-600 hover:bg-amber-700"><FileText className="w-4 h-4" /> نشر طلب توظيف</Button>}
                </div>
              )
              : (
                <div className="flex flex-col gap-3">
                  {(applyReqs as any[]).map((req: any) => (
                    <BuyRequestCard
                      key={req.id}
                      data={{ ...req, type: req.brand || "طلب توظيف" }}
                      currentUserId={user?.id}
                      accentColor="orange"
                      label="طلب توظيف"
                      onChat={user && req.userId !== user.id ? () => startChat(req.userId, `مرحباً، رأيت طلب التوظيف الخاص بك وأودّ التواصل معك`) : undefined}
                      chatLoading={startingChat}
                      onDelete={user && req.userId === user.id ? () => deleteApplyMutation.mutate(req.id) : undefined}
                      deleteLoading={deleteApplyMutation.isPending}
                    />
                  ))}
                </div>
              )
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ADD JOB DIALOG — clean form, no guards, no composition
      ══════════════════════════════════════════════════════════════ */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => { setAddOpen(open); if (!open) resetForm(); }}
      >
        <DialogContent
          className="max-w-lg p-0 overflow-hidden"
          dir="rtl"
          style={{ maxHeight: "88dvh", display: "flex", flexDirection: "column" }}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="px-5 pt-5 pb-3 shrink-0 border-b">
            <DialogHeader>
              <DialogTitle className="text-right text-lg font-bold">نشر إعلان وظيفي</DialogTitle>
            </DialogHeader>
          </div>

          <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">

            {/* نوع الإعلان */}
            <div>
              <Label className="mb-1 block">نوع الإعلان *</Label>
              <BottomSheetSelect value={form.subCategory ?? ""} onValueChange={v => update("subCategory", v)} placeholder="نوع الإعلان">
                {SUB_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
              </BottomSheetSelect>
            </div>

            {/* المسمى الوظيفي */}
            <div>
              <Label className="mb-1 block">المسمى الوظيفي *</Label>
              <Input
                value={form.title ?? ""}
                onChange={handleInput("title")}
                onBlur={(e) => handleInput("title")(e)}
                placeholder="مثال: مطور ويب، معلم رياضيات..."
                style={{ fontSize: 16 }}
              />
            </div>

            {/* الشركة */}
            <div>
              <Label className="mb-1 block">الشركة / المؤسسة</Label>
              <Input
                value={form.company ?? ""}
                onChange={handleInput("company")}
                onBlur={(e) => handleInput("company")(e)}
                placeholder="اسم الشركة أو المؤسسة"
                style={{ fontSize: 16 }}
              />
            </div>

            {/* نوع الدوام + الخبرة */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">نوع الدوام</Label>
                <BottomSheetSelect value={form.jobType ?? ""} onValueChange={v => update("jobType", v)} placeholder="نوع الدوام">
                  {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </BottomSheetSelect>
              </div>
              <div>
                <Label className="mb-1 block">مستوى الخبرة</Label>
                <BottomSheetSelect value={form.experience ?? ""} onValueChange={v => update("experience", v)} placeholder="الخبرة">
                  {EXPERIENCE_LEVELS.map(e => <option key={e} value={e}>{e}</option>)}
                </BottomSheetSelect>
              </div>
            </div>

            {/* مجال العمل */}
            <div>
              <Label className="mb-1 block">مجال العمل</Label>
              <BottomSheetSelect value={form.field ?? ""} onValueChange={v => update("field", v)} placeholder="المجال">
                {FIELDS.map(fi => <option key={fi} value={fi}>{fi}</option>)}
              </BottomSheetSelect>
            </div>

            {/* الراتب */}
            <div>
              <Label className="mb-1 block">الراتب</Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <Input
                    type="number"
                    value={form.salary ?? ""}
                    onChange={handleInput("salary")}
                    onBlur={(e) => handleInput("salary")(e)}
                    placeholder="المبلغ"
                    style={{ fontSize: 16 }}
                  />
                </div>
                <div>
                  <BottomSheetSelect value={form.salaryUnit ?? ""} onValueChange={v => update("salaryUnit", v)} placeholder="الوحدة">
                    <option value="شهري">شهري</option>
                    <option value="يومي">يومي</option>
                    <option value="بالمشروع">بالمشروع</option>
                  </BottomSheetSelect>
                </div>
                <div>
                  <BottomSheetSelect value={form.salaryCurrency ?? ""} onValueChange={v => update("salaryCurrency", v)} placeholder="العملة">
                    <option value="USD">USD $</option>
                    <option value="SYP">SYP ل.س</option>
                  </BottomSheetSelect>
                </div>
              </div>
            </div>

            {/* المحافظة + المدينة */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">المحافظة *</Label>
                <BottomSheetSelect value={form.province ?? ""} onValueChange={v => update("province", v)} placeholder="اختر المحافظة">
                  {SYRIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </BottomSheetSelect>
              </div>
              <div>
                <Label className="mb-1 block">المدينة *</Label>
                <Input
                  value={form.city ?? ""}
                  onChange={handleInput("city")}
                  onBlur={(e) => handleInput("city")(e)}
                  placeholder="المدينة أو المنطقة"
                  style={{ fontSize: 16 }}
                />
              </div>
            </div>

            {/* رقم الهاتف */}
            <div>
              <Label className="mb-1 block">رقم الهاتف / واتساب</Label>
              <Input
                type="tel"
                value={form.phone ?? ""}
                onChange={handleInput("phone")}
                onBlur={(e) => handleInput("phone")(e)}
                placeholder="مثال: 0991234567"
                style={{ fontSize: 16 }}
              />
            </div>

            {/* وصف الوظيفة */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>وصف الوظيفة</Label>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1 px-2" onClick={handleAiDescription} disabled={aiDescLoading}>
                  {aiDescLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  كتابة بالذكاء الاصطناعي
                </Button>
              </div>
              <Textarea
                value={form.description ?? ""}
                onChange={handleInput("description")}
                onBlur={(e) => handleInput("description")(e)}
                placeholder="وصف تفصيلي للوظيفة، المهام والمسؤوليات..."
                rows={3}
                style={{ fontSize: 16 }}
              />
            </div>

            {/* المتطلبات */}
            <div>
              <Label className="mb-1 block">متطلبات الوظيفة</Label>
              <Textarea
                value={form.requirements ?? ""}
                onChange={handleInput("requirements")}
                onBlur={(e) => handleInput("requirements")(e)}
                placeholder="المؤهلات والمتطلبات المطلوبة..."
                rows={3}
                style={{ fontSize: 16 }}
              />
            </div>

            <Button className="w-full h-12 text-base font-bold" onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              نشر الإعلان
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
          APPLY REQUEST DIALOG
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={applyOpen} onOpenChange={(open) => { setApplyOpen(open); if (!open) { setCvUrl(null); } }}>
        <DialogContent
          className="max-w-lg p-0 overflow-hidden"
          dir="rtl"
          style={{ maxHeight: "88dvh", display: "flex", flexDirection: "column" }}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="px-5 pt-5 pb-3 shrink-0 border-b">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">طلب توظيف</DialogTitle>
            </DialogHeader>
          </div>

          <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">

            <div>
              <Label className="mb-1 block">المسمى الوظيفي المطلوب</Label>
              <Input
                value={applyForm.jobTitle ?? ""}
                onChange={handleApplyInput("jobTitle")}
                onBlur={(e) => handleApplyInput("jobTitle")(e)}
                placeholder="مثال: مطور ويب، معلم، محاسب..."
                style={{ fontSize: 16 }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">المجال *</Label>
                <BottomSheetSelect value={applyForm.field ?? ""} onValueChange={v => updateApply("field", v)} placeholder="المجال">
                  {FIELDS.map(fi => <option key={fi} value={fi}>{fi}</option>)}
                </BottomSheetSelect>
              </div>
              <div>
                <Label className="mb-1 block">الخبرة *</Label>
                <BottomSheetSelect value={applyForm.experience ?? ""} onValueChange={v => updateApply("experience", v)} placeholder="الخبرة">
                  {EXPERIENCE_LEVELS.map(e => <option key={e} value={e}>{e}</option>)}
                </BottomSheetSelect>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">المحافظة *</Label>
                <BottomSheetSelect value={applyForm.province ?? ""} onValueChange={v => updateApply("province", v)} placeholder="اختر المحافظة">
                  {SYRIAN_PROVINCES.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                </BottomSheetSelect>
              </div>
              <div>
                <Label className="mb-1 block">المدينة *</Label>
                <Input
                  value={applyForm.city ?? ""}
                  onChange={handleApplyInput("city")}
                  onBlur={(e) => handleApplyInput("city")(e)}
                  placeholder="مثال: دمشق، حلب..."
                  style={{ fontSize: 16 }}
                />
              </div>
            </div>

            <div>
              <Label className="mb-1 block">نبذة عن نفسك / مهاراتك</Label>
              <Textarea
                value={applyForm.description ?? ""}
                onChange={handleApplyInput("description")}
                onBlur={(e) => handleApplyInput("description")(e)}
                placeholder="مثال: خبرة 3 سنوات في البرمجة، أجيد اللغة الإنجليزية..."
                rows={3}
                style={{ fontSize: 16 }}
              />
            </div>

            {/* CV upload */}
            <div>
              <Label className="mb-1 block">السيرة الذاتية (PDF أو صورة) — اختياري</Label>
              <div className="mt-1 flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" className="gap-2"
                  onClick={() => cvRef.current?.click()} disabled={cvUploading}>
                  {cvUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  {cvUrl ? "تغيير الملف" : "رفع السيرة الذاتية"}
                </Button>
                {cvUrl && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <FileText className="w-4 h-4" />
                    <span>تم الرفع ✓</span>
                    <button type="button" onClick={() => setCvUrl(null)} className="text-muted-foreground hover:text-destructive">✕</button>
                  </div>
                )}
              </div>
              <input
                ref={cvRef}
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleCvUpload(e.target.files[0]); e.target.value = ""; }}
              />
            </div>

            <Button className="w-full gap-2 bg-amber-600 hover:bg-amber-700 h-12 text-base font-bold" onClick={handleApplySubmit} disabled={applyMutation.isPending}>
              {applyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              إرسال طلب التوظيف
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Job card ──────────────────────────────────────────────────────────────────
function JobCard({ job, onOpen }: { job: Job; onOpen: () => void }) {
  const timeAgo = new Date(job.createdAt).toLocaleDateString("ar-SY");
  return (
    <div
      className={cn("bg-card border border-border/60 rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all", job.isFeatured && "border-yellow-500/50")}
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {job.isFeatured && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />}
            <p className="font-semibold text-sm">{job.title}</p>
          </div>
          {job.company && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Building className="w-3 h-3" />{job.company}
            </p>
          )}
        </div>
        <Badge variant={job.subCategory === "وظيفة شاغرة" ? "default" : "secondary"} className="text-xs shrink-0">
          {job.subCategory === "وظيفة شاغرة" ? "🏢 شاغرة" : job.subCategory === "طلب توظيف" ? "👤 طلب" : job.subCategory === "عمالة منزلية" ? "🏠 منزلية" : "🛠️ مهرة"}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.province} — {job.city}</span>
        {job.jobType && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{job.jobType}</span>}
        {job.field && <Badge variant="outline" className="text-xs">{job.field}</Badge>}
        {job.salary && <span className="text-green-500 dark:text-green-400 font-medium">{job.salary}</span>}
      </div>
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>{timeAgo}</span>
        {job.experience && <span>{job.experience}</span>}
      </div>
    </div>
  );
}
