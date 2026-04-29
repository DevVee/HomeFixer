# HomeFixer — React Native Development Plan

---

## 1. Project Overview

**HomeFixer** is a mobile-based home service booking and management platform targeting Pampanga, Philippines. It connects verified skilled workers (Plumbing, Aircon Repair, Electrical Work, Carpentry) with homeowners through a centralized, mobile-first ecosystem.

**Three user roles:**
- Customer (homeowner)
- Service Provider (technician)
- Administrator (platform manager)

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native (Expo Managed Workflow) |
| Navigation | React Navigation v6 |
| State Management | Zustand or Redux Toolkit |
| Backend API | Node.js + Express.js |
| Database | PostgreSQL (via Supabase) |
| Auth | Supabase Auth (JWT-based) |
| Real-time | Supabase Realtime or Socket.io |
| Push Notifications | Firebase Cloud Messaging (FCM) via Expo Notifications |
| File Storage | Supabase Storage (for ID uploads, profile photos, certifications) |
| Payment | PayMongo API (GCash, Maya, Credit/Debit Cards, COD confirmation) |
| AI Chatbot | Claude API (claude-haiku-4-5) or Dialogflow |
| Admin Panel | React Native (same app, role-based routing) or separate React Web dashboard |
| Maps | React Native Maps + Google Maps API (for provider location) |

**Why Supabase?** Gives PostgreSQL + Auth + Storage + Realtime in one platform, ideal for rapid development. PayMongo is the most developer-friendly Philippine payment gateway supporting GCash.

---

## 3. App Architecture

```
HomeFixer App (React Native)
│
├── Auth Layer (Login / Register / Role Detection)
│
├── Customer Stack
│   ├── Home / Browse Categories
│   ├── Provider Discovery / Search
│   ├── Provider Profile View
│   ├── Booking Flow
│   ├── Booking Tracker (Real-time status)
│   ├── Payment Screen (GCash / Maya / COD)
│   ├── Ratings & Review
│   ├── Booking History
│   ├── Notifications
│   └── AI Chatbot Support
│
├── Provider Stack
│   ├── Dashboard (Incoming Bookings)
│   ├── Profile Management
│   ├── Availability Toggle
│   ├── Booking Detail + Accept/Decline
│   ├── Job Status Updater
│   ├── Payment Confirmation
│   ├── Job History & Earnings
│   └── Notifications
│
└── Admin Stack
    ├── Dashboard (Analytics Overview)
    ├── Provider Verification Queue
    ├── User Management
    ├── All Bookings Monitor
    ├── Transaction Logs
    └── Chatbot Performance
```

---

## 4. Database Schema (PostgreSQL via Supabase)

### users
```sql
id, email, password_hash, full_name, phone, profile_photo_url,
role (customer | provider | admin), is_verified, is_active,
created_at, updated_at
```

### provider_profiles
```sql
id, user_id (FK), bio, service_category (plumbing | aircon | electrical | carpentry),
hourly_rate, is_available (bool), barangay, city, years_of_experience,
id_document_url, certification_url, verification_status (pending | approved | rejected),
average_rating, total_jobs_completed, created_at
```

### service_categories
```sql
id, name, icon_url, description, is_active
```

### bookings
```sql
id, customer_id (FK), provider_id (FK), service_category_id (FK),
description_of_problem, scheduled_date, scheduled_time,
status (pending | accepted | en_route | in_progress | completed | paid | cancelled | declined),
address, latitude, longitude,
quoted_price, final_price, payment_method (gcash | maya | cod),
payment_status (unpaid | paid),
created_at, updated_at
```

### booking_status_logs
```sql
id, booking_id (FK), status, changed_by (user_id), note, timestamp
```

### reviews
```sql
id, booking_id (FK), customer_id (FK), provider_id (FK),
rating (1-5), comment, created_at
```

### payments
```sql
id, booking_id (FK), amount, method (gcash | maya | card | cod),
paymongo_payment_id, paymongo_checkout_url, status (pending | paid | failed | refunded),
paid_at, created_at
```

### notifications
```sql
id, user_id (FK), title, body, type, is_read, booking_id (FK nullable), created_at
```

### chatbot_sessions
```sql
id, user_id (FK), messages (JSONB), created_at, updated_at
```

### verification_documents
```sql
id, provider_id (FK), document_type (gov_id | certification | barangay_clearance),
file_url, uploaded_at, reviewed_by (admin_id nullable), reviewed_at, status
```

---

## 5. User Roles & Flows

### 5.1 Customer Flow

```
Register → Verify Email → Browse Categories
→ Search Providers (filter by category, rating, location, availability)
→ View Provider Profile (rating, reviews, certifications, rate)
→ Create Booking (date, time, address, issue description)
→ Choose Payment Method (GCash | Maya | COD)
→ Receive confirmation notification
→ Track Booking Status in real-time
→ Provider arrives → Job done → Confirm Completion
→ For GCash/Maya: Pay digitally → Receipt generated
→ For COD: Pay cash → Both confirm "Paid" in app → Receipt generated
→ Leave Rating & Review
→ View in Booking History
```

### 5.2 Service Provider Flow

```
Register → Upload Gov ID + Certifications
→ Wait for Admin Approval (status: Pending)
→ Email notification on Approval
→ Login → Complete Profile (bio, rates, service area)
→ Toggle Availability (Online/Offline)
→ Receive Booking Request notification
→ View Booking Detail → Accept or Decline
→ Update status: En Route → In Progress → Completed
→ Enter Final Service Fee
→ For GCash/Maya: Customer pays digitally (auto-confirmed)
→ For COD: Collect cash → Confirm "Cash Received" in app
→ View Job History & Earnings Analytics
```

### 5.3 Admin Flow

```
Login (Admin credentials) → Dashboard Overview
→ Provider Verification Queue
  → View submitted documents → Approve or Reject (with reason)
→ User Management
  → View all customers/providers → Suspend / Reactivate accounts
→ Booking Monitor → View all platform bookings and statuses
→ Transaction Logs → View all payment records
→ Analytics → Bookings per day, revenue, top providers, category demand
→ Chatbot Performance → View conversation logs, common queries
```

---

## 6. Booking Status Machine

```
PENDING
  └─ Provider Accepts → ACCEPTED
  └─ Provider Declines → DECLINED
  └─ Customer Cancels → CANCELLED

ACCEPTED
  └─ Provider sets "On my way" → EN_ROUTE
  └─ Customer Cancels (before arrival) → CANCELLED

EN_ROUTE
  └─ Provider arrives, starts work → IN_PROGRESS

IN_PROGRESS
  └─ Provider marks job done → COMPLETED

COMPLETED
  └─ GCash/Maya: payment confirmed by webhook → PAID
  └─ COD: both parties confirm → PAID

PAID → Digital receipt generated, review prompt shown to customer
```

---

## 7. Payment Integration — PayMongo

PayMongo is the leading Philippine payment gateway supporting GCash, Maya, cards, and QR Ph.

### GCash / Maya Payment Flow:
```
1. Customer selects "GCash" or "Maya" at checkout
2. App calls backend: POST /api/payments/create-intent
3. Backend calls PayMongo: create Payment Intent with amount
4. Backend creates Payment Method (gcash/paymaya source)
5. PayMongo returns checkout_url (GCash redirect link)
6. App opens checkout_url in WebBrowser (expo-web-browser)
7. Customer authenticates in GCash app
8. PayMongo sends webhook to backend: payment.paid event
9. Backend updates payment status → PAID
10. Booking status updated → PAID
11. Push notification sent to both parties
12. Digital receipt generated
```

### COD Flow:
```
1. Customer selects "Cash on Delivery"
2. Job completed → Provider enters final fee in app
3. Customer sees final fee in app
4. Customer pays cash physically to provider
5. Provider taps "Confirm Cash Received" in app
6. Customer taps "Confirm Payment Made" in app
7. Both confirmations required → status → PAID
8. Digital receipt generated (per RA 8792 Electronic Commerce Act)
```

### PayMongo API Keys needed:
- `PAYMONGO_SECRET_KEY` (backend only, never expose to frontend)
- `PAYMONGO_PUBLIC_KEY` (can be used in app for source creation)

### Supported payment methods via PayMongo:
| Method | Type |
|---|---|
| GCash | E-wallet |
| Maya (PayMaya) | E-wallet |
| Credit/Debit Card | Card |
| QR Ph | Bank QR |
| GrabPay | E-wallet |
| ShopeePay | E-wallet |

---

## 8. AI Chatbot Integration

### Recommended: Claude API (claude-haiku-4-5-20251001)

The chatbot handles:
- FAQs (how to book, how to cancel, how to pay)
- Booking flow guidance
- Troubleshooting common issues
- 24/7 support when admins are offline

### Implementation:
```
User opens Chatbot screen
→ App sends message to backend: POST /api/chatbot/message
→ Backend calls Claude API with system prompt + conversation history
→ Claude responds with context-aware answer
→ Response displayed in chat UI
→ Conversation stored in chatbot_sessions table
```

### System Prompt for Claude:
```
You are HomeFixer Assistant, a helpful support chatbot for the HomeFixer 
home services platform in Pampanga, Philippines. You help customers and 
service providers with: booking questions, payment methods (GCash, Maya, COD), 
service categories (Plumbing, Aircon, Electrical, Carpentry), 
account issues, and platform navigation. Be concise, friendly, and helpful.
Do not discuss topics unrelated to HomeFixer.
```

---

## 9. Screen Inventory

### Shared Screens
- SplashScreen
- OnboardingScreen (3-slide intro)
- LoginScreen
- RegisterScreen (Customer or Provider toggle)
- ForgotPasswordScreen
- NotificationsScreen
- ProfileScreen (view/edit)
- ChatbotScreen

### Customer Screens
- HomeScreen (category grid + featured providers)
- CategoryScreen (browse by service type)
- ProviderListScreen (with filters: rating, price, availability)
- ProviderProfileScreen (bio, gallery, reviews, certifications)
- BookingFormScreen (date, time, address, issue photo, description)
- PaymentMethodScreen (select GCash / Maya / COD)
- BookingConfirmationScreen
- BookingTrackerScreen (real-time status with timeline)
- GCashWebviewScreen (PayMongo redirect)
- PaymentSuccessScreen
- RateAndReviewScreen
- BookingHistoryScreen
- BookingDetailScreen

### Provider Screens
- ProviderDashboardScreen (pending/active bookings)
- BookingRequestScreen (accept/decline)
- ActiveJobScreen (status updater: En Route → In Progress → Done)
- FinalFeeScreen (enter final price for COD)
- CODConfirmScreen (confirm cash received)
- JobHistoryScreen
- EarningsScreen (daily/weekly/monthly analytics)
- ProfileSetupScreen (skills, rate, availability)
- DocumentUploadScreen (gov ID, certifications)

### Admin Screens
- AdminDashboardScreen (stats overview)
- VerificationQueueScreen (list of pending providers)
- VerificationDetailScreen (view docs, approve/reject)
- UserManagementScreen (all users with search/filter)
- UserDetailScreen (suspend/reactivate)
- AllBookingsScreen (filter by status, date, category)
- TransactionLogsScreen
- AnalyticsScreen (charts: bookings, revenue, ratings)

---

## 10. Project Folder Structure

```
homefixer/
├── app/                          # React Native (Expo)
│   ├── src/
│   │   ├── navigation/
│   │   │   ├── AppNavigator.tsx
│   │   │   ├── CustomerStack.tsx
│   │   │   ├── ProviderStack.tsx
│   │   │   └── AdminStack.tsx
│   │   ├── screens/
│   │   │   ├── auth/
│   │   │   ├── customer/
│   │   │   ├── provider/
│   │   │   └── admin/
│   │   ├── components/
│   │   │   ├── BookingCard.tsx
│   │   │   ├── ProviderCard.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── StarRating.tsx
│   │   │   └── ChatBubble.tsx
│   │   ├── hooks/
│   │   │   ├── useBookings.ts
│   │   │   ├── useAuth.ts
│   │   │   └── useNotifications.ts
│   │   ├── store/                # Zustand stores
│   │   │   ├── authStore.ts
│   │   │   └── bookingStore.ts
│   │   ├── services/
│   │   │   ├── api.ts            # Axios instance
│   │   │   ├── supabase.ts
│   │   │   └── notifications.ts
│   │   ├── utils/
│   │   └── constants/
│   │       ├── colors.ts
│   │       └── serviceCategories.ts
│   ├── app.json
│   └── package.json
│
└── backend/                      # Node.js + Express
    ├── src/
    │   ├── routes/
    │   │   ├── auth.routes.ts
    │   │   ├── bookings.routes.ts
    │   │   ├── providers.routes.ts
    │   │   ├── payments.routes.ts
    │   │   ├── admin.routes.ts
    │   │   ├── chatbot.routes.ts
    │   │   └── notifications.routes.ts
    │   ├── controllers/
    │   ├── middleware/
    │   │   ├── auth.middleware.ts
    │   │   └── role.middleware.ts
    │   ├── services/
    │   │   ├── paymongo.service.ts
    │   │   ├── claude.service.ts
    │   │   └── fcm.service.ts
    │   ├── webhooks/
    │   │   └── paymongo.webhook.ts
    │   └── db/
    │       └── migrations/
    ├── .env
    └── package.json
```

---

## 11. Development Phases

### Phase 1 — Foundation (Week 1–2)
- [ ] Project setup: Expo app + Node.js backend + Supabase project
- [ ] Database schema creation (all tables + RLS policies)
- [ ] Auth system: Register (Customer/Provider), Login, JWT
- [ ] Role-based navigation setup (Customer/Provider/Admin stacks)
- [ ] Base UI components, color theme, typography

### Phase 2 — Core Modules (Week 3–5)
- [ ] Provider profile creation + document upload (Supabase Storage)
- [ ] Service category browsing + provider discovery/search
- [ ] Booking creation flow (date, time, address, description)
- [ ] Booking status machine (full state transitions)
- [ ] Real-time booking status updates (Supabase Realtime)
- [ ] Provider: accept/decline + status updater screens

### Phase 3 — Admin + Trust (Week 6–7)
- [ ] Admin verification queue (review + approve/reject providers)
- [ ] Admin user management (suspend/reactivate)
- [ ] Rating & review system (post-job completion)
- [ ] Booking history screens (both roles)
- [ ] Admin analytics dashboard (charts via Victory Native or Recharts)

### Phase 4 — Notifications + Chatbot (Week 8)
- [ ] Firebase Cloud Messaging setup (Expo Notifications)
- [ ] Push notification triggers (booking events, verification status)
- [ ] AI Chatbot screen (Claude API integration)
- [ ] In-app notification center

### Phase 5 — Payment Integration (Week 9–10)
- [ ] PayMongo account setup + API keys
- [ ] Backend PayMongo service (create intent, attach payment method)
- [ ] GCash payment flow (WebView redirect → webhook confirmation)
- [ ] Maya payment flow (same pattern)
- [ ] COD dual-confirmation flow (provider + customer)
- [ ] Digital receipt generation (PDF or in-app)
- [ ] PayMongo webhook handler (payment.paid event)

### Phase 6 — Polish + UAT (Week 11–12)
- [ ] Error handling + offline states + loading skeletons
- [ ] Form validation (all booking/payment forms)
- [ ] Performance optimization (list virtualization, image caching)
- [ ] User Acceptance Testing with real Pampanga residents + providers
- [ ] Bug fixes from UAT feedback
- [ ] App Store / Google Play preparation

---

## 12. Key Third-Party Packages

```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "expo-notifications": "for FCM push",
    "expo-image-picker": "for profile photos, ID uploads",
    "expo-document-picker": "for certification PDFs",
    "expo-web-browser": "for PayMongo GCash redirect",
    "expo-location": "for provider/customer location",
    "@supabase/supabase-js": "database + auth + realtime",
    "@react-navigation/native": "navigation",
    "@react-navigation/stack": "stack navigator",
    "@react-navigation/bottom-tabs": "tab navigator",
    "react-native-maps": "map view for provider location",
    "axios": "HTTP client for API calls",
    "zustand": "lightweight state management",
    "react-native-paper": "Material Design UI components",
    "react-native-gifted-chat": "Chatbot UI",
    "date-fns": "date formatting and manipulation",
    "react-native-chart-kit": "analytics charts for admin",
    "react-native-star-rating-widget": "rating UI",
    "@react-native-async-storage/async-storage": "local storage"
  }
}
```

---

## 13. Security & Compliance

| Requirement | Implementation |
|---|---|
| RA 10173 Data Privacy Act | Supabase RLS (Row Level Security) — users only access their own data |
| RA 8792 E-Commerce Act | Digital receipts stored in DB, legally binding |
| RA 7394 Consumers Act | Transparent pricing displayed before booking confirmation |
| Provider Verification | Admin reviews Gov ID + certifications before approval |
| Payment Security | PayMongo handles PCI compliance — we never store card data |
| JWT Auth | Short-lived access tokens + refresh tokens via Supabase Auth |
| API Security | Role middleware on all protected routes |

---

## 14. Environment Variables

### Backend (.env)
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
PAYMONGO_SECRET_KEY=
PAYMONGO_WEBHOOK_SECRET=
CLAUDE_API_KEY=
FIREBASE_SERVICE_ACCOUNT_JSON=
PORT=3000
```

### App (.env / app.config.js)
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=
```

---

## 15. Quick Cost Estimate (Monthly, Running App)

| Service | Cost |
|---|---|
| Supabase Free Tier | $0 (up to 500MB DB, 1GB storage) |
| Supabase Pro (after launch) | ~$25/mo |
| PayMongo | 2.5% per transaction (no monthly fee) |
| Claude API (Haiku) | ~$0.25 per 1M tokens (very cheap for chatbot) |
| Firebase (FCM notifications) | Free for push notifications |
| Google Maps API | Free up to 28,000 map loads/month |
| **Expo EAS Build** | Free (30 builds/month) or $29/mo Pro |

---

## Summary

This plan covers all three user roles (Customer, Service Provider, Admin), a full booking lifecycle with real-time status tracking, GCash/Maya/COD payment via PayMongo, an AI chatbot via Claude API, provider verification, ratings/reviews, push notifications, and admin analytics — all built in React Native (Expo) with a Node.js + Supabase backend, compliant with Philippine digital commerce laws.
