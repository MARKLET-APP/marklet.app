import { useLocation } from "wouter";
import { ArrowRight, FileText } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function TermsPage() {
  const [, navigate] = useLocation();
  const { language } = useLanguage();
  const isRTL = language === "ar";

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1 as any)} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ArrowRight className={`w-5 h-5 ${isRTL ? "" : "rotate-180"}`} />
        </button>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-lg">{isRTL ? "الشروط والأحكام" : "Terms & Conditions"}</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 text-sm leading-relaxed">
        <p className="text-muted-foreground">
          {isRTL ? "آخر تحديث: مارس 2026" : "Last updated: March 2026"}
        </p>

        <Section
          title={isRTL ? "القبول بالشروط" : "Acceptance of Terms"}
          content={isRTL
            ? "باستخدامك لتطبيق LAZEMNI فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء منها، يرجى التوقف عن استخدام التطبيق."
            : "By using LAZEMNI, you agree to be bound by these Terms & Conditions. If you do not agree to any part of these terms, please stop using the app."}
        />

        <Section
          title={isRTL ? "وصف الخدمة" : "Service Description"}
          content={isRTL
            ? "LAZEMNI هو سوق إلكتروني يربط بائعي ومشتري السيارات والمركبات وقطع الغيار في سورية. نحن نوفر المنصة فقط ولسنا طرفاً في أي صفقة بيع أو شراء."
            : "LAZEMNI is an online marketplace connecting car buyers and sellers, vehicles, and spare parts in Syria. We provide the platform only and are not a party to any sale or purchase transaction."}
        />

        <Section
          title={isRTL ? "شروط الإعلانات" : "Listing Terms"}
          content={isRTL
            ? "عند نشر إعلان على المنصة، تتعهد بالآتي:\n• أن المعلومات المقدمة صحيحة ودقيقة\n• أنك تملك حق البيع أو التفويض به\n• عدم نشر إعلانات مضللة أو احتيالية\n• عدم نشر مركبات مسروقة أو ممنوعة قانونياً\n• الالتزام بأسعار السوق المعقولة"
            : "When posting a listing, you agree to:\n• Provide truthful and accurate information\n• Have the right to sell or be authorized to do so\n• Not post misleading or fraudulent listings\n• Not list stolen or legally prohibited vehicles\n• Adhere to reasonable market prices"}
        />

        <Section
          title={isRTL ? "سلوك المستخدم" : "User Conduct"}
          content={isRTL
            ? "يُحظر على المستخدمين:\n• نشر محتوى مسيء أو تمييزي\n• التحرش أو الإساءة للمستخدمين الآخرين\n• محاولة اختراق المنصة أو التلاعب بها\n• إنشاء حسابات وهمية متعددة\n• استخدام التطبيق لأغراض غير مشروعة"
            : "Users are prohibited from:\n• Posting offensive or discriminatory content\n• Harassing or abusing other users\n• Attempting to hack or manipulate the platform\n• Creating multiple fake accounts\n• Using the app for illegal purposes"}
        />

        <Section
          title={isRTL ? "المسؤولية" : "Liability"}
          content={isRTL
            ? "LAZEMNI غير مسؤول عن:\n• صحة المعلومات المقدمة من المستخدمين\n• أي خلافات تنشأ بين البائع والمشتري\n• جودة أو حالة المركبات المعلنة\n• أي خسائر مالية ناتجة عن صفقات المستخدمين\n\nيُنصح بإجراء فحص شامل للمركبة قبل إتمام أي عملية شراء."
            : "LAZEMNI is not responsible for:\n• The accuracy of information provided by users\n• Any disputes arising between buyer and seller\n• The quality or condition of listed vehicles\n• Any financial losses from user transactions\n\nWe recommend a thorough vehicle inspection before completing any purchase."}
        />

        <Section
          title={isRTL ? "الملكية الفكرية" : "Intellectual Property"}
          content={isRTL
            ? "جميع حقوق الملكية الفكرية لتطبيق LAZEMNI، بما في ذلك الشعار والتصميم والكود البرمجي، محفوظة لـ LAZEMNI. لا يجوز نسخ أو توزيع أي جزء من التطبيق دون إذن مسبق."
            : "All intellectual property rights of the LAZEMNI app, including logo, design, and code, are reserved by LAZEMNI. No part of the app may be copied or distributed without prior permission."}
        />

        <Section
          title={isRTL ? "إنهاء الحساب" : "Account Termination"}
          content={isRTL
            ? "نحتفظ بالحق في تعليق أو إنهاء أي حساب يخالف هذه الشروط أو يُشكّل خطراً على المنصة أو مستخدميها، دون الحاجة إلى إشعار مسبق."
            : "We reserve the right to suspend or terminate any account that violates these terms or poses a risk to the platform or its users, without prior notice."}
        />

        <Section
          title={isRTL ? "التعديلات على الشروط" : "Modifications to Terms"}
          content={isRTL
            ? "يحق لنا تعديل هذه الشروط في أي وقت. سيتم إشعارك بأي تغييرات جوهرية. استمرارك في استخدام التطبيق بعد نشر التغييرات يُعدّ موافقة منك عليها."
            : "We may modify these terms at any time. You will be notified of any significant changes. Continued use of the app after changes are posted constitutes your acceptance."}
        />

        <div className="border-t pt-6">
          <p className="text-muted-foreground text-center">
            {isRTL
              ? "للتواصل معنا: support@lazemni.net | lazemni.net"
              : "Contact us: support@lazemni.net | lazemni.net"}
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div className="space-y-2">
      <h2 className="font-bold text-base text-foreground">{title}</h2>
      <div className="text-muted-foreground whitespace-pre-line">{content}</div>
    </div>
  );
}
