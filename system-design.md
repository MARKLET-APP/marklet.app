# نظام الإشعارات الموحد — LAZEMNI
## وثيقة التصميم v1.0

---

## 1. المبدأ العام (دورة حياة الإعلان)

```
المستخدم ينشر إعلان
        ↓
[Toast فوري] "تم إرسال طلبك للمراجعة"
        ↓
الإدارة تراجع من لوحة الأدمن
        ↓
    ┌───────────┬───────────┐
  قبول         رفض
    ↓             ↓
[إشعار] قبول   [إشعار] رفض
[Push]          [Push]
    ↓
الإعلان يظهر في القسم + الشاشة الرئيسية
    ↓
المستخدم يضغط على الإشعار → يفتح الإعلان مباشرة
```

---

## 2. جدول الحالة الحالية لكل قسم

| القسم | Toast عند الإرسال | إشعار قبول/رفض (Backend) | Push Notification | الضغط على الإشعار |
|---|---|---|---|---|
| **كل شيء** (marketplace) | ✅ | ✅ | ❌ | ❌ لا يفتح الإعلان |
| **السيارات** (add-listing) | ❓ غير مؤكد | ✅ | ✅ | ❌ لا يفتح الإعلان |
| **العقارات** | ❓ | ❌ | ❌ | ❌ |
| **الوظائف — إعلان توظيف** | ❌ يقول "تم النشر" بدل "للمراجعة" | ❌ | ❌ | ❌ |
| **الوظائف — طلب وظيفة** | ❌ يقول "تم الإرسال" بدل "للمراجعة" | ❌ | ❌ | ❌ |
| **طلبات الشراء** | ✅ | ❌ | ❌ | ❌ |
| **قطع غيار** | ✅ | ❌ | ❌ | ❌ |
| **خردة** (junk-cars) | ✅ | ❌ | ❌ | ❌ |
| **دراجات نارية** | ❌ لا يوجد toast | ❌ | ❌ | ❌ |
| **أرقام اللوحات** | ✅ | ❌ | ❌ | ❌ |
| **سيارات مفقودة** | ❌ يقول "تم نشر البلاغ" | ❌ | ❌ | ❌ |
| **سيارات للإيجار** | ❓ | ❌ | ❌ | ❌ |

---

## 3. الإصلاحات المطلوبة

### 3A — Backend: إضافة إشعارات الموافقة/الرفض

| المسار | الجدول | حقل المعرّف | رابط الإشعار | الحالة |
|---|---|---|---|---|
| `PATCH /admin/cars/:id/status` | carsTable | sellerId | `/cars/:id` | ✅ مكتمل |
| `PATCH /admin/marketplace/:id/status` | marketplaceItemsTable | sellerId | `/marketplace/:id` | ✅ notify() موجود لكن بحقول خاطئة |
| `PATCH /admin/jobs/:id/status` | jobsTable | userId | `/jobs/:id` | ❌ يحتاج إضافة |
| `PATCH /admin/real-estate/:id/status` | realEstateTable | userId | `/real-estate/:id` | ❌ يحتاج إضافة |
| `PATCH /admin/car-parts/:id/status` | carPartsTable | sellerId | `/car-parts/:id` | ❌ المسار غير موجود |
| `PATCH /admin/junk-cars/:id/status` | junkCarsTable | sellerId | `/junk-cars/:id` | ❌ المسار غير موجود |
| `PATCH /admin/motorcycles/:id/status` | carsTable (type=motorcycle) | sellerId | `/motorcycles/:id` | ❌ المسار غير موجود |
| `PATCH /admin/plates/:id/status` | carsTable (type=plate) | sellerId | `/plates/:id` | ❌ المسار غير موجود |
| `PATCH /admin/missing-cars/:id/status` | missingCarsTable | userId | `/missing-cars/:id` | ❌ المسار غير موجود |
| `PATCH /admin/rental-cars/:id/status` | rentalCarsTable | sellerId | `/rental-cars/:id` | ❌ المسار غير موجود |
| `PATCH /admin/buy-requests/:id/status` | buyRequestsTable | userId | `/buy-requests` | ❌ المسار غير موجود |

### 3B — Backend: مشكلة في notify() بـ marketplace.ts

```typescript
// ❌ الكود الحالي (خاطئ — الحقول غير موجودة في قاعدة البيانات)
await db.insert(notificationsTable).values({ userId, title, body, type, referenceId })

// ✅ الصحيح (يتطابق مع schema)
await db.insert(notificationsTable).values({ userId, type, message, link })
```

### 3C — Frontend: Toast عند الإرسال

| الصفحة | الإصلاح |
|---|---|
| jobs.tsx — إعلان توظيف | تغيير "تم نشر الإعلان بنجاح" → "تم إرسال إعلانك للمراجعة، سيظهر بعد موافقة الإدارة" |
| jobs.tsx — طلب وظيفة | تغيير "تم إرسال طلب التوظيف بنجاح" → "تم إرسال طلبك للمراجعة، سيظهر بعد موافقة الإدارة" |
| motorcycles.tsx | إضافة toast للإرسال |
| missing-cars.tsx | تغيير "تم نشر البلاغ" → "تم إرسال البلاغ للمراجعة" |

### 3D — Frontend: صفحة الإشعارات (notifications.tsx)

الإشعار عند الضغط يجب أن يفتح الرابط المخزّن في `notification.link`:

```typescript
// ❌ الكود الحالي — يعلّم فقط كمقروء
onClick={() => { if (!n.isRead) markReadMutation.mutate(n.id); }}

// ✅ الصحيح — يعلّم كمقروء ويفتح الرابط
onClick={() => {
  if (!n.isRead) markReadMutation.mutate(n.id);
  if (n.link) navigate(n.link);
}}
```

---

## 4. نظام الإشعار الموحد (القالب)

### رسائل القبول (عربي)
```
العنوان: ✅ تمت الموافقة على إعلانك
النص: تمت الموافقة على إعلانك "{اسم الإعلان}" ونشره على منصة LAZEMNI
الرابط: /{قسم}/{معرّف الإعلان}
```

### رسائل الرفض (عربي)
```
العنوان: ❌ تم رفض إعلانك
النص: تم رفض إعلانك "{اسم الإعلان}". يمكنك تعديله وإعادة إرساله
الرابط: /{قسم}/{معرّف الإعلان}
```

### Toast عند الإرسال
```
العنوان: ✅ تم إرسال طلبك للمراجعة
الوصف: سيظهر إعلانك في القائمة بعد موافقة الإدارة
```

---

## 5. ضغط الصور (Image Compression)

### المشكلة
لا يوجد معالجة موحدة للصور — الصور ترفع بحجمها الأصلي.

### الحل المقترح
معالجة **على الخادم** عند الرفع (sharp):

| الاستخدام | العرض | الجودة | الصيغة |
|---|---|---|---|
| صورة رئيسية (full detail) | 1200px | 85% | WebP |
| صورة مصغّرة (thumbnail) | 400px | 75% | WebP |

### التطبيق
- دالة `processImage()` في upload middleware تعالج الصورة مرة واحدة بعرض 1200px
- CSS `object-fit: cover` يتكفّل بالعرض الصحيح في كلا الحجمين
- لا حاجة لتوليد نسختين — نسخة واحدة بـ 1200px تعمل لكلا الاستخدامين

---

## 6. خطة التطبيق (الأولويات)

1. **إصلاح notify() في marketplace.ts** — حقول خاطئة في DB
2. **إضافة notify() في admin.ts** — jobs و real-estate
3. **إنشاء مسارات الموافقة الناقصة** — car-parts, junk-cars, motorcycles, plates, missing-cars, rental-cars, buy-requests
4. **إصلاح Toast في frontend** — jobs, motorcycles, missing-cars  
5. **إصلاح الضغط على الإشعار** — يفتح الرابط
6. **ضغط الصور** — تحديث upload middleware

---

*وثيقة التصميم — LAZEMNI — 2026-04-05*
