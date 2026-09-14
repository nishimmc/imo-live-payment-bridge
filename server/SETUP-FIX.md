# IMOLIVE AGENCY V7 — Setup / Security

## Local mode
1. Install Node.js 18+ LTS.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:3000`.
5. Admin: `http://localhost:3000/admin`.
6. Default local admin password: `ImoLive@2026#7vQ9!mR2`.

## Production / Supabase mode
1. Set `LOCAL_MODE=false` in `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the server.
3. Set a strong `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`.
4. Set a real 64-hex-character `IMO_ENCRYPTION_KEY` and never rotate it without a migration plan for encrypted Imo numbers.
5. Run `supabase/schema.sql` in the Supabase SQL Editor.
6. Restart the Next.js process after changing environment variables.

## Important
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client-side code.
- Do not use the built-in local password for an internet-facing deployment.
- The booking status endpoint requires a per-booking access token for customers.
- The server calculates the booking price from the selected profile; client-supplied price values are ignored.
