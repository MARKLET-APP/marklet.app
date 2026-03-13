import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { HeadphonesIcon, MessageSquare, Lightbulb, AlertCircle, CheckCircle } from "lucide-react";

const TYPES = [
  { value: "دعم فني", label: "دعم فني", icon: HeadphonesIcon, color: "border-blue-200 bg-blue-50 text-blue-700" },
  { value: "شكوى", label: "شكوى", icon: AlertCircle, color: "border-red-200 bg-red-50 text-red-700" },
  { value: "اقتراح", label: "اقتراح", icon: Lightbulb, color: "border-amber-200 bg-amber-50 text-amber-700" },
];

export default function SupportPage() {
  const { user, token } = useAuthStore();
  const { toast } = useToast();

  const [type, setType] = useState("دعم فني");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [done, setDone] = useState(false);

  const supportMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, message, userId: user?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      return data;
    },
    onSuccess: (data) => {
      toast({ title: data.message ?? "تم الإرسال" });
      setMessage("");
      setDone(true);
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const feedbackMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ feedback, userId: user?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      return data;
    },
    onSuccess: (data) => {
      toast({ title: data.message ?? "شكراً على ملاحظتك" });
      setFeedback("");
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-10">
      <div className="text-center space-y-2">
        <HeadphonesIcon className="w-14 h-14 text-primary mx-auto" />
        <h1 className="text-3xl font-bold text-foreground">تواصل مع فريق CarNet</h1>
        <p className="text-muted-foreground">نحن هنا لمساعدتك في أي وقت</p>
      </div>

      {done ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-green-700">تم إرسال رسالتك بنجاح</h2>
          <p className="text-green-600">سيتواصل معك فريقنا في أقرب وقت ممكن</p>
          <Button variant="outline" onClick={() => setDone(false)} className="mt-2">إرسال رسالة أخرى</Button>
        </div>
      ) : (
        <div className="bg-card border rounded-2xl p-6 space-y-5 shadow-sm">
          <h2 className="text-xl font-bold flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /> أرسل رسالة</h2>

          <div className="grid grid-cols-3 gap-3">
            {TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium ${type === t.value ? t.color + " border-current" : "border-border hover:border-primary/30"}`}
              >
                <t.icon className="w-5 h-5" />
                {t.label}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">رسالتك</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              placeholder="اكتب رسالتك هنا..."
              className="w-full border rounded-xl px-4 py-3 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <Button
            className="w-full rounded-xl font-bold"
            disabled={!message.trim() || supportMutation.isPending}
            onClick={() => supportMutation.mutate()}
          >
            {supportMutation.isPending ? "جارٍ الإرسال..." : "إرسال الرسالة"}
          </Button>
        </div>
      )}

      <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
        <h2 className="text-xl font-bold flex items-center gap-2"><Lightbulb className="w-5 h-5 text-amber-500" /> ملاحظات واقتراحات</h2>
        <p className="text-sm text-muted-foreground">شاركنا أفكارك لتحسين التطبيق</p>
        <textarea
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          rows={3}
          placeholder="اكتب اقتراحك أو ملاحظتك..."
          className="w-full border rounded-xl px-4 py-3 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <Button
          variant="outline"
          className="w-full rounded-xl font-bold"
          disabled={!feedback.trim() || feedbackMutation.isPending}
          onClick={() => feedbackMutation.mutate()}
        >
          {feedbackMutation.isPending ? "جارٍ الإرسال..." : "إرسال الاقتراح"}
        </Button>
      </div>
    </div>
  );
}
