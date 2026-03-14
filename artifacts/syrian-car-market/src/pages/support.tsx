import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { HeadphonesIcon, MessageSquare, Lightbulb, AlertCircle, CheckCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function SupportPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();

  const TYPES = [
    { value: "دعم فني", label: isRTL ? "دعم فني" : "Technical Support", icon: HeadphonesIcon, color: "border-blue-200 bg-blue-50 text-blue-700" },
    { value: "شكوى", label: isRTL ? "شكوى" : "Complaint", icon: AlertCircle, color: "border-red-200 bg-red-50 text-red-700" },
    { value: "اقتراح", label: isRTL ? "اقتراح" : "Suggestion", icon: Lightbulb, color: "border-amber-200 bg-amber-50 text-amber-700" },
  ];

  const [type, setType] = useState("دعم فني");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [done, setDone] = useState(false);

  const supportMutation = useMutation({
    mutationFn: () => api.support.send({ type, message, userId: user?.id }),
    onSuccess: (data) => {
      toast({ title: data.message ?? t("support.success") });
      setMessage("");
      setDone(true);
    },
    onError: () => toast({ title: t("common.error"), variant: "destructive" }),
  });

  const feedbackMutation = useMutation({
    mutationFn: () => api.support.feedback({ feedback, userId: user?.id }),
    onSuccess: (data) => {
      toast({ title: data.message ?? (isRTL ? "شكراً على ملاحظتك" : "Thanks for your feedback") });
      setFeedback("");
    },
    onError: () => toast({ title: t("common.error"), variant: "destructive" }),
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-10">
      <div className="text-center space-y-2">
        <HeadphonesIcon className="w-14 h-14 text-primary mx-auto" />
        <h1 className="text-3xl font-bold text-foreground">{t("support.title")}</h1>
        <p className="text-muted-foreground">{t("support.subtitle")}</p>
      </div>

      {done ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-green-700">{t("support.success")}</h2>
          <p className="text-green-600">{t("support.successDesc")}</p>
          <Button variant="outline" onClick={() => setDone(false)} className="mt-2">
            {isRTL ? "إرسال رسالة أخرى" : "Send Another Message"}
          </Button>
        </div>
      ) : (
        <div className="bg-card border rounded-2xl p-6 space-y-5 shadow-sm">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            {isRTL ? "أرسل رسالة" : "Send a Message"}
          </h2>

          <div className="grid grid-cols-3 gap-3">
            {TYPES.map(tp => (
              <button
                key={tp.value}
                type="button"
                onClick={() => setType(tp.value)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium ${type === tp.value ? tp.color + " border-current" : "border-border hover:border-primary/30"}`}
              >
                <tp.icon className="w-5 h-5" />
                {tp.label}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">{t("support.form.message")}</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              placeholder={isRTL ? "اكتب رسالتك هنا..." : "Write your message here..."}
              className="w-full border rounded-xl px-4 py-3 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <Button
            className="w-full rounded-xl font-bold"
            disabled={!message.trim() || supportMutation.isPending}
            onClick={() => supportMutation.mutate()}
          >
            {supportMutation.isPending ? t("support.form.submitting") : t("support.form.submit")}
          </Button>
        </div>
      )}

      <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          {isRTL ? "ملاحظات واقتراحات" : "Feedback & Suggestions"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isRTL ? "شاركنا أفكارك لتحسين التطبيق" : "Share your ideas to help us improve the app"}
        </p>
        <textarea
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          rows={3}
          placeholder={isRTL ? "اكتب اقتراحك أو ملاحظتك..." : "Write your suggestion or feedback..."}
          className="w-full border rounded-xl px-4 py-3 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <Button
          variant="outline"
          className="w-full rounded-xl font-bold"
          disabled={!feedback.trim() || feedbackMutation.isPending}
          onClick={() => feedbackMutation.mutate()}
        >
          {feedbackMutation.isPending ? t("support.form.submitting") : (isRTL ? "إرسال الاقتراح" : "Submit Feedback")}
        </Button>
      </div>
    </div>
  );
}
