// UI_ID: JOBS_01
// NAME: الوظائف
import { useState } from "react";
import { useLocation } from "wouter";
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
import { Search, Plus, MapPin, Briefcase, Loader2, Building, Clock, Star, FileText } from "lucide-react";
import { useStartChat } from "@/hooks/use-start-chat";
import { SYRIAN_PROVINCES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { BuyRequestCard } from "@/components/BuyRequestCard";

const SUB_CATEGORIES = ["وظيفة شاغرة", "طلب توظيف", "عمالة منزلية", "عمال مهرة"];
const JOB_TYPES = ["دوام كامل", "دوام جزئي", "عن بعد", "عقد مؤقت"];
const EXPERIENCE_LEVELS = ["بدون خبرة", "أقل من سنة", "1-3 سنوات", "3-5 سنوات", "أكثر من 5 سنوات"];
const FIELDS = [
  "تقنية المعلومات", "هندسة", "طب وصحة", "تعليم", "تجارة ومبيعات",
  "مالية ومحاسبة", "تصميم وفنون", "قانون", "إعلام وصحافة", "خدمة عملاء",
  "بناء وعقارات", "نقل ولوجستيك", "زراعة", "سياحة وفنادق", "أخرى"
];

type Job = {
  id: number; posterId: number; title: string; subCategory: string;
  company: string | null; salary: string | null; jobType: string | null;
  experience: string | null; field: string | null; province: string; city: string;
  isFeatured: boolean; viewCount: number; createdAt: string; posterName: string | null;
};

type DetailedJob = Job & {
  phone: string | null; description: string | null; requirements: string | null; posterPhone: string | null;
};

const JOBS_QK = (p: object) => ["jobs", p];

const emptyForm = {
  title: "", subCategory: "وظيفة شاغرة", company: "", salary: "", salaryUnit: "شهري",
  jobType: "دوام كامل", experience: "بدون خبرة", field: "أخرى",
  province: "", city: "", phone: "", description: "", requirements: "",
};

export default function JobsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const urlParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const initialSub = urlParams.get("subCategory") || "__all__";

  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [filterSub, setFilterSub] = useState(initialSub);
  const [filterField, setFilterField] = useState("__all__");
  const [filterProv, setFilterProv] = useState("__all__");
  const [tab, setTab] = useState<"listings" | "requests">("listings");
  const [addOpen, setAddOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [detail, setDetail] = useState<DetailedJob | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [applyForm, setApplyForm] = useState({ jobTitle: "", field: "أخرى", experience: "بدون خبرة", province: "", city: "", description: "" });
  const { startChat, loading: startingChat } = useStartChat();

  const activeSub = filterSub === "__all__" ? "" : filterSub;
  const activeField = filterField === "__all__" ? "" : filterField;
  const activeProv = filterProv === "__all__" ? "" : filterProv;
  const filters = { subCategory: activeSub, field: activeField, province: activeProv, q };
  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: JOBS_QK(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (activeSub) params.set("subCategory", activeSub);
      if (activeField) params.set("field", activeField);
      if (activeProv) params.set("province", activeProv);
      return apiRequest<Job[]>(`/api/jobs?${params}`);
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: detailData, isLoading: detailLoading } = useQuery<DetailedJob>({
    queryKey: ["job-detail", detail?.id],
    queryFn: () => apiRequest<DetailedJob>(`/api/jobs/${detail?.id}`),
    enabled: !!detail?.id,
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => apiRequest("/api/jobs", "POST", body),
    onSuccess: () => {
      toast({ title: "تم نشر الإعلان بنجاح" });
      setAddOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: () => toast({ title: "فشل نشر الإعلان", variant: "destructive" }),
  });

  // ── طلبات التوظيف ───────────────────────────────────────────
  const { data: applyReqs = [], isLoading: applyLoading } = useQuery({
    queryKey: ["buy-requests", "jobs"],
    queryFn: () => apiRequest<any[]>("/api/buy-requests?category=jobs"),
  });
  const applyMutation = useMutation({
    mutationFn: (body: object) => apiRequest("/api/buy-requests", "POST", body),
    onSuccess: () => {
      toast({ title: "تم إرسال طلب التوظيف وهو بانتظار مراجعة الإدارة" });
      setApplyOpen(false);
      setApplyForm({ jobTitle: "", field: "أخرى", experience: "بدون خبرة", province: "", city: "", description: "" });
      qc.invalidateQueries({ queryKey: ["buy-requests", "jobs"] });
    },
    onError: () => toast({ title: "فشل إرسال الطلب", variant: "destructive" }),
  });
  const deleteApplyMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/buy-requests/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["buy-requests", "jobs"] }),
  });
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

  const f = (k: keyof typeof emptyForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!form.title || !form.province || !form.city) {
      toast({ title: "يرجى تعبئة الحقول الإلزامية", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      title: form.title, subCategory: form.subCategory, company: form.company || null,
      salary: form.salary ? `${form.salary} / ${form.salaryUnit}` : null,
      jobType: form.jobType, experience: form.experience, field: form.field,
      province: form.province, city: form.city,
      phone: form.phone || null,
      description: form.description || null, requirements: form.requirements || null,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24" dir="rtl">

      {/* ── Hero Header ── */}
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

      {/* ── Sticky Search + Filters ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3">
        <div className="relative mb-2">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن وظيفة..."
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && setQ(search)}
            className="pr-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Select value={filterSub} onValueChange={setFilterSub}>
            <SelectTrigger className="h-8 text-xs min-w-[120px]"><SelectValue placeholder="النوع" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">الكل</SelectItem>
              {SUB_CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterField} onValueChange={setFilterField}>
            <SelectTrigger className="h-8 text-xs min-w-[120px]"><SelectValue placeholder="المجال" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">الكل</SelectItem>
              {FIELDS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterProv} onValueChange={setFilterProv}>
            <SelectTrigger className="h-8 text-xs min-w-[110px]"><SelectValue placeholder="المحافظة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">الكل</SelectItem>
              {SYRIAN_PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
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
          isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>لا توجد وظائف حالياً</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {jobs.map(job => <JobCard key={job.id} job={job} onOpen={() => navigate(`/jobs/${job.id}`)} />)}
            </div>
          )
        )}

        {tab === "requests" && (
          applyLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (applyReqs as any[]).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-bold mb-2">لا توجد طلبات توظيف حالياً</p>
              <p className="text-sm mb-4">هل تبحث عن عمل؟ انشر ملفك الوظيفي وسيتواصل معك أصحاب العمل</p>
              {user && <Button onClick={() => setApplyOpen(true)} className="gap-2 bg-amber-600 hover:bg-amber-700"><FileText className="w-4 h-4" /> نشر طلب توظيف</Button>}
            </div>
          ) : (
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

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={open => !open && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          {detailLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : detailData ? (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-right text-xl">{detailData.title}</DialogTitle>
                {detailData.company && <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1"><Building className="w-4 h-4" />{detailData.company}</p>}
              </DialogHeader>
              <div className="flex flex-wrap gap-2">
                <Badge variant={["وظيفة شاغرة", "عمال مهرة"].includes(detailData.subCategory) ? "default" : "secondary"}>{detailData.subCategory}</Badge>
                {detailData.jobType && <Badge variant="outline">{detailData.jobType}</Badge>}
                {detailData.field && <Badge variant="outline">{detailData.field}</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow icon={<MapPin className="w-4 h-4" />} label="الموقع" val={`${detailData.province} - ${detailData.city}`} />
                {detailData.salary && <InfoRow icon={<>💰</>} label="الراتب" val={detailData.salary} />}
                {detailData.experience && <InfoRow icon={<Clock className="w-4 h-4" />} label="الخبرة" val={detailData.experience} />}
              </div>
              {detailData.description && (
                <div>
                  <p className="font-semibold mb-1 text-sm">الوصف</p>
                  <div className="bg-muted/30 rounded-lg p-3 text-sm whitespace-pre-line">{detailData.description}</div>
                </div>
              )}
              {detailData.requirements && (
                <div>
                  <p className="font-semibold mb-1 text-sm">المتطلبات</p>
                  <div className="bg-muted/30 rounded-lg p-3 text-sm whitespace-pre-line">{detailData.requirements}</div>
                </div>
              )}
              <div className="border-t pt-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{detailData.posterName || "الناشر"}</p>
                  {(detailData.phone || detailData.posterPhone) && (
                    <p className="text-sm text-muted-foreground">📞 {detailData.phone || detailData.posterPhone}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {(detailData.phone || detailData.posterPhone) && (
                    <a href={`tel:${detailData.phone || detailData.posterPhone}`}>
                      <Button size="sm" variant="outline">📞 اتصال</Button>
                    </a>
                  )}
                  {user && detailData.posterId !== user.id && (
                    <Button size="sm" onClick={() => { startChat(detailData.posterId); setDetail(null); }}>
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
          <DialogHeader><DialogTitle className="text-right">نشر إعلان وظيفي</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>نوع الإعلان *</Label>
              <Select value={form.subCategory} onValueChange={v => f("subCategory", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUB_CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>المسمى الوظيفي *</Label>
              <Input placeholder="مثال: مطور ويب، معلم رياضيات..." value={form.title} onChange={e => f("title", e.target.value)} />
            </div>
            <div>
              <Label>الشركة / المؤسسة</Label>
              <Input placeholder="اسم الشركة أو المؤسسة" value={form.company} onChange={e => f("company", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>نوع الدوام</Label>
                <Select value={form.jobType} onValueChange={v => f("jobType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{JOB_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>مستوى الخبرة</Label>
                <Select value={form.experience} onValueChange={v => f("experience", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXPERIENCE_LEVELS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>مجال العمل</Label>
              <Select value={form.field} onValueChange={v => f("field", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FIELDS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label>الراتب</Label>
                <Input type="number" placeholder="المبلغ" value={form.salary} onChange={e => f("salary", e.target.value)} />
              </div>
              <div>
                <Label>الفترة</Label>
                <Select value={form.salaryUnit} onValueChange={v => f("salaryUnit", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="شهري">شهري</SelectItem>
                    <SelectItem value="يومي">يومي</SelectItem>
                    <SelectItem value="بالمشروع">بالمشروع</SelectItem>
                  </SelectContent>
                </Select>
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
                <Input placeholder="المدينة أو المنطقة" value={form.city} onChange={e => f("city", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>رقم الهاتف / واتساب</Label>
              <Input type="tel" placeholder="مثال: 0991234567" value={form.phone} onChange={e => f("phone", e.target.value)} />
            </div>
            <div>
              <Label>وصف الوظيفة</Label>
              <Textarea placeholder="وصف تفصيلي للوظيفة، المهام والمسؤوليات..." value={form.description} onChange={e => f("description", e.target.value)} rows={3} />
            </div>
            <div>
              <Label>متطلبات الوظيفة</Label>
              <Textarea placeholder="المؤهلات والمتطلبات المطلوبة..." value={form.requirements} onChange={e => f("requirements", e.target.value)} rows={3} />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              نشر الإعلان
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Apply Request Dialog ── */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">طلب توظيف</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>المسمى الوظيفي المطلوب</Label>
              <Input placeholder="مثال: مطور ويب، معلم، محاسب..." style={{ fontSize: 16 }}
                value={applyForm.jobTitle} onChange={e => setApplyForm(p => ({ ...p, jobTitle: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المجال *</Label>
                <Select value={applyForm.field} onValueChange={v => setApplyForm(p => ({ ...p, field: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FIELDS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>الخبرة *</Label>
                <Select value={applyForm.experience} onValueChange={v => setApplyForm(p => ({ ...p, experience: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXPERIENCE_LEVELS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المحافظة *</Label>
                <Select value={applyForm.province} onValueChange={v => setApplyForm(p => ({ ...p, province: v }))}>
                  <SelectTrigger><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                  <SelectContent>{SYRIAN_PROVINCES.map(pr => <SelectItem key={pr} value={pr}>{pr}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>المدينة *</Label>
                <Input placeholder="مثال: دمشق، حلب..." style={{ fontSize: 16 }}
                  value={applyForm.city} onChange={e => setApplyForm(p => ({ ...p, city: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>نبذة عن نفسك / مهاراتك</Label>
              <Textarea placeholder="مثال: خبرة 3 سنوات في البرمجة، أجيد اللغة الإنجليزية، حاصل على شهادة جامعية..." rows={3}
                value={applyForm.description} onChange={e => setApplyForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <Button className="w-full gap-2 bg-amber-600 hover:bg-amber-700" onClick={handleApplySubmit} disabled={applyMutation.isPending}>
              {applyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              إرسال طلب التوظيف
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JobCard({ job, onOpen }: { job: Job; onOpen: () => void }) {
  const timeAgo = new Date(job.createdAt).toLocaleDateString("ar-SY");
  return (
    <div
      className={cn("bg-card border border-border/60 rounded-xl p-4 cursor-pointer hover:border-primary/50 transition-colors", job.isFeatured && "border-yellow-500/50")}
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {job.isFeatured && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />}
            <p className="font-semibold text-sm">{job.title}</p>
          </div>
          {job.company && <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Building className="w-3 h-3" />{job.company}</p>}
        </div>
        <Badge variant={job.subCategory === "وظيفة شاغرة" ? "default" : "secondary"} className="text-xs shrink-0">
          {job.subCategory === "وظيفة شاغرة" ? "🏢 شاغرة" : job.subCategory === "طلب توظيف" ? "👤 طلب" : job.subCategory === "عمالة منزلية" ? "🏠 منزلية" : "🛠️ مهرة"}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.province} - {job.city}</span>
        {job.jobType && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{job.jobType}</span>}
        {job.field && <Badge variant="outline" className="text-xs">{job.field}</Badge>}
        {job.salary && <span className="text-green-400 font-medium">{job.salary}</span>}
      </div>
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>{timeAgo}</span>
        {job.experience && <span>{job.experience}</span>}
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
