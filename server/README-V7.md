# IMOLIVE AGENCY V7 — FIXED

This version hardens the original V7 demo/agency app.

## Major fixes
- Cryptographically signed, expiring admin session cookie instead of a forgeable `imo_admin=1` flag.
- Admin API authorization on protected endpoints.
- Login rate limiting and correct 401/429 UI messages.
- Server-side price calculation; client-submitted price is ignored.
- Duplicate Transaction-ID prevention in Supabase and serialized local mode.
- Customer booking access token: booking status cannot be read using only a booking UUID.
- Polling uses the access token and stops on every terminal state.
- Approve/reject operations are conditional on `pending` status.
- Image upload checks file signatures (magic bytes), MIME consistency, size and random filenames.
- Upload rate limiting and safer URL handling for banner links.
- Local JSON writes are serialized and atomic.
- Rating input validation and rate limiting.
- Better API error status handling.

## Default local admin password
`ImoLive@2026#7vQ9!mR2`

This password is intended only for the built-in local demo. For any internet-facing deployment set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` in `.env.local`.

## Production requirements
1. Set `LOCAL_MODE=false`.
2. Set Supabase URL and service-role key on the server only.
3. Run `supabase/schema.sql` in Supabase SQL Editor.
4. Set `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `IMO_ENCRYPTION_KEY`.
5. Run `npm install`, then `npm run build`, then `npm start`.


## Android SMS payment verification
Customer payment form now uses Provider (bKash/Nagad) + payment source number; no TrxID is required. An Android payment device must POST detected payment SMS events to `/api/payments/sms` with `X-Payment-Device-Token`. The server matches provider + source + exact amount and a 15-minute-before/2-minute-after time window, stores a SHA-256 SMS identifier, prevents the same SMS from being reused, and auto-approves the oldest matching pending booking. Multiple payments from the same source number are supported because each SMS event is independently marked used. Set `PAYMENT_DEVICE_TOKEN` in `.env.local`. This project includes the server endpoint; the Android SMS listener is a separate companion app.


## Android Payment SMS Bridge
The companion Android source is in the separate `android/` folder of the combined package. Set `PAYMENT_DEVICE_TOKEN` on the server and the same value in the Android app. For stronger anti-spoofing, set `BKASH_SMS_SENDERS` and `NAGAD_SMS_SENDERS` to the exact sender IDs observed on the dedicated payment phone. Use HTTPS only. The Android app sends provider, source number, amount, SMS sender, timestamp and raw SMS to `/api/payments/sms`; the server performs the final match and marks each payment event as used once.
