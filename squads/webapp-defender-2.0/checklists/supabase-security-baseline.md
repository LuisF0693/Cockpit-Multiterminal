# Supabase Security Baseline Checklist

> Use this checklist to validate minimum security posture for any Supabase application.
> Based on real audit findings across 3 applications (41 vulnerabilities, 9 CRITICAL).

## Row Level Security

- [ ] **RLS enabled on ALL public tables** — No exceptions
- [ ] **FORCE ROW LEVEL SECURITY** set on all tables
- [ ] **SELECT policies** exist for every table
- [ ] **INSERT policies** exist for every writable table
- [ ] **UPDATE policies** exist for every updatable table
- [ ] **DELETE policies** exist (even if `USING(false)`)
- [ ] **No `USING(true)` on PII tables** — Must restrict by user_id or role
- [ ] **Anon role** cannot SELECT PII tables
- [ ] **Anon role** cannot INSERT/UPDATE/DELETE any table

## RPC Functions

- [ ] **All SECURITY DEFINER functions** have `auth.uid()` check
- [ ] **Destructive functions** (delete, drop) require admin role
- [ ] **Role-granting functions** require owner/admin role
- [ ] **No functions accept user_id** without ownership validation (IDOR)
- [ ] **Error messages** don't leak internal details

## Authentication

- [ ] **Signup disabled** (invite-only) OR restricted to allowed domains
- [ ] **Email confirmation** required (auto-confirm OFF)
- [ ] **Password minimum** 12+ characters
- [ ] **Rate limiting** enabled on auth endpoints
- [ ] **JWT expiry** <= 1 hour (not 10 years!)
- [ ] **Refresh token rotation** enabled

## API Exposure

- [ ] **PostgREST hints** disabled (`pgrst.db_plan_enabled = false`)
- [ ] **OpenAPI schema** not publicly accessible (or behind proxy)
- [ ] **Auth settings** endpoint doesn't leak sensitive config
- [ ] **Server-side proxy** recommended (hides Supabase URL from client)

## Headers & CORS

- [ ] **CORS** restricted to specific domains (no wildcard `*`)
- [ ] **HSTS** with preload enabled
- [ ] **CSP** without `unsafe-eval`
- [ ] **X-Frame-Options** DENY
- [ ] **X-Content-Type-Options** nosniff
