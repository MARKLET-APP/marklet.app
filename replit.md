# LAZEMNI — السوق الشامل السوري

## Overview

A full-stack mobile-first Arabic RTL multi-category marketplace for Syria covering cars, real estate, jobs, used-goods marketplace (كل شيء), and more.

## 🛍️ Marketplace "كل شيء" Feature (NEW)
- **DB**: `marketplaceItemsTable`, `marketplaceOrdersTable`, `shippingRatesTable` in `lib/db/src/schema/marketplace.ts`
- **API**: `artifacts/api-server/src/routes/marketplace.ts` — full CRUD + orders + shipping rates + admin endpoints
- **Frontend pages**: `marketplace.tsx`, `marketplace-detail.tsx`, `marketplace-orders.tsx`
- **Currency**: SYP (ل.س) — prices displayed as `X,XXX ل.س`
- **Payment**: شام كاش (manual receipt upload + admin confirmation)
- **Shipping**: القدموس (tracking number added by admin)
- **Categories**: أثاث ومنزل، ملابس وأحذية، إلكترونيات، أدوات ومعدات، كتب وتعليم، مستلزمات أطفال، فنون وتحف، رياضة وترفيه، أجهزة منزلية، أخرى
- **Conditions**: ممتاز، جيد جداً، جيد، مقبول
- **Routes**: `/marketplace`, `/marketplace/:id`, `/marketplace-orders`
- **Admin tab**: "السوق" — view all orders, confirm/reject payments, add tracking numbers
- **Home section**: "كل شيء" section with category grid + CTA banner (orange/amber gradient)
- **Sham Cash QR**: `artifacts/syrian-car-market/public/shamcash-qr.jpg` → served at `/shamcash-qr.jpg` — shown in payment dialog after order creation

---

## ⚠️ قواعد حرجة يجب التطبيق في كل صفحة جديدة (NEW PAGE CHECKLIST)

### 1. حقول قاعدة البيانات — Field Names (لا تخلط بينها)
| الجدول | حقل صاحب الإعلان | ملاحظات |
|--------|------------------|---------|
| `carsTable` | `sellerId` | |
| `realEstateTable` | `sellerId` | ليس posterId |
| `jobsTable` | `posterId` | ليس sellerId |
| `junkCarsTable` | `sellerId` | |
| `buyRequestsTable` | `userId` | |

### 2. عرض الإعلانات في ListingCard — الطريقة الصحيحة
```tsx
// ✅ صحيح — مثل jobs.tsx
<ListingCard
  key={item.id}
  type="real-estate"   // أو "jobs" أو "moto" أو "rental" إلخ
  data={item}          // الكائن كاملاً — ListingCard تعالج imgUrl داخلياً
  onCardClick={() => navigate(`/real-estate/${item.id}`)}
  onChat={item.sellerId ? () => startChat(item.sellerId, "...") : undefined}
  onDelete={user?.id === item.sellerId ? () => deleteMutation.mutate(item.id) : undefined}
  chatLoading={startingChat}
  deleteLoading={deleteMutation.isPending}
  currentUserId={user?.id}
/>

// ❌ خاطئ — لا تستخدم ad={{id, title, image, ...}} (صيغة يتيمة)
// ❌ خاطئ — لا تضع imgUrl() يدوياً على الصور إذا أعطيت data كاملاً لـ ListingCard
```

### 3. الصور في صفحات التفاصيل (Detail Pages)
```tsx
// ✅ صحيح — في real-estate-detail.tsx وما شابهها
import { imgUrl } from "@/lib/runtimeConfig";

const images = Array.isArray(item.images)
  ? item.images
      .filter((u: any) => typeof u === "string" && u.trim() && !u.startsWith("blob:"))
      .map((u: string) => imgUrl(u) ?? u)
  : [];
// ثم استخدم images[idx] مباشرة في src={...}
```

### 4. دائماً أضف mutation للحذف في كل صفحة قائمة + صفحة تفاصيل
```tsx
// في صفحة القائمة (LISTING PAGE) — عبر onDelete في ListingCard (مع confirm)
const deleteListingMutation = useMutation({
  mutationFn: (id: number) => apiRequest(`/api/CATEGORY/${id}`, "DELETE"),
  onSuccess: () => { toast({ title: "تم حذف الإعلان" }); qc.invalidateQueries({queryKey: ["CATEGORY"]}); },
  onError: () => toast({ title: "فشل الحذف", variant: "destructive" }),
});
// الاستخدام في ListingCard:
// onDelete={user?.id === item.sellerId ? () => { if (window.confirm("هل تريد حذف هذا الإعلان؟ لا يمكن التراجع.")) deleteListingMutation.mutate(item.id); } : undefined}

// في صفحة التفاصيل (DETAIL PAGE) — في "Owner Panel" مع تأكيد inline
// 1. أضف state: const [deleteConfirm, setDeleteConfirm] = useState(false);
// 2. أضف mutation مع navigate("/CATEGORY") بعد onSuccess
// 3. اجعل الزر يضبط deleteConfirm=true أولاً، ثم يُظهر زر التأكيد
```

### 5. viewCount في ListingCard
- البيانات من قاعدة البيانات تُعيد `viewCount` (بدون s)  
- ListingCard تدعم كلاً من `viewCount` و `viewsCount` تلقائياً (تم الإصلاح)

### 6. onChat مع الوظائف — استخدم posterId دائماً
```tsx
// ✅ للوظائف
onChat={job.posterId ? () => startChat(job.posterId, "...") : undefined}
// ❌ خاطئ
onChat={job.sellerId ? () => startChat(job.sellerId, "...") : undefined}
```

### 7. normalizeAd للصفحة الرئيسية home.tsx
```tsx
// ✅ للعقارات: normalizeAd(item, "real_estate")
// ✅ للوظائف: normalizeAd(item, "job")
// ثم startChat مع posterId للوظائف، sellerId للعقارات
```

### 8. رفع الصور (Upload)
```tsx
// ✅ النمط الصحيح — يعمل في dev وproduction
const res = await fetch(import.meta.env.BASE_URL + "api/upload-image?folder=CATEGORY", {
  method: "POST",
  headers: token ? { Authorization: `Bearer ${token}` } : {},
  body: fd,
});
```

### 9. ListingDetailDialog — يجب إضافة الأنواع الجديدة
إذا أضفت نوعاً جديداً لـ `ListingCardType`، يجب تحديث:
- `TYPE_LABELS` في `ListingDetailDialog.tsx`
- `TYPE_COLORS` في `ListingDetailDialog.tsx`
- `getTitle` في `ListingDetailDialog.tsx`

### 10. قالب Owner Panel الموحّد (في صفحات التفاصيل)
```tsx
// في imports: إضافة Trash2 من lucide-react، useMutation من @tanstack/react-query
// في imports API: apiRequest من @/lib/api

// داخل الكومبوننت:
const [deleteConfirm, setDeleteConfirm] = useState(false);
const qc = useQueryClient();

const deleteListingMutation = useMutation({
  mutationFn: () => apiRequest(`/api/CATEGORY/${id}`, "DELETE"),
  onSuccess: () => {
    toast({ title: "تم حذف الإعلان بنجاح" });
    qc.invalidateQueries({ queryKey: ["CATEGORY"] });
    navigate("/CATEGORY");
  },
  onError: () => toast({ title: "فشل حذف الإعلان", variant: "destructive" }),
});

// في JSX (بعد بطاقة بيانات البائع/الناشر):
{isOwner && (
  <div className="bg-card p-5 rounded-3xl border shadow-sm">
    <h3 className="font-bold text-base border-b pb-3 mb-4">إجراءات المالك</h3>
    {!deleteConfirm ? (
      <Button variant="destructive" className="w-full rounded-xl gap-2" onClick={() => setDeleteConfirm(true)}>
        <Trash2 className="w-4 h-4" /> حذف الإعلان
      </Button>
    ) : (
      <div className="space-y-3">
        <p className="text-sm text-center text-muted-foreground">هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع.</p>
        <div className="flex gap-2">
          <Button variant="destructive" className="flex-1 rounded-xl gap-2"
            onClick={() => deleteListingMutation.mutate()} disabled={deleteListingMutation.isPending}>
            {deleteListingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            نعم، احذف
          </Button>
          <Button variant="outline" className="flex-1 rounded-xl"
            onClick={() => setDeleteConfirm(false)} disabled={deleteListingMutation.isPending}>
            إلغاء
          </Button>
        </div>
      </div>
    )}
  </div>
)}
```
**ملاحظة**: `isOwner` = `user?.id === item.sellerId` (للعقارات والسيارات) أو `user?.id === item.posterId` (للوظائف)

### 11. صفحة التفاصيل — الحقول الصحيحة
| الصفحة | تحقق الملكية | حقل المالك في DB |
|---------|-------------|-----------------|
| `car-detail.tsx` | `user?.id === car.sellerId` | `sellerId` |
| `real-estate-detail.tsx` | `user?.id === item.sellerId` | `sellerId` |
| `job-detail.tsx` | `user?.id === item.posterId` | `posterId` |

---

## Real Estate Module (2026)
- **DB table**: `real_estate` — sellerId, title, listingType (بيع/إيجار), subCategory (شقق/منازل/أراضي...), price, area, rooms, bathrooms, floor, province, city, location, description, images[], status, isFeatured, isActive, viewCount
- **API routes**: `GET /api/real-estate`, `GET /api/real-estate/:id`, `POST /api/real-estate`, `DELETE /api/real-estate/:id`
- **Frontend**: `/real-estate` page — card grid with image, filters (type/category/province), add dialog with image upload, detail dialog with contact/chat buttons
- **Image upload**: uses `MultiImageUpload` component (reusable, max 6 images, uploads via `/api/upload`)

## Jobs Module (2026)
- **DB table**: `jobs` — posterId, title, subCategory (وظيفة شاغرة/طلب توظيف), company, salary, jobType, experience, field, province, city, description, requirements, status, isFeatured, isActive, viewCount
- **API routes**: `GET /api/jobs`, `GET /api/jobs/:id`, `POST /api/jobs`, `DELETE /api/jobs/:id`
- **Frontend**: `/jobs` page — card list with filters (type/field/province), add dialog, detail dialog
- **Home categories**: 🏠 العقارات and 💼 الوظائف added to category grid

## Shared utilities
- `artifacts/syrian-car-market/src/lib/constants.ts` — SYRIAN_PROVINCES array (Arabic names)
- `artifacts/syrian-car-market/src/components/MultiImageUpload.tsx` — reusable multi-image upload component

## Reels / Video Carousel
- **DB table**: `reels` — stores video URL, thumbnail URL, title, desc, price, city, dealerName, dealerId, sponsored, views, likes, status
- **API routes**: `GET /api/reels` (public), `POST /api/reels/upload` (dealer/admin multipart), `POST /api/reels/:id/thumbnail`, `POST /api/reels/:id/view`, `GET /api/admin/reels`, `GET /api/admin/reels/pending`, `PATCH /api/admin/reels/:id/approve`, `PATCH /api/admin/reels/:id/reject`, `DELETE /api/admin/reels/:id`
- **Video storage**: disk storage at `uploads/reels/`, thumbnails at `uploads/reels-thumbs/`, served at `/api/uploads/reels/...`
- **Frontend**: VideoCarousel (home page) and ReelsPage fetch from API, fall back to demo reels when empty
- **Share**: always copies link to clipboard (no native share dialog)
- **Contact**: "تواصل الآن" always visible; navigates to `/messages?userId=dealerId` when dealerId is set
- **Autoplay**: VideoCarousel autoplays muted on mount; ReelCard plays when active (scroll-based)
- **Format**: VideoCarousel uses `aspect-ratio: 1/1` square display

## Admin Panel
- **URL**: `/admin` — requires login as `admin@carmarket.sy` / `Admin@123`
- **Tabs (row 1)**: Users, Dealers, Inspection Centers, Scrap Centers
- **Tabs (row 2)**: Review (pending listings), Listings, Inbox, Settings
- **Stats**: Total users, dealers, listings, inspection centers, scrap centers
- **Dealers tab**: list with verified/featured-seller toggles, search by name/phone/showroom
- **Inspection Centers tab**: full CRUD (add/edit/delete), verified/featured toggles
- **Scrap Centers tab**: full CRUD (add/edit/delete), verified/featured toggles
- **New DB tables**: `scrap_centers`; users table has `whatsapp`, `is_featured_seller`; inspection_centers has `whatsapp`, `logo`, `description`, `is_verified`

## Android APK
- **Package name**: `com.lazemni.app`
- **Download URL**: `/lazemni.apk` (served by Vite static from `public/lazemni.apk`)
- **Current APK**: 9MB debug build (arm64-v8a + armeabi-v7a, com.lazemni.app)
- **Build fix**: APK files were mistakenly placed in `public/` → included in Android assets → bloated APK to 545MB. Fix: removed APK files from `public/` except the current 9MB build. Future builds: run `gradlew assembleDebug` and copy output to `public/lazemni.apk`.
- **Build command**: `cd android && JAVA_HOME=<path> ANDROID_HOME=/home/runner/android-sdk GRADLE_OPTS="-Xmx2g" ./gradlew assembleDebug --no-daemon`
- **IMPORTANT**: Never place APK or large binary files in `public/` — they get bundled into the next Android build via `cap sync`
- **FCM**: google-services.json at `android/app/google-services.json`, package `com.lazemni.app`

## Pre-Android Audit & Fixes (March 2026)
- **Push Notifications**: Full Web Push implementation (sw.js, VAPID keys, pushService, push.ts routes, usePushNotifications hook)
- **PWA Icons**: Generated PNG icons (96×96, 192×192, 512×512, maskable) from SVG via ImageMagick
- **Manifest**: Updated with proper PNG icons, lang/dir attributes for Android
- **Image Compression**: sharp library added to upload.ts (car images 1920×1080 @ q82), chats.ts (chat images 1280×960 @ q80), users.ts (avatars 400×400 @ q85)
- **Lazy Loading**: All 25+ pages are now React.lazy() with Suspense fallback for faster initial load
- **Code Splitting**: vite.config.ts uses manualChunks (vendor, router, query, ui, socket)
- **BottomNav Fix**: `/chat` → `/messages` + live unread badge via polling
- **ContactButtons Fix**: navigate("/chats") → navigate("/messages?conversationId=...") (x2)
- **NaN km Fix**: CarCard shows "غير محدد" when mileage is null/undefined
- **index.html**: Added lang="ar" dir="rtl", removed unused Inter font, added Cairo preload
- **PageWrapper System**: Created `src/components/PageWrapper.tsx` with PageWrapper, SectionHeader, StatusBadge, InfoRow for universal design consistency
- **staleTime**: Set to 30s globally in QueryClient for better performance

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/syrian-car-market) - Arabic RTL / English LTR (bilingual)
- **i18n**: Custom React context (`src/lib/i18n.tsx`) + translations (`src/lib/translations.ts`), persisted to localStorage as `lazemni_lang`
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Auth**: JWT (jsonwebtoken + bcryptjs)
- **State**: Zustand
- **Real-time**: Socket.io v4 (implemented) — rooms per conversation, typing indicators, message seen events
- **Emoji**: @emoji-mart/react for emoji picker in chat
- **AI**: OpenAI API (GPT-4o-mini) for descriptions, price estimation, vehicle summaries

## Structure

```text
artifacts/
├── api-server/         # Express API server
│   ├── src/routes/     # auth, cars, users, chats, reviews, vehicleReports, ai, admin, upload
│   └── src/lib/        # auth helpers, OpenAI integration
├── syrian-car-market/  # React frontend (Arabic RTL)
│   └── src/pages/      # home, search, car-detail, add-listing, vehicle-info, login, register, profile, chat, admin, favorites
lib/
├── api-spec/openapi.yaml  # OpenAPI spec (source of truth)
├── api-client-react/      # Generated React Query hooks
├── api-zod/               # Generated Zod schemas
└── db/src/schema/         # users, cars, images, conversations, messages, reviews, favorites, vehicleReports, settings
```

## Demo Credentials

- **Admin**: email: admin@carmarket.sy / password: Admin@123
- **Seller**: email: seller@carmarket.sy / password: Seller@123

## Features

### Core
- Arabic RTL interface throughout
- JWT authentication via email OR phone number
- Car listings with images, specs, location
- Advanced search and filtering (brand, model, year, price, mileage, province, city, fuel type, transmission, category, sale type)
- Favorites system
- Professional real-time chat (Socket.io): typing indicator, message seen/delivered/sent status, emoji picker, image sending, message reactions, edit/delete, block user, auto-response, word filter
- User profiles with ratings
- Vehicle information lookup (VIN/plate/chassis) with AI summary

### AI Features
- Auto-generate Arabic car descriptions (OpenAI)
- Price estimation based on market data
- Vehicle report AI summary

### Admin
- User management (ban/verify)
- Listing management
- Platform settings (colors, logo, etc)

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (auto-provided by Replit)
- `JWT_SECRET` - JWT signing key (defaults to built-in key, set for production)
- `OPENAI_API_KEY` - For AI features (optional, fallback responses if not set)

## Routes (Backend - /api)

- `POST /api/auth/register` - Register (buyer/seller)
- `POST /api/auth/login` - Login via email or phone
- `GET /api/auth/me` - Get current user
- `GET/PATCH /api/users/:id` - User profiles
- `GET /api/cars` - List with filters
- `POST /api/cars` - Create listing
- `GET/PATCH/DELETE /api/cars/:id` - Car management
- `GET/POST /api/favorites` - Favorites
- `GET /api/chats` - Conversations
- `POST /api/chats/start` - Start conversation
- `GET/POST /api/chats/:id/messages` - Messages (with word filter, auto-response)
- `POST /api/chats/:id/messages/image` - Send image (max 5MB)
- `PATCH /api/chats/:id/messages/:msgId` - Edit message (within 5 minutes)
- `DELETE /api/chats/:id/messages/:msgId` - Delete message
- `POST /api/chats/:id/messages/:msgId/react` - React with emoji (toggle)
- `POST /api/chats/:id/block` - Block/unblock user
- `GET /api/chats/:id/block-status` - Check block status
- `GET /api/notifications` - User notifications
- `PATCH /api/notifications/:id/read` - Mark notification read
- `POST /api/notifications/read-all` - Mark all read
- `POST /api/reviews` - Create review
- `POST /api/vehicle-reports/lookup` - Vehicle lookup
- `POST /api/ai/generate-description` - AI description
- `POST /api/ai/estimate-price` - AI price estimate
- `GET /api/ai/recommendations` - AI recommendations
- `GET /api/settings` - Platform settings
- `GET/PATCH /api/admin/*` - Admin endpoints

## Global Auctions Feature (/auctions)
- Page: `artifacts/syrian-car-market/src/pages/auctions.tsx`
- 3 regions: عربية (Emirates Auction), أمريكية (Copart + IAAI), كورية (Encar)
- Iframe viewer with disclaimer + external-link fallback for sites that block iframes
- 'طلب شراء عبر LAZEMNI' fixed button → sends auction_request to POST /api/support
- Category icon added to home page categories grid
