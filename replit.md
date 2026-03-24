# MARKLET — سوق السيارات السوري

## Overview

A full-stack mobile-first Arabic RTL marketplace for buying and selling cars in Syria.

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
- **i18n**: Custom React context (`src/lib/i18n.tsx`) + translations (`src/lib/translations.ts`), persisted to localStorage as `marklet_lang`
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
- 'طلب شراء عبر MARKLET' fixed button → sends auction_request to POST /api/support
- Category icon added to home page categories grid
