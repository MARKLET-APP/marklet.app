// UI_ID: JOBS_01 — CLEAN REBUILD
import { useState, useRef, useCallback, memo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { useStartChat } from "@/hooks/use-start-chat";
import { ListingCard } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { BottomSheetSelect } from "@/components/ui/bottom-sheet-select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Plus, Briefcase, Loader2, FileText, Sparkles, UploadCloud,
} from "lucide-react";
import { SYRIAN_PROVINCES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { BuyRequestCard } from "@/components/BuyRequestCard";

const SUB_CATEGORIES = ["وظيفة شاغرة", "طلب توظيف", "عمالة منزلية", "عمال مهرة"];
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

// ═══════════════════════════════════════════════════════════════════
// AddJobForm — مكوّن مستقل بحالته الخاصة (يمنع تطاير الأحرف)
// ═══════════════════════════════════════════════════════════════════
interface AddJobData {
  title: string; subCategory: string; company: string | null; salary: string | null;
  salaryCurrency: string; jobType: string; experience: string; field: string;
  province: string; city: string; phone: string | null;
  description: string | null; requirements: string | null; cvUrl: string | null;
}

const AddJobForm = memo(function AddJobForm({
  onSubmit, isBusy,
}: { onSubmit: (data: AddJobData) => void; isBusy: boolean }) {
  const { toast } = useToast();

  // uncontrolled refs
  const titleRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const salaryRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const reqRef = useRef<HTMLTextAreaElement>(null);

  // select state
  const [subCategory, setSubCategory] = useState("وظيفة شاغرة");
  const [jobType, setJobType] = useState("دوام كامل");
  const [experience, setExperience] = useState("بدون خبرة");
  const [field, setField] = useState("أخرى");
  const [province, setProvince] = useState("");
  const [salaryUnit, setSalaryUnit] = useState("شهري");
  const [salaryCurrency, setSalaryCurrency] = useState("USD");

  // AI description
  const [aiLoading, setAiLoading] = useState(false);
  const handleAiDescription = async () => {
    if (!subCategory || !province) {
      toast({ title: "يرجى تحديد نوع الإعلان والمحافظة أولاً", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    try {
      const res = await apiRequest<{ description: string }>("/api/jobs/ai-description", "POST", {
        title: titleRef.current?.value || subCategory,
        subCategory,
        company: companyRef.current?.value || undefined,
        field: field !== "أخرى" ? field : undefined,
        jobType,
        experience,
        province,
      });
      // تحديث الـ textarea مباشرة بدون إعادة رندر
      if (descRef.current) descRef.current.value = res.description;
      toast({ title: "تم توليد الوصف بنجاح ✨" });
    } catch {
      toast({ title: "فشل توليد الوصف", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = () => {
    const title = titleRef.current?.value.trim() ?? "";
    const city = cityRef.current?.value.trim() ?? "";
    if (!title || !province || !city) {
      toast({ title: "يرجى تعبئة الحقول الإلزامية", variant: "destructive" });
      return;
    }
    const salaryVal = salaryRef.current?.value.trim();
    onSubmit({
      title,
      subCategory,
      company: companyRef.current?.value.trim() || null,
      salary: salaryVal ? `${salaryVal} / ${salaryUnit}` : null,
      salaryCurrency,
      jobType,
      experience,
      field,
      province,
      city,
      phone: phoneRef.current?.value.trim() || null,
      description: descRef.current?.value.trim() || null,
      requirements: reqRef.current?.value.trim() || null,
      cvUrl: null,
    });
  };

  return (
    <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">

      {/* نوع الإعلان */}
      <div>
        <Label className="mb-1 block">نوع الإعلان *</Label>
        <BottomSheetSelect value={subCategory} onValueChange={setSubCategory} placeholder="نوع الإعلان">
          {SUB_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
        </BottomSheetSelect>
      </div>

      {/* المسمى الوظيفي */}
      <div>
        <Label className="mb-1 block">المسمى الوظيفي *</Label>
        <Input
          ref={titleRef}
          placeholder="مثال: مطور ويب، معلم رياضيات..."
          defaultValue=""
          style={{ fontSize: 16 }}
        />
      </div>

      {/* الشركة */}
      <div>
        <Label className="mb-1 block">الشركة / المؤسسة</Label>
        <Input
          ref={companyRef}
          placeholder="اسم الشركة أو المؤسسة"
          defaultValue=""
          style={{ fontSize: 16 }}
        />
      </div>

      {/* نوع الدوام + الخبرة */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1 block">نوع الدوام</Label>
          <BottomSheetSelect value={jobType} onValueChange={setJobType} placeholder="نوع الدوام">
            {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </BottomSheetSelect>
        </div>
        <div>
          <Label className="mb-1 block">مستوى الخبرة</Label>
          <BottomSheetSelect value={experience} onValueChange={setExperience} placeholder="الخبرة">
            {EXPERIENCE_LEVELS.map(e => <option key={e} value={e}>{e}</option>)}
          </BottomSheetSelect>
        </div>
      </div>

      {/* مجال العمل */}
      <div>
        <Label className="mb-1 block">مجال العمل</Label>
        <BottomSheetSelect value={field} onValueChange={setField} placeholder="المجال">
          {FIELDS.map(fi => <option key={fi} value={fi}>{fi}</option>)}
        </BottomSheetSelect>
      </div>

      {/* الراتب */}
      <div>
        <Label className="mb-1 block">الراتب</Label>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <Input
              ref={salaryRef}
              type="number"
              placeholder="المبلغ"
              defaultValue=""
              style={{ fontSize: 16 }}
            />
          </div>
          <div>
            <BottomSheetSelect value={salaryUnit} onValueChange={setSalaryUnit} placeholder="الوحدة">
              <option value="شهري">شهري</option>
              <option value="يومي">يومي</option>
              <option value="بالمشروع">بالمشروع</option>
            </BottomSheetSelect>
          </div>
          <div>
            <BottomSheetSelect value={salaryCurrency} onValueChange={setSalaryCurrency} placeholder="العملة">
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
          <BottomSheetSelect value={province} onValueChange={setProvince} placeholder="اختر المحافظة">
            {SYRIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </BottomSheetSelect>
        </div>
        <div>
          <Label className="mb-1 block">المدينة *</Label>
          <Input
            ref={cityRef}
            placeholder="المدينة أو المنطقة"
            defaultValue=""
            style={{ fontSize: 16 }}
          />
        </div>
      </div>

      {/* رقم الهاتف */}
      <div>
        <Label className="mb-1 block">رقم الهاتف / واتساب</Label>
        <Input
          ref={phoneRef}
          type="tel"
          placeholder="مثال: 0991234567"
          defaultValue=""
          style={{ fontSize: 16 }}
          dir="ltr"
        />
      </div>

      {/* وصف الوظيفة */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>وصف الوظيفة</Label>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1 px-2"
            onClick={handleAiDescription} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            كتابة بالذكاء الاصطناعي
          </Button>
        </div>
        <Textarea
          ref={descRef}
          placeholder="وصف تفصيلي للوظيفة، المهام والمسؤوليات..."
          defaultValue=""
          rows={3}
          style={{ fontSize: 16 }}
        />
      </div>

      {/* المتطلبات */}
      <div>
        <Label className="mb-1 block">متطلبات الوظيفة</Label>
        <Textarea
          ref={reqRef}
          placeholder="المؤهلات والمتطلبات المطلوبة..."
          defaultValue=""
          rows={3}
          style={{ fontSize: 16 }}
        />
      </div>

      <Button className="w-full h-12 text-base font-bold" onClick={handleSubmit} disabled={isBusy}>
        {isBusy ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
        نشر الإعلان
      </Button>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// ApplyJobForm — نموذج طلب التوظيف المستقل
// ═══════════════════════════════════════════════════════════════════
interface ApplyJobData {
  jobTitle: string; field: string; experience: string;
  province: string; city: string; description: string; cvUrl: string | null;
}

const ApplyJobForm = memo(function ApplyJobForm({
  onSubmit, isBusy,
}: { onSubmit: (data: ApplyJobData) => void; isBusy: boolean }) {
  const { toast } = useToast();

  // uncontrolled refs
  const jobTitleRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  // select state
  const [field, setField] = useState("أخرى");
  const [experience, setExperience] = useState("بدون خبرة");
  const [province, setProvince] = useState("");

  // CV upload
  const [cvUploading, setCvUploading] = useState(false);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const cvRef = useRef<HTMLInputElement>(null);

  const handleCvUpload = async (file: File) => {
    setCvUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = localStorage.getItem("scm_token");
      const res = await fetch(import.meta.env.BASE_URL + "api/upload-cv", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Upload failed");
      }
      const data = await res.json();
      if (!data.success || !data.url) throw new Error(data.message || "Upload failed");
      setCvUrl(data.url);
      toast({ title: "تم رفع السيرة الذاتية بنجاح" });
    } catch (e: any) {
      toast({ title: e?.message || "فشل رفع السيرة الذاتية", variant: "destructive" });
    } finally {
      setCvUploading(false);
    }
  };

  const handleSubmit = () => {
    const city = cityRef.current?.value.trim() ?? "";
    if (!province || !city) {
      toast({ title: "يرجى تحديد المحافظة والمدينة", variant: "destructive" });
      return;
    }
    onSubmit({
      jobTitle: jobTitleRef.current?.value.trim() ?? "",
      field,
      experience,
      province,
      city,
      description: descRef.current?.value.trim() ?? "",
      cvUrl,
    });
  };

  return (
    <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">

      <div>
        <Label className="mb-1 block">المسمى الوظيفي المطلوب</Label>
        <Input
          ref={jobTitleRef}
          placeholder="مثال: مطور ويب، معلم، محاسب..."
          defaultValue=""
          style={{ fontSize: 16 }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1 block">المجال *</Label>
          <BottomSheetSelect value={field} onValueChange={setField} placeholder="المجال">
            {FIELDS.map(fi => <option key={fi} value={fi}>{fi}</option>)}
          </BottomSheetSelect>
        </div>
        <div>
          <Label className="mb-1 block">الخبرة *</Label>
          <BottomSheetSelect value={experience} onValueChange={setExperience} placeholder="الخبرة">
            {EXPERIENCE_LEVELS.map(e => <option key={e} value={e}>{e}</option>)}
          </BottomSheetSelect>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1 block">المحافظة *</Label>
          <BottomSheetSelect value={province} onValueChange={setProvince} placeholder="اختر المحافظة">
            {SYRIAN_PROVINCES.map(pr => <option key={pr} value={pr}>{pr}</option>)}
          </BottomSheetSelect>
        </div>
        <div>
          <Label className="mb-1 block">المدينة *</Label>
          <Input
            ref={cityRef}
            placeholder="مثال: دمشق، حلب..."
            defaultValue=""
            style={{ fontSize: 16 }}
          />
        </div>
      </div>

      <div>
        <Label className="mb-1 block">نبذة عن نفسك / مهاراتك</Label>
        <Textarea
          ref={descRef}
          placeholder="مثال: خبرة 3 سنوات في البرمجة، أجيد اللغة الإنجليزية..."
          defaultValue=""
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

      <Button className="w-full gap-2 bg-amber-600 hover:bg-amber-700 h-12 text-base font-bold"
        onClick={handleSubmit} disabled={isBusy}>
        {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        إرسال طلب التوظيف
      </Button>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// JobsPage — الصفحة الرئيسية
// ═══════════════════════════════════════════════════════════════════
export default function JobsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { startChat, loading: startingChat } = useStartChat();

  // Filter state
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [filterSub, setFilterSub] = useState("__all__");
  const [filterField, setFilterField] = useState("__all__");
  const [filterProv, setFilterProv] = useState("__all__");
  const [tab, setTab] = useState<"listings" | "requests">("listings");

  // dialogs — formKey forces remount (reset) on open/close
  const [addOpen, setAddOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const addFormKey = useRef(0);
  const applyFormKey = useRef(0);

  // ── Queries ──────────────────────────────────────────────────────
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

  // ── Mutations ────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (body: object) => apiRequest("/api/jobs", "POST", body),
    onSuccess: () => {
      toast({ title: "تم نشر الإعلان بنجاح" });
      addFormKey.current += 1;
      setAddOpen(false);
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: () => toast({ title: "فشل نشر الإعلان", variant: "destructive" }),
  });

  const applyMutation = useMutation({
    mutationFn: (body: object) => apiRequest("/api/buy-requests", "POST", body),
    onSuccess: () => {
      toast({ title: "تم إرسال طلب التوظيف بنجاح" });
      applyFormKey.current += 1;
      setApplyOpen(false);
      qc.invalidateQueries({ queryKey: ["buy-requests", "jobs"] });
    },
    onError: () => toast({ title: "فشل إرسال الطلب", variant: "destructive" }),
  });

  const deleteApplyMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/buy-requests/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["buy-requests", "jobs"] }),
  });

  const deleteJobMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/jobs/${id}`, "DELETE"),
    onSuccess: () => {
      toast({ title: "تم حذف الإعلان بنجاح" });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: () => toast({ title: "فشل حذف الإعلان", variant: "destructive" }),
  });

  // ── Callbacks ────────────────────────────────────────────────────
  const handleAddJobSubmit = useCallback((data: AddJobData) => {
    createMutation.mutate({
      title: data.title,
      subCategory: data.subCategory,
      company: data.company,
      salary: data.salary,
      salaryCurrency: data.salaryCurrency,
      jobType: data.jobType,
      experience: data.experience,
      field: data.field,
      province: data.province,
      city: data.city,
      phone: data.phone,
      description: data.description,
      requirements: data.requirements,
      cvUrl: data.cvUrl,
    });
  }, [createMutation]);

  const handleApplySubmit = useCallback((data: ApplyJobData) => {
    applyMutation.mutate({
      brand: data.jobTitle || data.field,
      model: data.experience,
      city: data.city,
      description: `المحافظة: ${data.province} | المجال: ${data.field}${data.description ? `\n${data.description}` : ""}`,
      category: "jobs",
    });
  }, [applyMutation]);

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
            ref={searchRef}
            placeholder="ابحث عن وظيفة..."
            defaultValue={search}
            onInput={e => setSearch((e.target as HTMLInputElement).value)}
            onKeyDown={e => { if (e.key === "Enter") setQ((e.currentTarget as HTMLInputElement).value); }}
            className="pr-9"
            style={{ fontSize: 16 }}
          />
        </div>
        <div className="flex gap-2 pb-1">
          <div className="flex-1 min-w-0">
            <NativeSelect value={filterSub} onValueChange={setFilterSub} className="h-8 text-xs truncate" style={{ paddingRight: 6, width: "100%", fontSize: 16 }}>
              <option value="__all__">الكل</option>
              {SUB_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
            </NativeSelect>
          </div>
          <div className="flex-1 min-w-0">
            <NativeSelect value={filterField} onValueChange={setFilterField} className="h-8 text-xs truncate" style={{ paddingRight: 6, width: "100%", fontSize: 16 }}>
              <option value="__all__">الكل</option>
              {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
            </NativeSelect>
          </div>
          <div className="flex-1 min-w-0">
            <NativeSelect value={filterProv} onValueChange={setFilterProv} className="h-8 text-xs truncate" style={{ paddingRight: 6, width: "100%", fontSize: 16 }}>
              <option value="__all__">الكل</option>
              {SYRIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </NativeSelect>
          </div>
          {(activeSub || activeField || activeProv || q) && (
            <Button variant="ghost" size="sm" className="h-8 text-xs shrink-0"
              onClick={() => { setFilterSub("__all__"); setFilterField("__all__"); setFilterProv("__all__"); setQ(""); setSearch(""); if (searchRef.current) searchRef.current.value = ""; }}>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {jobs.map(job => (
                    <ListingCard
                      key={job.id}
                      type="jobs"
                      data={job}
                      onCardClick={() => navigate(`/jobs/${job.id}`)}
                      onChat={job.posterId ? () => startChat(job.posterId, `مرحباً، رأيت إعلانك عن "${job.title}" وأودّ التواصل`) : undefined}
                      onDelete={user?.id === job.posterId ? () => { if (window.confirm("هل تريد حذف هذا الإعلان؟ لا يمكن التراجع.")) deleteJobMutation.mutate(job.id); } : undefined}
                      chatLoading={startingChat}
                      deleteLoading={deleteJobMutation.isPending}
                      currentUserId={user?.id}
                    />
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
          ADD JOB DIALOG
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={addOpen} onOpenChange={(open) => { if (!open) addFormKey.current += 1; setAddOpen(open); }}>
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
          <AddJobForm
            key={addFormKey.current}
            onSubmit={handleAddJobSubmit}
            isBusy={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
          APPLY REQUEST DIALOG
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={applyOpen} onOpenChange={(open) => { if (!open) applyFormKey.current += 1; setApplyOpen(open); }}>
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
          <ApplyJobForm
            key={applyFormKey.current}
            onSubmit={handleApplySubmit}
            isBusy={applyMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
