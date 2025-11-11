# Post Mortem: Frontend Login Blank Screen and API Errors

- Date: 2025-11-03
- Agent: GPT-5 (Cursor)

## Summary
After successful login, the frontend flashed and then rendered a blank page. Several API endpoints also failed under certain conditions (notably SSL certificates). Root causes were a missing database table for SSL certificates, an auth state race in the frontend after login, and missing defensive checks when backend responses were empty/null.

## Impact
- Users could log in but the dashboard immediately disappeared (blank render).
- GET `/api/ssl-certificates` returned 500 due to missing table.
- Occasional console errors from components attempting to read `.length` or iterate over null values.

## Timeline
- 2025-11-03: Admin account requested and created; added init process to docker-compose to auto-create admin.
- 2025-11-03: User reported blank frontend after login; investigation revealed 500 on `/api/ssl-certificates` and auth issues.
- 2025-11-03: Added SSL certificates migration and applied it; fixed frontend auth flow and null-guarded UI components.

## Root Causes
1) Database schema gap:
   - Table `ssl_certificates` was not present. Backend `ListSSLCertificates` queried a non-existent table → 500.

2) Frontend auth race after login:
   - `signIn` set user state from the login response and navigated immediately. A subsequent `/auth/me` fetch sometimes didn’t run or state didn’t fully settle, leading to components relying on incomplete auth state.

3) UI not defensive against empty/null API responses:
   - Components assumed arrays (e.g., `groups`, `servers`, `certificates`) and accessed `.length` or `.forEach` on potential null/undefined.

## Fixes Implemented
1) Automatic admin seeding at startup
   - Added `init-admin` service to `docker-compose.yml` to run the existing Go script and create/approve the admin user with role `admin`.

2) Added missing migration for SSL certificates
   - Created `backend/migrations/03_ssl_certificates.sql` defining `ssl_certificates` plus indexes and an `updated_at` trigger function.
   - Applied migration to the running Postgres container.

3) Hardened frontend authentication flow
   - File: `src/lib/auth.tsx`
   - Change: after a successful `POST /auth/login`, persist token immediately, then call `fetchCurrentUser()` to retrieve authoritative user and roles before navigating. This removes a potential state/timing race.

4) Defensive UI coding against null values
   - File: `src/components/SSLExpirationNotifications.tsx`
     - Only run checks when `user` is present; normalize the certificates list to an array before iterating.
   - File: `src/pages/Index.tsx`
     - Normalize `groups` and `servers` to arrays; guard `.length` usages; keep mock servers fallback.

## Verification
- After fixes, login returns a token and immediately fetches `/api/auth/me` with Authorization header; UI remains visible.
- `/api/ssl-certificates` returns 200 (empty list if no data).
- No console exceptions related to null `.length` or `.forEach`.

## Prevention / Follow-ups
- Add a simple backend startup migration runner (or document manual apply for new `.sql` files) to keep DB schema in sync across environments.
- Maintain defensive checks at API boundaries in the frontend (`Array.isArray` guards) and keep auth-driven components gated by `user` presence.
- Consider adding basic e2e smoke test: login → `/auth/me` 200 → render dashboard without errors.


