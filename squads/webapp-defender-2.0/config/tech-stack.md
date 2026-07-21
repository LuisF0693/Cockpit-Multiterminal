# Tech Stack — webapp-defender

## Primary Targets

This squad is optimized for auditing applications built with:

| Technology | Role | Notes |
|-----------|------|-------|
| **Supabase** | Backend (Auth, DB, API) | RLS, PostgREST, Auth settings |
| **Vercel** | Hosting/Deployment | Headers, CORS, rewrites |
| **React/Next.js** | Frontend | CSP, client-side security |
| **PostgreSQL** | Database | RLS policies, functions |

## Frameworks & Standards

| Framework | Use |
|-----------|-----|
| OWASP Top 10 2021 | Vulnerability classification |
| NIST 800-53 Rev. 5 | Control mapping |
| CVSS 3.1 | Severity scoring |
| LGPD | Brazilian data protection compliance |
| ISO 27001:2022 | Security management reference |

## Tools (Passive Only)

| Tool | Purpose | Intrusive? |
|------|---------|-----------|
| curl | Read HTTP headers | No |
| SQL analysis | Parse dumps/migrations | No |
| OpenAPI parser | Analyze schema exposure | No |
| Code review | Manual source review | No |
