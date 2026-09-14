# ImoLive Payment Bridge

Dedicated Android companion app for the ImoLive agency payment-verification server.

## What it does
- Receives incoming SMS on the dedicated payment phone.
- Detects bKash/Nagad messages.
- Extracts provider, source number and amount.
- Optionally checks the actual SMS sender against configured bKash/Nagad sender IDs.
- Sends only parsed payment data plus raw SMS to the Next.js `/api/payments/sms` endpoint over HTTPS.
- Uses a device token header.
- Queues failed sends with WorkManager and retries when possible.

## GitHub build
Push this `android/` folder as a repository root. Run **Actions → Build Android Payment Bridge → Run workflow**. The APK is uploaded as an artifact.

## Important
This is intended for a dedicated, privately controlled payment phone and sideload/internal distribution. Google Play has strict SMS permission rules; broad SMS access is restricted and SMS-based financial transactions are a listed exception subject to review/approval. See the official policy before Play Store distribution.

## Server configuration
Set `PAYMENT_DEVICE_TOKEN` in the Next.js `.env.local`. Use the same token in the Android app. Use an HTTPS production URL.

For stronger spoof protection, configure the exact bKash and Nagad SMS sender IDs in the Android app and, preferably, configure server-side allowlists too.
