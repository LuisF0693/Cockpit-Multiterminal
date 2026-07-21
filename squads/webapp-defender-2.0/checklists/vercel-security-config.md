# Vercel Security Configuration Checklist

> Validate security configuration for Vercel-hosted applications.

## Security Headers (vercel.json)

- [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- [ ] `Content-Security-Policy` configured (no unsafe-eval)

## CORS

- [ ] `Access-Control-Allow-Origin` set to specific domain(s)
- [ ] No wildcard `*` in any CORS header
- [ ] `Access-Control-Allow-Methods` restricted to needed methods
- [ ] `Access-Control-Allow-Headers` restricted to needed headers

## Rewrites & Redirects

- [ ] HTTP → HTTPS redirect configured
- [ ] Protected routes redirect unauthenticated users
- [ ] No source maps exposed in production (`sourcemap: false`)

## Environment Variables

- [ ] API keys in Vercel env vars (not in client code)
- [ ] Different keys for preview vs production
- [ ] No secrets in `NEXT_PUBLIC_*` variables

## Deployment

- [ ] Preview deployments password-protected or restricted
- [ ] Production deployment on custom domain with SSL
- [ ] Vercel Authentication enabled for admin routes (if applicable)
