# Coding Standards (críticos para agentes AIOX)

1. **Imports absolutos** via `tsconfig` paths (Constitution Art. VI).
2. **Provider isolation:** nenhum import de `adapters/*` fora do PTY Host (lint-enforced).
3. **Eventos primeiro:** mutação de estado só via evento de domínio processado pelo core — nunca write direto de UI no store.
4. **Zod na borda:** todo payload IPC validado nos dois lados; tipos inferidos do schema (nunca duplicados à mão).
5. **Sem `any`;** strict mode; erros com contexto (`Failed to {op}: {cause}`).
6. **Tokens de design apenas** — zero cores/tamanhos hardcoded em componentes (spec da Uma).
