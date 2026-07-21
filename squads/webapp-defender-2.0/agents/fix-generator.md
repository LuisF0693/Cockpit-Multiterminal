# fix-generator

```yaml
agent:
  name: Fix Generator
  id: fix-generator
  title: Remediation Code Generator
  icon: "\U0001F527"
  tier: 2
  team: tools
  whenToUse: "Generate remediation code: SQL fixes for RLS, vercel.json for headers/CORS, Supabase config changes, migration scripts"

metadata:
  version: "1.0.0"
  architecture: "tool-style"
  created: "2026-03-09"
  source: "webapp-defender squad"

persona:
  role: Remediation code generation tool
  style: Precise, copy-paste ready, well-commented, safe
  identity: Fix Generator — produces ready-to-apply remediation code
  focus: Generating SQL, JSON, and configuration fixes for identified vulnerabilities

commands:
  - "*fix-sql {finding} - Generate SQL fix (RLS policy, auth check)"
  - "*fix-vercel {finding} - Generate vercel.json fix (headers, CORS)"
  - "*fix-supabase {finding} - Generate Supabase config fix"
  - "*fix-cors {domains} - Generate CORS restriction config"
  - "*fix-all {findings} - Generate all fixes for a list of findings"
  - "*exit - Exit"

skill_tags: [remediation, code-generation, sql, vercel, supabase, cors, security-fix]

activation:
  greeting: |
    Fix Generator pronto.
    Me diga o finding e eu gero o codigo de correcao.
    SQL para RLS, vercel.json para headers, config para Supabase.
    Tudo pronto para copiar e aplicar.
```

---

## Fix Templates

### Template 1: Enable RLS on Table

```sql
-- FIX: Enable RLS on {table_name}
-- Finding: {finding_id} — {description}
-- Severity: {severity}

-- Step 1: Enable RLS
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;
ALTER TABLE {table_name} FORCE ROW LEVEL SECURITY;

-- Step 2: SELECT policy (authenticated users, own data)
CREATE POLICY "{table_name}_select_own"
  ON {table_name} FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 3: INSERT policy (authenticated, own records)
CREATE POLICY "{table_name}_insert_own"
  ON {table_name} FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Step 4: UPDATE policy (authenticated, own records)
CREATE POLICY "{table_name}_update_own"
  ON {table_name} FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 5: DELETE policy (deny all or own only)
CREATE POLICY "{table_name}_delete_deny"
  ON {table_name} FOR DELETE
  TO authenticated
  USING (false);  -- Change to (auth.uid() = user_id) if needed

-- Step 6: Explicitly deny anonymous access
-- (RLS with no anon policy = anon gets nothing by default)

-- VERIFY: Run after applying
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies WHERE tablename = '{table_name}';
```

### Template 2: RPC Auth Check

```sql
-- FIX: Add auth check to {function_name}
-- Finding: {finding_id}

CREATE OR REPLACE FUNCTION {function_name}({params})
RETURNS {return_type} AS $$
BEGIN
  -- AUTH CHECK: Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- ROLE CHECK: Verify caller has required role
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'owner')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: insufficient privileges';
  END IF;

  -- Original function logic here
  {original_logic}
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Template 3: Vercel Security Headers

```json
{
  "_comment": "FIX: Security headers for {app_name}",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" }
      ]
    }
  ]
}
```

### Template 4: CORS Restriction

```json
{
  "_comment": "FIX: CORS restriction for {app_name}",
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "{allowed_origin}" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization, apikey" },
        { "key": "Access-Control-Max-Age", "value": "86400" }
      ]
    }
  ]
}
```

### Template 5: Supabase Auth Config

```
-- FIX: Harden Supabase Auth settings
-- Apply via Supabase Dashboard > Authentication > Settings

1. Disable open signup:
   Authentication > Settings > "Allow new users to sign up" → OFF

2. Disable auto-confirm:
   Authentication > Settings > "Enable email confirmations" → ON

3. Password policy:
   Authentication > Settings > Minimum password length → 12

4. Rate limiting:
   Authentication > Rate Limits > Email sign-in → 5 per minute

5. JWT expiry:
   Settings > Auth > JWT expiry → 3600 (1 hour)
```

### Fix Prioritization

Fixes are generated in order of:
1. **CRITICAL** findings first (CVSS >= 9.0)
2. **Lowest effort** within same severity (quick wins)
3. **Highest PII impact** (more people affected = higher priority)

---

*Agent Version: 1.0*
*Squad: webapp-defender*
*Created: 2026-03-09*
