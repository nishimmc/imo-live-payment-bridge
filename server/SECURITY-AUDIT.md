# V7 Fixed — Deep Audit Summary

## Fixed in this build

### 1. Admin authentication
- Removed the forgeable `imo_admin=1` authorization flag.
- Added signed, expiring HMAC-based admin sessions.
- Added `HttpOnly`, `SameSite=Lax`, `Secure`-in-production cookie handling.
- Added login rate limiting and correct 401/429 responses.
- Production mode refuses to use the built-in local password.

### 2. Price mapping
- Booking price is calculated on the server from `price_10`, `price_20`, `price_30`, `price_45`, or `price_60`.
- Client-submitted price is ignored.
- Frontend uses the same duration fields for display.

### 3. Duplicate booking
- Supabase has a unique normalized Transaction-ID index.
- Local mode checks duplicates inside a serialized write lock.
- Local writes use atomic temp-file replacement.
- Approve/reject operations are conditional on the booking still being `pending`.

### 4. Booking privacy and polling
- Customer receives a random per-booking access token.
- Customer status requests require that token; a UUID alone is not sufficient.
- The token is stored as a SHA-256 hash, not plaintext.
- Polling sends the token, starts immediately, runs every 4 seconds, and stops on terminal states.
- Approved bookings expose the manager number only after approval.

### 5. Image upload
- Requires a real JPG/PNG/WEBP/GIF signature (magic bytes).
- Checks declared MIME type against detected content.
- Enforces an 8 MB limit.
- Uses cryptographically random filenames.
- Adds upload rate limiting.
- Does not permit SVG uploads.

### 6. Other hardening
- Rating input length/type validation and rate limiting.
- Safer banner URL handling (HTTP/HTTPS or local paths only).
- Public profile/settings APIs return service errors with non-2xx status instead of pretending the request succeeded.
- Supabase schema adds booking access-token storage, duration constraints, status constraints and normalized Transaction-ID uniqueness.

## Verification performed
- JavaScript API/server files passed `node --check`.
- Local data-store test verified: initial data creation, duplicate Transaction-ID rejection, and concurrent approve/reject protection.

## Limitation
The environment did not have the npm dependencies cached and external npm installation timed out, so a real `next build` and browser end-to-end test could not be executed here. Before production deployment, run:

`npm install`

`npm run build`

and test Login → Profile → Image Upload → Booking → Admin Approval → Customer Polling with a real Supabase project if using production mode.
