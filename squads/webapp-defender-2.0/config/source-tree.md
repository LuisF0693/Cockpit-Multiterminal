# Source Tree — webapp-defender

```
squads/webapp-defender/
├── squad.yaml                              # Squad manifest
├── README.md                               # Documentation
├── config/
│   ├── coding-standards.md                 # SQL and report standards
│   ├── tech-stack.md                       # Target technologies
│   └── source-tree.md                      # This file
├── agents/
│   ├── shield.md                           # Tier 0: Orchestrator
│   ├── rls-guardian.md                     # Tier 1: RLS & Access Control
│   ├── config-sentinel.md                  # Tier 1: Security Configuration
│   ├── auth-inspector.md                   # Tier 1: Authentication & Authorization
│   ├── compliance-advisor.md               # Tier 1: LGPD Compliance
│   ├── header-analyzer.md                  # Tier 2: HTTP Header Tool
│   ├── schema-reviewer.md                  # Tier 2: API Schema Tool
│   ├── policy-validator.md                 # Tier 2: SQL Policy Tool
│   └── fix-generator.md                    # Tier 2: Remediation Code Tool
├── tasks/
│   ├── shield-triage-findings.md           # Prioritize findings
│   ├── shield-generate-roadmap.md          # Generate remediation roadmap
│   ├── shield-audit-report.md              # Consolidated audit report
│   ├── rls-guardian-audit-policies.md      # Full RLS audit
│   ├── rls-guardian-check-table-exposure.md# Table exposure analysis
│   ├── rls-guardian-generate-fix.md        # Generate RLS SQL fix
│   ├── rls-guardian-validate-rpc-auth.md   # Validate RPC auth checks
│   ├── config-sentinel-audit-cors.md       # CORS audit
│   ├── config-sentinel-audit-security-headers.md  # Header audit
│   ├── config-sentinel-audit-openapi-exposure.md  # OpenAPI audit
│   ├── config-sentinel-audit-postgrest-hints.md   # Hints audit
│   ├── auth-inspector-review-auth-flow.md  # Full auth review
│   ├── auth-inspector-check-rate-limiting.md  # Rate limiting check
│   ├── auth-inspector-check-signup-config.md  # Signup config check
│   ├── auth-inspector-check-password-policy.md# Password policy check
│   ├── auth-inspector-review-jwt-config.md # JWT config review
│   ├── compliance-advisor-scan-pii-exposure.md # PII scan
│   ├── compliance-advisor-check-lgpd.md    # LGPD assessment
│   ├── compliance-advisor-check-consent.md # Consent mechanisms
│   ├── compliance-advisor-generate-anpd-report.md # ANPD notification
│   ├── header-analyzer-analyze.md          # Analyze headers
│   ├── header-analyzer-compare-baseline.md # Compare baseline
│   ├── header-analyzer-generate-fix.md     # Generate header fix
│   ├── schema-reviewer-analyze-openapi.md  # Analyze OpenAPI
│   ├── schema-reviewer-check-exposure.md   # Check exposure
│   ├── schema-reviewer-generate-fix.md     # Generate restriction fix
│   ├── policy-validator-validate-rls.md    # Validate RLS SQL
│   ├── policy-validator-check-coverage.md  # Coverage matrix
│   ├── policy-validator-detect-gaps.md     # Detect gaps
│   ├── fix-generator-sql.md               # SQL fixes
│   ├── fix-generator-vercel-config.md      # Vercel config fixes
│   ├── fix-generator-supabase-config.md    # Supabase config fixes
│   └── fix-generator-cors.md              # CORS fixes
├── workflows/
│   ├── full-audit-workflow.yaml            # Complete passive audit
│   ├── rls-audit-workflow.yaml             # Focused RLS audit
│   └── quick-check-workflow.yaml           # Quick security check
├── checklists/
│   ├── supabase-security-baseline.md       # Supabase security checklist
│   ├── vercel-security-config.md           # Vercel config checklist
│   ├── lgpd-compliance.md                  # LGPD compliance checklist
│   └── pre-deploy-security.md             # Pre-deploy gate
├── templates/
│   └── audit-report-template.md            # Report template
├── data/
│   └── vulnerability-patterns.yaml         # Pattern database (10 patterns)
└── tools/
    └── (empty)
```

## Statistics

- **Agents:** 9 (1 orchestrator + 4 minds + 4 tools)
- **Tasks:** 32
- **Workflows:** 3
- **Checklists:** 4
- **Data files:** 1 (10 vulnerability patterns)
- **Total files:** ~55
