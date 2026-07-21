# Coding Standards — webapp-defender

## SQL Standards

- All RLS policies must use `auth.uid()` for user-scoped access
- All SECURITY DEFINER functions must have auth check as first statement
- Use `RAISE EXCEPTION` for auth failures (not silent return)
- Always include FORCE ROW LEVEL SECURITY with ENABLE
- Policy names follow: `{table}_{operation}_{scope}` (e.g., `users_select_own`)

## Report Standards

- Reports in PT-BR with proper accents
- Follow SAIOS template format
- Every finding must include: ID, title, severity, CVSS, OWASP, NIST, remediation
- Remediation must include copy-paste ready code

## Naming Conventions

- Finding IDs: `{CATEGORY}-{SEVERITY}{NUMBER}` (e.g., `AUTH-C1`, `INFRA-H2`)
- Task files: `{agent}-{action}.md` in kebab-case
- Agent files: `{agent-name}.md` in kebab-case
