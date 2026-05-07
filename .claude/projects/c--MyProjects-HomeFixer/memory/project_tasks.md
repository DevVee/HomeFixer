---
name: HomeFixer Client Feature Requests
description: 17 features requested by client as of 2026-05-06, grouped by complexity
type: project
---

Client submitted 17 feature requests tracked in task.txt. Planned on 2026-05-06.

**GROUP 1 — Quick Wins (wire existing code):**
- Forgot password via email → `supabase.auth.resetPasswordForEmail()` in ForgotPasswordScreen
- Email verification gate → check `email_confirmed_at` in AppNavigator.tsx before routing to dashboard
- Arrival notification → trigger push notification when provider sets status to `in_progress`
- Receipt on completion → trigger Resend email on `PAID` booking status

**GROUP 2 — UI Changes:**
- Filter button fix → ProviderListScreen query logic broken
- Date/time dropdown → swap BookingFormScreen text input to date/time picker
- "Open rate" option → add `open_rate` pricing type to provider profile
- Tip option → add tip field in PaymentMethodScreen
- Saved addresses → new `saved_addresses` DB table + profile UI
- Booking detail improvements → expand BookingDetailScreen with full receipt/worker info
- Partial/overtime rate policy → time-worked field when provider marks complete, auto-calculate

**GROUP 3 — Medium Features:**
- Google authentication → complete expo-auth-session Google OAuth in Login/Register screens
- User location pin → map picker in BookingFormScreen using expo-location + react-native-maps
- Provider on map (Grab-style) → react-native-maps + realtime provider location in booking tracker

**GROUP 4 — High Complexity:**
- Digital payment (PayMongo) → fix security issue (secret key in client), full end-to-end test
- Admin web panel → separate React web app connected to same Supabase (recommend Vercel)

**Why:** Client demo/UAT coming up; prioritizing auth and UX first, then payments and maps.
**How to apply:** Always tackle Group 1 and 2 before Group 3/4 unless user specifies otherwise.
