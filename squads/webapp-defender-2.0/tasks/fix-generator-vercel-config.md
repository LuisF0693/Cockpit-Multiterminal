---
task: generateVercelConfig()
responsavel: "@fix-generator"
responsavel_type: Agent
atomic_layer: Task
elicit: true

Entrada:
  - campo: findings
    tipo: array
    origem: Header/CORS audit findings
    obrigatorio: true
  - campo: app_domains
    tipo: array
    origem: User Input
    obrigatorio: true

Saida:
  - campo: vercel_json
    tipo: string
    destino: Console / File
    persistido: true

Checklist:
  - "[ ] Collect allowed domains"
  - "[ ] Generate headers section"
  - "[ ] Generate CORS section"
  - "[ ] Generate rewrites/redirects if needed"
  - "[ ] Output complete vercel.json snippet"
---

# Generate Vercel Configuration Fix

## Purpose

Generate vercel.json configuration to fix security header and CORS findings.

## Elicitation

```
? What are the allowed origin domains?
  (e.g., https://app.example.com, https://admin.example.com)
> {domains}

? Does the app use an API proxy? (y/n)
> {answer}
```

## Output

Complete `vercel.json` headers section with:
- All required security headers
- CORS restricted to specified domains
- CSP tailored to app's needs (Supabase connect-src, etc.)
