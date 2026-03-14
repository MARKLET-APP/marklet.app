# سوق السيارات السوري - Syrian Car Market

## Overview

A full-stack mobile-first Arabic RTL marketplace for buying and selling cars in Syria.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/syrian-car-market) - Arabic RTL
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
