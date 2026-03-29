import { useLocation } from "wouter";
import { ArrowRight, Shield } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function PrivacyPolicyPage() {
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
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-lg">{isRTL ? "سياسة الخصوصية" : "Privacy Policy"}</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 text-sm leading-relaxed">
        <p className="text-muted-foreground">
          {isRTL
            ? "آخر تحديث: مارس 2026"
            : "Last updated: March 2026"}
        </p>

        <Section
          title={isRTL ? "مقدمة" : "Introduction"}
          content={isRTL
            ? "مرحباً بك في تطبيق MARKLET — السوق الذكي للسيارات في سورية. نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. توضح هذه السياسة كيفية جمع معلوماتك واستخدامها وحمايتها عند استخدام تطبيقنا."
            : "Welcome to MARKLET — Syria's Smart Car Marketplace. We respect your privacy and are committed to protecting your personal data. This policy explains how we collect, use, and protect your information when you use our app."}
        />

        <Section
          title={isRTL ? "المعلومات التي نجمعها" : "Information We Collect"}
          content={isRTL
            ? "نجمع المعلومات التالية عند استخدامك للتطبيق:\n• معلومات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف\n• معلومات الإعلانات: صور السيارات، بيانات المركبة، السعر، الموقع الجغرافي\n• بيانات الاستخدام: كيفية تفاعلك مع التطبيق\n• معلومات الجهاز: نوع الجهاز، نظام التشغيل، معرف الجهاز لأغراض الإشعارات"
            : "We collect the following information when you use the app:\n• Account info: Name, email address, phone number\n• Listing info: Car photos, vehicle data, price, location\n• Usage data: How you interact with the app\n• Device info: Device type, OS, device ID for push notifications"}
        />

        <Section
          title={isRTL ? "كيف نستخدم معلوماتك" : "How We Use Your Information"}
          content={isRTL
            ? "نستخدم معلوماتك للأغراض التالية:\n• تشغيل التطبيق وتقديم خدماتنا\n• عرض إعلاناتك وربطك بالمشترين والبائعين\n• إرسال إشعارات حول العروض والرسائل والتحديثات\n• تحسين تجربة المستخدم وتطوير التطبيق\n• ضمان أمان المنصة ومنع الاحتيال"
            : "We use your information to:\n• Operate the app and provide our services\n• Display your listings and connect you with buyers/sellers\n• Send notifications about offers, messages, and updates\n• Improve user experience and develop the app\n• Ensure platform security and prevent fraud"}
        />

        <Section
          title={isRTL ? "مشاركة المعلومات" : "Information Sharing"}
          content={isRTL
            ? "لا نبيع بياناتك الشخصية لأطراف ثالثة. قد نشارك معلوماتك فقط في الحالات التالية:\n• مع المستخدمين الآخرين: معلومات الإعلانات العامة وبيانات الاتصال التي اخترت إظهارها\n• مع مزودي الخدمة: شركاء التقنية الذين يساعدوننا في تشغيل التطبيق (Firebase، خوادم الاستضافة)\n• بموجب القانون: إذا طُلب ذلك بموجب أمر قضائي أو حكم قانوني"
            : "We do not sell your personal data. We may share information only in these cases:\n• With other users: Public listing info and contact details you chose to display\n• With service providers: Technology partners who help operate the app (Firebase, hosting)\n• By law: If required by court order or legal obligation"}
        />

        <Section
          title={isRTL ? "الإشعارات وخدمات الطرف الثالث" : "Notifications & Third-Party Services"}
          content={isRTL
            ? "نستخدم خدمة Firebase Cloud Messaging (FCM) من Google لإرسال الإشعارات. تخضع هذه الخدمة لسياسة خصوصية Google. يمكنك تعطيل الإشعارات في أي وقت من إعدادات جهازك."
            : "We use Google's Firebase Cloud Messaging (FCM) to send notifications. This service is subject to Google's privacy policy. You can disable notifications at any time from your device settings."}
        />

        <Section
          title={isRTL ? "تخزين البيانات وأمانها" : "Data Storage & Security"}
          content={isRTL
            ? "تُخزّن بياناتك على خوادم آمنة. نستخدم بروتوكول HTTPS لتشفير جميع البيانات المنقولة. كلمات المرور مشفّرة ولا يمكن لأحد الاطلاع عليها بما فيهم فريقنا."
            : "Your data is stored on secure servers. We use HTTPS to encrypt all transmitted data. Passwords are hashed and cannot be viewed by anyone, including our team."}
        />

        <Section
          title={isRTL ? "حقوقك" : "Your Rights"}
          content={isRTL
            ? "لديك الحق في:\n• الاطلاع على بياناتك الشخصية\n• تعديل معلوماتك من صفحة الملف الشخصي\n• حذف حسابك وجميع بياناتك المرتبطة به\n• إلغاء الاشتراك في الإشعارات\n\nللتواصل بشأن بياناتك: support@marklet.net"
            : "You have the right to:\n• Access your personal data\n• Edit your information from your profile page\n• Delete your account and all associated data\n• Unsubscribe from notifications\n\nContact us about your data: support@marklet.net"}
        />

        <Section
          title={isRTL ? "بيانات الأطفال" : "Children's Data"}
          content={isRTL
            ? "تطبيقنا غير مخصص للأشخاص دون سن 18 عاماً. إذا اكتشفنا أن طفلاً دون هذا السن قدّم بياناته، سنحذفها فوراً."
            : "Our app is not intended for persons under 18 years of age. If we discover a child has provided their data, we will delete it immediately."}
        />

        <Section
          title={isRTL ? "التغييرات على هذه السياسة" : "Changes to This Policy"}
          content={isRTL
            ? "قد نحدّث سياسة الخصوصية هذه من وقت لآخر. سنُعلمك بأي تغييرات جوهرية عبر إشعار داخل التطبيق أو عبر البريد الإلكتروني."
            : "We may update this privacy policy from time to time. We will notify you of any significant changes via an in-app notification or email."}
        />

        <div className="border-t pt-6">
          <p className="text-muted-foreground text-center">
            {isRTL
              ? "للتواصل معنا: support@marklet.net | marklet.net"
              : "Contact us: support@marklet.net | marklet.net"}
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
