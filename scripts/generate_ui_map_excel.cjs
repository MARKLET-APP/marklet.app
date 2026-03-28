const XLSX = require('/home/runner/workspace/node_modules/xlsx');
const path = require('path');

const wb = XLSX.utils.book_new();

// ─── Sheet 1: Routes ───────────────────────────────────────────────────────
const routes = [
  ["Route", "UI Code", "الصفحة"],
  ["/", "HOME_01", "الصفحة الرئيسية"],
  ["/reels", "REELS_01", "صفحة الفيديوهات"],
  ["/reels/upload", "REELS_UPLOAD_01", "رفع فيديو"],
  ["/search", "SEARCH_01", "البحث"],
  ["/cars/:id", "CAR_DETAIL_01", "تفاصيل السيارة"],
  ["/add-listing", "POST_01", "نشر إعلان"],
  ["/vehicle-info", "VEHICLE_INFO_01", "معلومات المركبة"],
  ["/login", "LOGIN_01", "تسجيل الدخول"],
  ["/register", "REGISTER_01", "إنشاء حساب"],
  ["/profile", "PROFILE_01", "الملف الشخصي"],
  ["/chat", "CHAT_01", "المراسلة"],
  ["/messages", "CHAT_01", "المراسلة (alias)"],
  ["/favorites", "FAVORITES_01", "المفضلة"],
  ["/buy-requests", "BUY_REQUESTS_01", "طلبات الشراء"],
  ["/car-parts", "CAR_PARTS_01", "قطع السيارات"],
  ["/junk-cars", "JUNK_CARS_01", "سيارات الحوادث"],
  ["/missing-cars", "MISSING_CARS_01", "السيارات المسروقة"],
  ["/inspections", "INSPECTIONS_01", "الفحوصات"],
  ["/support", "SUPPORT_01", "الدعم والتغذية الراجعة"],
  ["/plates", "PLATES_01", "لوحات السيارات"],
  ["/auctions", "AUCTIONS_01", "المزادات"],
  ["/rental-cars", "RENTAL_CARS_01", "تأجير السيارات"],
  ["/new-cars", "NEW_CARS_01", "سيارات جديدة"],
  ["/used-cars", "USED_CARS_01", "سيارات مستعملة"],
  ["/motorcycles", "MOTORCYCLES_01", "الدراجات النارية"],
  ["/showrooms", "SHOWROOMS_01", "المعارض"],
  ["/showroom/:id", "SHOWROOM_DETAIL_01", "تفاصيل المعرض"],
  ["/showroom/manage", "SHOWROOM_MANAGE_01", "إدارة المعرض"],
  ["/inspection-centers", "INSPECTION_CENTERS_01", "مراكز الفحص"],
  ["/inspection-center/:id", "INSPECTION_CENTER_DETAIL_01", "تفاصيل مركز الفحص"],
  ["/inspection-center/manage", "INSPECTION_CENTER_MANAGE_01", "إدارة مركز الفحص"],
  ["/scrap-centers", "SCRAP_CENTERS_01", "مراكز الخردة"],
  ["/scrap-center/:id", "SCRAP_CENTER_DETAIL_01", "تفاصيل مركز الخردة"],
  ["/scrap-center/manage", "SCRAP_CENTER_MANAGE_01", "إدارة مركز الخردة"],
  ["/admin", "ADMIN_01", "لوحة التحكم"],
  ["/admin/system-audit", "ADMIN_SYSTEM_AUDIT_01", "مراجعة النظام"],
];
const wsRoutes = XLSX.utils.aoa_to_sheet(routes);
wsRoutes['!cols'] = [{wch: 32}, {wch: 30}, {wch: 28}];
XLSX.utils.book_append_sheet(wb, wsRoutes, 'Routes - المسارات');

// ─── Sheet 2: Pages ────────────────────────────────────────────────────────
const pages = [
  ["UI Code", "الاسم", "الملف", "الوظيفة"],
  ["HOME_01", "الصفحة الرئيسية", "pages/home.tsx", "عرض الإعلانات والخلاصة الرئيسية"],
  ["REELS_01", "صفحة الفيديوهات", "pages/reels.tsx", "تصفح ريلز السيارات"],
  ["REELS_UPLOAD_01", "رفع فيديو", "pages/reels-upload.tsx", "رفع فيديو جديد"],
  ["SEARCH_01", "البحث", "pages/search.tsx", "البحث والفلترة المتقدمة"],
  ["CAR_DETAIL_01", "تفاصيل السيارة", "pages/car-detail.tsx", "عرض تفاصيل إعلان سيارة"],
  ["POST_01", "نشر إعلان", "pages/add-listing.tsx", "إنشاء إعلان بيع جديد"],
  ["VEHICLE_INFO_01", "معلومات المركبة", "pages/vehicle-info.tsx", "استعلام تاريخ المركبة بالـ VIN"],
  ["LOGIN_01", "تسجيل الدخول", "pages/login.tsx", "نموذج تسجيل الدخول"],
  ["REGISTER_01", "إنشاء حساب", "pages/register.tsx", "نموذج إنشاء حساب جديد"],
  ["PROFILE_01", "الملف الشخصي", "pages/profile.tsx", "بيانات المستخدم وإعلاناته"],
  ["CHAT_01", "المراسلة", "pages/messages.tsx", "قائمة المحادثات وغرفة الدردشة"],
  ["FAVORITES_01", "المفضلة", "pages/favorites.tsx", "الإعلانات المحفوظة"],
  ["BUY_REQUESTS_01", "طلبات الشراء", "pages/buy-requests.tsx", "طلبات شراء السيارات"],
  ["CAR_PARTS_01", "قطع السيارات", "pages/car-parts.tsx", "بيع وشراء قطع السيارات"],
  ["JUNK_CARS_01", "سيارات الحوادث", "pages/junk-cars.tsx", "بيع وشراء سيارات الحوادث"],
  ["MISSING_CARS_01", "السيارات المسروقة", "pages/missing-cars.tsx", "الإبلاغ عن سيارات مسروقة"],
  ["INSPECTIONS_01", "الفحوصات", "pages/inspections.tsx", "طلبات فحص السيارات"],
  ["SUPPORT_01", "الدعم", "pages/support.tsx", "الدعم الفني والتغذية الراجعة"],
  ["PLATES_01", "لوحات السيارات", "pages/plates.tsx", "بيع وشراء لوحات السيارات"],
  ["AUCTIONS_01", "المزادات", "pages/auctions.tsx", "مزادات السيارات"],
  ["RENTAL_CARS_01", "تأجير السيارات", "pages/rental-cars.tsx", "إعلانات تأجير السيارات"],
  ["NEW_CARS_01", "سيارات جديدة", "pages/new-cars.tsx", "إعلانات السيارات الجديدة"],
  ["USED_CARS_01", "سيارات مستعملة", "pages/used-cars.tsx", "إعلانات السيارات المستعملة"],
  ["MOTORCYCLES_01", "الدراجات النارية", "pages/motorcycles.tsx", "إعلانات الدراجات النارية"],
  ["SHOWROOMS_01", "المعارض", "pages/showrooms.tsx", "قائمة معارض السيارات"],
  ["SHOWROOM_DETAIL_01", "تفاصيل المعرض", "pages/showroom.tsx", "صفحة معرض واحد"],
  ["SHOWROOM_MANAGE_01", "إدارة المعرض", "pages/showroom-manage.tsx", "لوحة إدارة المعرض (للتجار)"],
  ["INSPECTION_CENTERS_01", "مراكز الفحص", "pages/inspection-centers.tsx", "قائمة مراكز الفحص"],
  ["INSPECTION_CENTER_DETAIL_01", "تفاصيل مركز الفحص", "pages/inspection-center.tsx", "صفحة مركز فحص واحد"],
  ["INSPECTION_CENTER_MANAGE_01", "إدارة مركز الفحص", "pages/inspection-center-manage.tsx", "لوحة إدارة مركز الفحص"],
  ["SCRAP_CENTERS_01", "مراكز الخردة", "pages/scrap-centers.tsx", "قائمة مراكز الخردة"],
  ["SCRAP_CENTER_DETAIL_01", "تفاصيل مركز الخردة", "pages/scrap-center.tsx", "صفحة مركز خردة واحد"],
  ["SCRAP_CENTER_MANAGE_01", "إدارة مركز الخردة", "pages/scrap-center-manage.tsx", "لوحة إدارة مركز الخردة"],
  ["ADMIN_01", "لوحة التحكم", "pages/admin.tsx", "لوحة الإدارة الرئيسية"],
  ["ADMIN_SYSTEM_AUDIT_01", "مراجعة النظام", "pages/system-audit.tsx", "فحص صحة النظام"],
  ["NOT_FOUND_01", "صفحة 404", "pages/not-found.tsx", "صفحة الخطأ"],
];
const wsPages = XLSX.utils.aoa_to_sheet(pages);
wsPages['!cols'] = [{wch: 32}, {wch: 26}, {wch: 38}, {wch: 40}];
XLSX.utils.book_append_sheet(wb, wsPages, 'Pages - الصفحات');

// ─── Sheet 3: Admin Tabs ────────────────────────────────────────────────────
const adminTabs = [
  ["UI Code", "الاسم", "قيمة Tab (value)", "الوظيفة"],
  ["ADMIN_TAB_USERS_01", "تبويب المستخدمون", "users", "إدارة حسابات المستخدمين"],
  ["ADMIN_TAB_DEALERS_01", "تبويب التجار", "dealers", "إدارة التجار المعتمدين"],
  ["ADMIN_TAB_SHOWROOMS_01", "تبويب المعارض", "showrooms", "إدارة المعارض"],
  ["ADMIN_TAB_INSPECTION_01", "تبويب مراكز الفحص", "inspection", "إدارة مراكز الفحص"],
  ["ADMIN_TAB_SCRAP_01", "تبويب مراكز الخردة", "scrap", "إدارة مراكز الخردة"],
  ["ADMIN_TAB_REVIEW_01", "تبويب مراجعة الإعلانات", "review", "مراجعة الإعلانات المعلقة"],
  ["ADMIN_TAB_LISTINGS_01", "تبويب الإعلانات", "listings", "عرض وإدارة كل الإعلانات"],
  ["ADMIN_TAB_INBOX_01", "تبويب الرسائل الواردة", "inbox", "رسائل الدعم والتغذية الراجعة"],
  ["ADMIN_TAB_NOTIFICATIONS_01", "تبويب الإشعارات", "notifications", "إرسال إشعارات جماعية"],
  ["ADMIN_TAB_SETTINGS_01", "تبويب الإعدادات", "settings", "إعدادات التطبيق"],
];
const wsAdminTabs = XLSX.utils.aoa_to_sheet(adminTabs);
wsAdminTabs['!cols'] = [{wch: 32}, {wch: 30}, {wch: 20}, {wch: 36}];
XLSX.utils.book_append_sheet(wb, wsAdminTabs, 'Admin Tabs - تبويبات الادمن');

// ─── Sheet 4: Buttons ───────────────────────────────────────────────────────
const buttons = [
  ["UI Code", "الاسم", "الملف", "الوظيفة", "النوع"],
  ["BTN_SHARE_01", "زر المشاركة", "components/ShareSheet.tsx", "مشاركة الإعلان", "عام"],
  ["BTN_CHAT_01", "زر فتح المحادثة", "components/ContactButtons.tsx", "بدء محادثة مع البائع", "عام"],
  ["BTN_CALL_01", "زر الاتصال", "components/ContactButtons.tsx", "الاتصال بالبائع", "عام"],
  ["BTN_WHATSAPP_01", "زر واتساب", "components/ContactButtons.tsx", "مراسلة البائع عبر واتساب", "عام"],
  ["BTN_SAVE_01", "زر الحفظ في المفضلة", "components/SaveButton.tsx", "حفظ الإعلان في المفضلة", "عام"],
  ["BTN_DELETE_01", "زر الحذف", "متعدد", "حذف العنصر", "عام"],
  ["BTN_EDIT_01", "زر التعديل", "متعدد", "تعديل العنصر", "عام"],
  ["BTN_BACK_01", "زر الرجوع", "components/layout/Header.tsx", "العودة للصفحة السابقة", "عام"],
  ["BTN_FILTER_01", "زر الفلترة", "pages/search.tsx", "فتح نافذة الفلترة", "عام"],
  ["BTN_SEARCH_01", "زر البحث", "متعدد", "تنفيذ البحث", "عام"],
  ["BTN_UPLOAD_IMAGES_01", "زر رفع الصور", "متعدد", "اختيار ورفع الصور", "عام"],
  ["BTN_UPLOAD_VIDEO_01", "زر رفع الفيديو", "pages/reels-upload.tsx", "اختيار ورفع الفيديو", "عام"],
  ["BTN_PROMOTE_01", "زر تمييز الإعلان", "pages/car-detail.tsx", "تمييز الإعلان مدفوعاً", "عام"],
  ["BTN_POST_01", "زر نشر إعلان", "components/layout/BottomNav.tsx", "الانتقال لصفحة نشر إعلان", "مستخدم"],
  ["BTN_LOGIN_01", "زر تسجيل الدخول", "pages/login.tsx", "إرسال فورم تسجيل الدخول", "مستخدم"],
  ["BTN_REGISTER_01", "زر إنشاء حساب", "pages/register.tsx", "إرسال فورم التسجيل", "مستخدم"],
  ["BTN_LOGOUT_01", "زر تسجيل الخروج", "components/layout/Header.tsx", "تسجيل الخروج", "مستخدم"],
  ["BTN_SOLD_01", "زر تأكيد البيع", "pages/car-detail.tsx", "تأكيد بيع السيارة", "مستخدم"],
  ["BTN_SELL_LISTING_01", "زر فتح نموذج البيع", "pages/car-parts.tsx, junk-cars.tsx, plates.tsx", "فتح نافذة البيع", "مستخدم"],
  ["BTN_BUY_LISTING_01", "زر فتح نموذج الشراء", "pages/car-parts.tsx, junk-cars.tsx, plates.tsx", "فتح نافذة الشراء", "مستخدم"],
  ["BTN_FOUND_01", "زر تأكيد العثور", "pages/missing-cars.tsx", "تأكيد العثور على السيارة", "مستخدم"],
  ["BTN_SEND_MSG_01", "زر إرسال رسالة", "pages/messages.tsx", "إرسال رسالة دردشة", "مستخدم"],
  ["BTN_SEND_AUDIO_01", "زر إرسال رسالة صوتية", "pages/messages.tsx", "إرسال تسجيل صوتي", "مستخدم"],
  ["BTN_SEND_SUPPORT_01", "زر إرسال طلب دعم", "pages/support.tsx", "إرسال رسالة للدعم الفني", "مستخدم"],
  ["BTN_SEND_FEEDBACK_01", "زر إرسال تغذية راجعة", "pages/support.tsx", "إرسال اقتراح أو ملاحظة", "مستخدم"],
  ["BTN_INSPECT_REQUEST_01", "زر طلب فحص", "pages/inspections.tsx", "طلب فحص سيارة", "مستخدم"],
  ["BTN_VEHICLE_REPORT_01", "زر فحص تاريخ المركبة", "components/VehicleReportWidget.tsx", "بدء استعلام VIN", "مستخدم"],
  ["BTN_REELS_UPLOAD_01", "زر رفع فيديو", "pages/reels-upload.tsx", "رفع ريل جديد", "مستخدم"],
  ["BTN_ADMIN_APPROVE_01", "زر الموافقة", "pages/admin.tsx", "قبول إعلان أو طلب", "ادمن"],
  ["BTN_ADMIN_REJECT_01", "زر الرفض", "pages/admin.tsx", "رفض إعلان أو طلب", "ادمن"],
  ["BTN_ADMIN_DELETE_01", "زر الحذف", "pages/admin.tsx", "حذف إعلان أو مستخدم", "ادمن"],
  ["BTN_ADMIN_FEATURE_01", "زر التمييز", "pages/admin.tsx", "تمييز إعلان أو معرض", "ادمن"],
  ["BTN_ADMIN_BAN_01", "زر الحظر", "pages/admin.tsx", "حظر مستخدم", "ادمن"],
  ["BTN_ADMIN_PROMOTE_DEALER_01", "زر ترقية تاجر", "pages/admin.tsx", "ترقية مستخدم إلى تاجر", "ادمن"],
  ["BTN_BROADCAST_SEND_01", "زر إرسال إشعار جماعي", "pages/admin.tsx", "إرسال إشعار Push لكل المستخدمين", "ادمن"],
  ["BTN_ADMIN_REFRESH_01", "زر تحديث البيانات", "pages/system-audit.tsx", "تحديث بيانات مراجعة النظام", "ادمن"],
  ["BTN_ADMIN_EXPORT_01", "زر تصدير البيانات", "pages/system-audit.tsx", "تصدير تقرير النظام", "ادمن"],
  ["BTN_ADMIN_OPEN_CHAT_01", "زر فتح محادثة", "pages/admin.tsx", "فتح محادثة مع مستخدم", "ادمن"],
];
const wsButtons = XLSX.utils.aoa_to_sheet(buttons);
wsButtons['!cols'] = [{wch: 30}, {wch: 28}, {wch: 46}, {wch: 40}, {wch: 12}];
XLSX.utils.book_append_sheet(wb, wsButtons, 'Buttons - الأزرار');

// ─── Sheet 5: Forms ─────────────────────────────────────────────────────────
const forms = [
  ["UI Code", "الاسم", "الملف", "الوظيفة"],
  ["FORM_POST_01", "فورم نشر الإعلان", "pages/add-listing.tsx", "إنشاء إعلان بيع سيارة جديد"],
  ["FORM_LOGIN_01", "فورم تسجيل الدخول", "pages/login.tsx", "إدخال البريد وكلمة المرور"],
  ["FORM_REGISTER_01", "فورم إنشاء حساب", "pages/register.tsx", "إنشاء حساب مستخدم جديد"],
  ["FORM_CHAT_01", "فورم إرسال رسالة", "pages/messages.tsx", "إرسال رسالة دردشة"],
  ["FORM_SUPPORT_01", "فورم الدعم", "pages/support.tsx", "إرسال رسالة للدعم الفني"],
  ["FORM_FEEDBACK_01", "فورم التغذية الراجعة", "pages/support.tsx", "إرسال اقتراح أو ملاحظة"],
  ["FORM_BUY_REQUEST_01", "فورم طلب الشراء", "pages/buy-requests.tsx", "نشر طلب شراء سيارة"],
  ["FORM_SELL_PART_01", "فورم بيع قطعة", "pages/car-parts.tsx", "نشر قطعة للبيع"],
  ["FORM_BUY_PART_01", "فورم طلب قطعة", "pages/car-parts.tsx", "نشر طلب شراء قطعة"],
  ["FORM_SELL_JUNK_01", "فورم بيع سيارة حوادث", "pages/junk-cars.tsx", "نشر سيارة حوادث للبيع"],
  ["FORM_BUY_JUNK_01", "فورم طلب سيارة حوادث", "pages/junk-cars.tsx", "نشر طلب شراء سيارة حوادث"],
  ["FORM_SELL_PLATE_01", "فورم بيع لوحة", "pages/plates.tsx", "نشر لوحة للبيع"],
  ["FORM_BUY_PLATE_01", "فورم طلب لوحة", "pages/plates.tsx", "نشر طلب شراء لوحة"],
  ["FORM_MISSING_CAR_01", "فورم إبلاغ سيارة مسروقة", "pages/missing-cars.tsx", "الإبلاغ عن سيارة مسروقة"],
  ["FORM_SHOWROOM_MANAGE_01", "فورم إدارة المعرض", "pages/showroom-manage.tsx", "تعديل بيانات المعرض"],
  ["FORM_INSPECTION_CENTER_MANAGE_01", "فورم إدارة مركز الفحص", "pages/inspection-center-manage.tsx", "تعديل بيانات مركز الفحص"],
  ["FORM_SCRAP_CENTER_MANAGE_01", "فورم إدارة مركز الخردة", "pages/scrap-center-manage.tsx", "تعديل بيانات مركز الخردة"],
  ["FORM_BROADCAST_01", "فورم الإشعار الجماعي", "pages/admin.tsx", "إرسال إشعار Push جماعي"],
  ["FORM_ADMIN_SHOWROOM_EDIT_01", "فورم تعديل معرض (ادمن)", "pages/admin.tsx", "إضافة/تعديل معرض من لوحة التحكم"],
  ["FORM_VEHICLE_INFO_01", "فورم معلومات المركبة", "components/VehicleReportWidget.tsx", "إدخال رقم VIN للاستعلام"],
  ["FORM_REELS_UPLOAD_01", "فورم رفع فيديو", "pages/reels-upload.tsx", "رفع ريل جديد"],
];
const wsForms = XLSX.utils.aoa_to_sheet(forms);
wsForms['!cols'] = [{wch: 36}, {wch: 30}, {wch: 44}, {wch: 38}];
XLSX.utils.book_append_sheet(wb, wsForms, 'Forms - النماذج');

// ─── Sheet 6: Inputs ─────────────────────────────────────────────────────────
const inputs = [
  ["UI Code", "الاسم", "أين يُستخدم", "الوظيفة"],
  ["INPUT_TITLE_01", "عنوان الإعلان", "POST_01, REGISTER_01", "عنوان الإعلان أو اسم المستخدم"],
  ["INPUT_PRICE_01", "السعر", "POST_01", "سعر السيارة"],
  ["INPUT_DESCRIPTION_01", "الوصف", "POST_01", "وصف السيارة"],
  ["INPUT_PHONE_01", "رقم الهاتف", "متعدد", "رقم التواصل"],
  ["INPUT_EMAIL_01", "البريد الإلكتروني", "LOGIN_01", "البريد أو رقم الهاتف للدخول"],
  ["INPUT_PASSWORD_01", "كلمة المرور", "LOGIN_01, REGISTER_01", "كلمة السر"],
  ["INPUT_IMAGES_01", "رفع الصور", "POST_01, PLATES_01", "تحميل صور الإعلان"],
  ["INPUT_VIDEO_01", "رفع الفيديو", "REELS_UPLOAD_01", "تحميل ملف الفيديو"],
  ["INPUT_SEARCH_01", "مربع البحث", "SEARCH_01, ADMIN_01", "البحث بالكلمات"],
  ["INPUT_CHAT_MESSAGE_01", "مربع رسالة الدردشة", "CHAT_01", "كتابة رسالة"],
  ["INPUT_YEAR_01", "سنة الصنع", "POST_01, SEARCH_01", "سنة الصنع"],
  ["INPUT_MILEAGE_01", "الكيلومتراج", "POST_01", "عداد المسافة"],
  ["INPUT_BRAND_01", "الماركة", "POST_01, SEARCH_01", "ماركة السيارة"],
  ["INPUT_MODEL_01", "الموديل", "POST_01, SEARCH_01", "موديل السيارة"],
  ["INPUT_CITY_01", "المدينة", "متعدد", "المدينة أو المنطقة"],
  ["INPUT_DEALER_01", "اسم المعرض", "SHOWROOM_MANAGE_01, ADMIN_01", "اسم المعرض"],
  ["INPUT_COLOR_01", "اللون", "POST_01", "لون السيارة"],
  ["INPUT_FUEL_01", "نوع الوقود", "POST_01", "بنزين/ديزل/كهربائي..."],
  ["INPUT_TRANSMISSION_01", "ناقل الحركة", "POST_01", "أوتوماتيك/يدوي"],
  ["INPUT_VIN_01", "رقم الشاسيه", "VEHICLE_INFO_01", "رقم VIN للاستعلام"],
  ["INPUT_PLATE_NUMBER_01", "رقم اللوحة", "PLATES_01", "رقم اللوحة المراد بيعها"],
  ["INPUT_PART_NAME_01", "اسم القطعة", "CAR_PARTS_01", "اسم قطعة السيارة"],
  ["INPUT_BROADCAST_TITLE_01", "عنوان الإشعار الجماعي", "ADMIN_01", "عنوان Push Notification"],
  ["INPUT_BROADCAST_BODY_01", "نص الإشعار الجماعي", "ADMIN_01", "نص Push Notification"],
  ["INPUT_ADMIN_SEARCH_01", "مربع بحث (ادمن)", "ADMIN_01", "البحث في قوائم الادمن"],
  ["INPUT_SUPPORT_MSG_01", "نص رسالة الدعم", "SUPPORT_01", "محتوى رسالة الدعم الفني"],
  ["INPUT_FEEDBACK_MSG_01", "نص التغذية الراجعة", "SUPPORT_01", "محتوى الاقتراح أو الملاحظة"],
  ["INPUT_MISSING_CAR_DESC_01", "وصف السيارة المسروقة", "MISSING_CARS_01", "تفاصيل السيارة المبلَّغ عنها"],
  ["INPUT_REELS_TITLE_01", "عنوان الفيديو", "REELS_UPLOAD_01", "عنوان الريل"],
  ["INPUT_INSPECTION_NOTES_01", "ملاحظات طلب الفحص", "INSPECTIONS_01", "ملاحظات الفحص"],
];
const wsInputs = XLSX.utils.aoa_to_sheet(inputs);
wsInputs['!cols'] = [{wch: 30}, {wch: 28}, {wch: 32}, {wch: 36}];
XLSX.utils.book_append_sheet(wb, wsInputs, 'Inputs - حقول الإدخال');

// ─── Sheet 7: Modals ─────────────────────────────────────────────────────────
const modals = [
  ["UI Code", "الاسم", "الملف", "الوظيفة", "النوع"],
  ["MODAL_SHARE_01", "نافذة المشاركة", "components/ShareSheet.tsx", "مشاركة رابط الإعلان", "مستخدم"],
  ["MODAL_FILTER_01", "نافذة الفلترة", "pages/search.tsx", "فلترة نتائج البحث", "مستخدم"],
  ["MODAL_BUY_REQUEST_DETAIL_01", "نافذة تفاصيل طلب الشراء", "pages/home.tsx", "عرض تفاصيل طلب شراء", "مستخدم"],
  ["MODAL_MISSING_CAR_INFO_01", "نافذة الإبلاغ عن سيارة مسروقة", "pages/home.tsx", "إرسال معلومات للصاحب", "مستخدم"],
  ["MODAL_CAR_SOLD_CONFIRM_01", "نافذة تأكيد البيع", "pages/car-detail.tsx", "تأكيد أن السيارة بِيعت", "مستخدم"],
  ["MODAL_CAR_EDIT_WARNING_01", "نافذة تنبيه قبل التعديل", "pages/car-detail.tsx", "تنبيه إعادة المراجعة", "مستخدم"],
  ["MODAL_CAR_EDIT_01", "نافذة تعديل الإعلان", "pages/car-detail.tsx", "تعديل بيانات إعلان السيارة", "مستخدم"],
  ["MODAL_LISTING_DETAIL_01", "نافذة تفاصيل الإعلان", "components/ListingDetailDialog.tsx", "عرض تفاصيل إعلان غير سيارة", "مستخدم"],
  ["MODAL_LISTING_PREVIEW_01", "نافذة معاينة الإعلان", "components/ListingPreviewDialog.tsx", "معاينة الإعلان قبل النشر", "مستخدم"],
  ["MODAL_FEATURE_AD_01", "نافذة تمييز الإعلان", "pages/profile.tsx", "طلب ترقية الإعلان", "مستخدم"],
  ["MODAL_RATING_01", "نافذة تقييم التطبيق", "components/AppRatingPopup.tsx", "طلب تقييم في المتجر", "مستخدم"],
  ["MODAL_SELL_PART_01", "نافذة بيع قطعة", "pages/car-parts.tsx", "نموذج بيع قطعة سيارة", "مستخدم"],
  ["MODAL_BUY_PART_01", "نافذة طلب قطعة", "pages/car-parts.tsx", "نموذج طلب قطعة سيارة", "مستخدم"],
  ["MODAL_SELL_JUNK_01", "نافذة بيع سيارة حوادث", "pages/junk-cars.tsx", "نموذج بيع سيارة حوادث", "مستخدم"],
  ["MODAL_BUY_JUNK_01", "نافذة طلب سيارة حوادث", "pages/junk-cars.tsx", "نموذج طلب سيارة حوادث", "مستخدم"],
  ["MODAL_SELL_PLATE_01", "نافذة بيع لوحة", "pages/plates.tsx", "نموذج بيع لوحة", "مستخدم"],
  ["MODAL_BUY_PLATE_01", "نافذة طلب لوحة", "pages/plates.tsx", "نموذج طلب شراء لوحة", "مستخدم"],
  ["MODAL_SELL_RENTAL_01", "نافذة تأجير سيارة", "pages/rental-cars.tsx", "نموذج نشر إعلان تأجير", "مستخدم"],
  ["MODAL_AUCTION_01", "نافذة تفاصيل المزاد", "pages/auctions.tsx", "عرض تفاصيل المزاد", "مستخدم"],
  ["MODAL_ADMIN_VIDEO_PREVIEW_01", "نافذة معاينة الفيديو", "pages/admin.tsx", "معاينة فيديو قبل النشر", "ادمن"],
  ["MODAL_ADMIN_BROADCAST_01", "نافذة الإشعار الجماعي", "pages/admin.tsx", "إرسال Push لكل المستخدمين", "ادمن"],
  ["MODAL_ADMIN_SHOWROOM_EDIT_01", "نافذة تعديل معرض", "pages/admin.tsx", "إضافة أو تعديل معرض", "ادمن"],
  ["MODAL_ADMIN_CAR_DETAIL_01", "نافذة تفاصيل إعلان", "pages/admin.tsx", "عرض تفاصيل إعلان للمراجعة", "ادمن"],
];
const wsModals = XLSX.utils.aoa_to_sheet(modals);
wsModals['!cols'] = [{wch: 32}, {wch: 32}, {wch: 40}, {wch: 38}, {wch: 12}];
XLSX.utils.book_append_sheet(wb, wsModals, 'Modals - النوافذ المنبثقة');

// ─── Sheet 8: Components ──────────────────────────────────────────────────
const components = [
  ["UI Code", "الاسم", "الملف", "الوظيفة"],
  ["COMP_HEADER_01", "الترويسة", "components/layout/Header.tsx", "شريط التنقل العلوي"],
  ["COMP_BOTTOM_NAV_01", "شريط التنقل السفلي", "components/layout/BottomNav.tsx", "التنقل بين الصفحات الرئيسية"],
  ["COMP_CARD_CAR_01", "بطاقة السيارة", "components/CarCard.tsx", "عرض مختصر لإعلان سيارة"],
  ["COMP_CARD_LISTING_01", "بطاقة الإعلان", "components/ListingCard.tsx", "عرض مختصر لإعلان غير سيارة"],
  ["COMP_CARD_BUY_REQUEST_01", "بطاقة طلب الشراء", "components/BuyRequestCard.tsx", "عرض طلب شراء في القائمة"],
  ["COMP_SHARE_SHEET_01", "ورقة المشاركة", "components/ShareSheet.tsx", "زر وورقة مشاركة الإعلان"],
  ["COMP_CONTACT_BUTTONS_01", "أزرار التواصل", "components/ContactButtons.tsx", "اتصال / واتساب / محادثة"],
  ["COMP_DHIKR_BAR_01", "شريط الذكر", "components/DhikrBar.tsx", "شريط ذكر الله المتحرك"],
  ["COMP_TOP_BANNER_01", "البانر الإعلاني", "components/TopBanner.tsx", "إعلان ترويجي في الأعلى"],
  ["COMP_VIDEO_CAROUSEL_01", "كاروسيل الفيديو", "components/VideoCarousel.tsx", "عرض مجموعة فيديوهات"],
  ["COMP_SAVE_BUTTON_01", "زر الحفظ في المفضلة", "components/SaveButton.tsx", "حفظ/إلغاء حفظ الإعلان"],
  ["COMP_VEHICLE_REPORT_01", "ودجة تقرير المركبة", "components/VehicleReportWidget.tsx", "استعلام تاريخ المركبة"],
  ["COMP_APP_RATING_POPUP_01", "نافذة تقييم التطبيق", "components/AppRatingPopup.tsx", "طلب التقييم في المتجر"],
  ["COMP_PULL_TO_REFRESH_01", "السحب للتحديث", "components/PullToRefresh.tsx", "تحديث الصفحة بالسحب للأسفل"],
  ["COMP_PAGE_WRAPPER_01", "غلاف الصفحة", "components/PageWrapper.tsx", "إطار موحد للصفحات"],
];
const wsComponents = XLSX.utils.aoa_to_sheet(components);
wsComponents['!cols'] = [{wch: 30}, {wch: 26}, {wch: 40}, {wch: 38}];
XLSX.utils.book_append_sheet(wb, wsComponents, 'Components - المكونات');

// ─── Sheet 9: APIs ──────────────────────────────────────────────────────────
const apis = [
  ["UI Code", "المسار", "الوظيفة", "التصنيف"],
  ["API_AUTH_LOGIN_01", "POST /auth/login", "تسجيل الدخول", "مصادقة"],
  ["API_AUTH_REGISTER_01", "POST /auth/register", "إنشاء حساب", "مصادقة"],
  ["API_AUTH_ME_01", "GET /auth/me", "جلب بيانات المستخدم الحالي", "مصادقة"],
  ["API_CARS_LIST_01", "GET /cars", "جلب قائمة السيارات", "سيارات"],
  ["API_CARS_DETAIL_01", "GET /cars/:id", "جلب تفاصيل سيارة", "سيارات"],
  ["API_CARS_CREATE_01", "POST /cars/create", "نشر إعلان جديد", "سيارات"],
  ["API_CARS_UPDATE_01", "PATCH /cars/:id", "تعديل إعلان", "سيارات"],
  ["API_CARS_DELETE_01", "DELETE /cars/:id", "حذف إعلان", "سيارات"],
  ["API_CARS_SOLD_01", "POST /cars/:id/sold", "تأكيد بيع السيارة", "سيارات"],
  ["API_CARS_FEATURED_01", "GET /cars/featured", "السيارات المميزة", "سيارات"],
  ["API_CARS_SIMILAR_01", "GET /cars/:id/similar", "سيارات مشابهة", "سيارات"],
  ["API_CARS_PROMOTE_01", "POST /cars/:id/promote", "تمييز الإعلان", "سيارات"],
  ["API_FEED_01", "GET /feed", "الخلاصة الرئيسية", "سيارات"],
  ["API_SEARCH_01", "GET /search", "البحث المتقدم", "سيارات"],
  ["API_CHATS_LIST_01", "GET /chats", "قائمة المحادثات", "محادثات"],
  ["API_CHATS_START_01", "POST /chats/start", "بدء محادثة جديدة", "محادثات"],
  ["API_CHATS_MESSAGES_01", "GET /chats/:id/messages", "رسائل المحادثة", "محادثات"],
  ["API_CHATS_SEND_01", "POST /chats/:id/messages", "إرسال رسالة نصية", "محادثات"],
  ["API_CHATS_SEND_IMAGE_01", "POST /chats/:id/messages/image", "إرسال صورة", "محادثات"],
  ["API_CHATS_SEND_AUDIO_01", "POST /chats/:id/messages/audio", "إرسال رسالة صوتية", "محادثات"],
  ["API_CHATS_BLOCK_01", "POST /chats/:id/block", "حظر المحادثة", "محادثات"],
  ["API_PUSH_SUBSCRIBE_01", "POST /push/subscribe", "الاشتراك في Web Push", "إشعارات"],
  ["API_PUSH_FCM_TOKEN_01", "POST /push/fcm-token", "تسجيل توكن FCM", "إشعارات"],
  ["API_PUSH_BROADCAST_01", "POST /push/broadcast", "إرسال إشعار جماعي", "إشعارات"],
  ["API_PUSH_TEST_01", "POST /push/test", "اختبار الإشعارات", "إشعارات"],
  ["API_AI_DESCRIPTION_01", "POST /ai/generate-description", "توليد وصف تلقائي", "ذكاء اصطناعي"],
  ["API_AI_PRICE_01", "POST /ai/estimate-price", "تقدير السعر", "ذكاء اصطناعي"],
  ["API_AI_RECOMMENDATIONS_01", "GET /ai/recommendations", "توصيات مخصصة", "ذكاء اصطناعي"],
  ["API_VEHICLE_REPORT_01", "POST /vehicle-reports/lookup", "تقرير تاريخ المركبة", "ذكاء اصطناعي"],
];
const wsApis = XLSX.utils.aoa_to_sheet(apis);
wsApis['!cols'] = [{wch: 30}, {wch: 36}, {wch: 34}, {wch: 16}];
XLSX.utils.book_append_sheet(wb, wsApis, 'APIs - واجهات برمجة التطبيق');

// ─── Save ────────────────────────────────────────────────────────────────────
const outPath = path.join('/home/runner/workspace/artifacts/syrian-car-market/docs', 'MARKLET_UI_MAP.xlsx');
XLSX.writeFile(wb, outPath);
console.log('✅ Excel file created:', outPath);
