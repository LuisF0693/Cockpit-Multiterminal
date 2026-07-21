---
task: generateCorsFix()
responsavel: "@fix-generator"
responsavel_type: Agent
atomic_layer: Task
elicit: true

Entrada:
  - campo: allowed_origins
    tipo: array
    origem: User Input
    obrigatorio: true
  - campo: platform
    tipo: string
    origem: User Input
    obrigatorio: true
    validacao: "vercel | netlify | nginx | supabase"

Saida:
  - campo: cors_config
    tipo: string
    destino: Console / File
    persistido: true

Checklist:
  - "[ ] Collect allowed origins"
  - "[ ] Determine platform"
  - "[ ] Generate platform-specific CORS config"
  - "[ ] Include allowed methods and headers"
  - "[ ] Output ready-to-apply config"
---

# Generate CORS Fix

## Purpose

Generate platform-specific CORS restriction configuration. Replaces wildcard `*` with specific allowed domains.

## Elicitation

```
? Allowed origins (comma-separated):
  e.g., https://app.example.com, https://admin.example.com
> {origins}

? Platform:
  1. Vercel (vercel.json)
  2. Netlify (_headers)
  3. Nginx (nginx.conf)
  4. Supabase (Edge Functions)
> {choice}
```
