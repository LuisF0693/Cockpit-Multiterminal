---
task: generateHeaderFix()
responsavel: "@header-analyzer"
responsavel_type: Agent
atomic_layer: Task
elicit: true

Entrada:
  - campo: missing_headers
    tipo: array
    origem: analyzeHeaders output
    obrigatorio: true
  - campo: platform
    tipo: string
    origem: User Input
    obrigatorio: true
    validacao: "vercel | netlify | nginx | apache | cloudflare"

Saida:
  - campo: fix_config
    tipo: string
    destino: Console / File
    persistido: true

Checklist:
  - "[ ] Identify platform"
  - "[ ] Generate platform-specific config"
  - "[ ] Include all missing headers"
  - "[ ] Output ready-to-apply config"
---

# Generate Header Fix

## Purpose

Generate platform-specific configuration to add missing security headers.

## Elicitation

```
? Which hosting platform?
  1. Vercel (vercel.json)
  2. Netlify (netlify.toml / _headers)
  3. Nginx (nginx.conf)
  4. Apache (.htaccess)
  5. Cloudflare (Page Rules / Transform Rules)
```

Generates ready-to-copy config for the selected platform.
