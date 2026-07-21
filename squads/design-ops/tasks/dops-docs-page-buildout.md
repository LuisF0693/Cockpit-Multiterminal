# Task — Documentation Page Buildout

> Workflow para construir página de documentação técnica densa a partir de material denso (PRD, SOTs, ADRs, specs).
>
> **Squad:** design-ops
> **Checklist:** `squads/design-ops/checklists/dops-docs-page-design.yaml`
> **Duração estimada:** 6-12h dependendo da densidade do material fonte

---

## Quando usar esta task

- Material fonte denso (≥ 50KB de spec) precisa virar página navegável
- Documento será revisado por múltiplos stakeholders
- Conteúdo terá evolução incremental (não one-shot)
- Light/Dark theme é requisito

NÃO use para landing pages comerciais (use `dops-page-composition.md`).

---

## Inputs requeridos

| Input | Tipo | Origem |
|-------|------|--------|
| `source_material` | path[] | SOT files, PRD, ADRs, specs (ex: `docs/architecture/.../SOT/`) |
| `target_app` | string | App Next.js que vai hostear (ex: `apps/aiox-brandbook`) |
| `route_slug` | kebab-case | Slug da rota (ex: `sinkra-hub-prd`) |
| `accountable` | slot | Quem aprova o conteúdo final |
| `design_token_namespace` | string | Token base (default: AIOX semantic — `background`, `foreground`, `card`, `muted`, `primary`) |

---

## Outputs

```
apps/{target_app}/src/app/{route_slug}/
├── page.tsx
├── {route}-dashboard.tsx
├── docs-layout.tsx
├── docs-primitives.tsx
├── theme-provider.tsx
├── nav-sections.ts
├── data.ts
├── sections/
│   └── {N}-{topic}.tsx (uma por seção)
├── charts.tsx (opcional)
└── diagrams.tsx (opcional)
```

Plus:
- `outputs/design-ops/{route_slug}/buildout-log.md` — postmortem
- Validação local-CI verde (tsc + eslint + ssr-smoke)

---

## Fases (sequenciais)

### Fase 1 — Discovery (1-2h)

1. **Ler todo o material fonte**
   - Mapear TOC dos SOTs com `grep -nE "^## |^### "`
   - Listar files por tamanho — priorizar densos primeiro
   - Identificar 10-20 conceitos canônicos que viram seções

2. **Decidir agrupamento de sidebar** (7 grupos × 3-5 items max)
   - Exemplo Sinkra Hub: Fundamentos · Atores · Governança · Infra · Inteligência · Entrega · Review
   - Cada item da sidebar = uma seção do conteúdo

3. **Identificar callouts críticos** (BLOCKERS, riscos, decisões frozen)
   - Estes viram `<Callout kind="blocker">` no conteúdo

4. **Listar code/yaml/SQL snippets** que existem no material
   - Reaproveitar 1:1 (não inventar)

**Saída**: `docs/buildout-plan.md` com lista de seções e content map.

### Fase 2 — Scaffold (1-2h)

1. **Verificar app target tem tokens AIOX semânticos**
   ```bash
   grep -E "^\s+--background|^\s+--card|^\s+--foreground" apps/{target_app}/src/app/globals.css
   ```
   Se não: parar e escalar para `@architect`.

2. **Criar estrutura de arquivos** (touch placeholder):
   ```bash
   mkdir -p apps/{target_app}/src/app/{route_slug}/sections
   touch apps/{target_app}/src/app/{route_slug}/{page,docs-layout,docs-primitives,theme-provider,nav-sections,data}.{tsx,ts}
   ```

3. **Implementar primitivos primeiro** (`docs-primitives.tsx`):
   - `Callout` (5 kinds: note/warning/tip/example/blocker)
   - `StatusBadge` (4 kinds: done/in_progress/planned/blocked)
   - `CodeBlock` com tokenizer regex + copy button
   - `H3`, `H4` com anchor IDs auto-slugify
   - `Prose` wrapper (text-[17px] leading-[1.8])
   - `SectionHero` (kicker + title + lead)
   - `SpecTable` (key/value table)
   - `useRightToc` + `RightToc` component
   - `useIsClient` via `useSyncExternalStore`

4. **Implementar ThemeProvider** (`theme-provider.tsx`):
   - `useSyncExternalStore` pattern (não `useEffect + setState`)
   - `ThemeInitScript` exportado para anti-FOUC
   - `STORAGE_KEY` namespaced (`{route}-theme`)

5. **Implementar DocsLayout** (`docs-layout.tsx`):
   - Header fixed h-14 com brand + pill nav + ⌘K + theme toggle
   - Sidebar fixed 260-280px (importante: `fixed` se parent tem `overflow-x: hidden`)
   - RightToc fixed 200-220px
   - Main com `pl-[280px] xl:pr-[220px] pt-14`
   - Sidebar bg distinto do main (sidebar `bg-background`, main `bg-card`)

6. **page.tsx** com `<Script id="prd-theme-init" strategy="beforeInteractive">` injetando `ThemeInitScript`

**Smoke check**: `curl http://localhost:{port}/{route_slug}` → 200 com `<header fixed>`, `<aside fixed>`, `<main pt-14>`.

### Fase 3 — Content extraction (3-6h)

Para **cada seção** (uma por arquivo em `sections/{N}-{topic}.tsx`):

1. **SectionHero** com:
   - `kicker`: tag colorido com source `§X.Y` ou `Track N`
   - `title`: declaração com posição (ex: "O schema é o produto")
   - `lead`: 1-2 sentences com dados-chave

2. **3 layers de conteúdo obrigatórias**:
   - H3 conceitual ("Por que existe / O que faz") → `<Prose>` 2-4 parágrafos
   - H3 spec técnico → `<SpecTable>` + `<CodeBlock>` real do SOT
   - H3 exemplo concreto → `<CodeBlock>` de fluxo real

3. **Callouts** onde aplicável:
   - `kind="blocker"` para BLOCKERs ativos
   - `kind="warning"` para trade-offs/riscos
   - `kind="example"` para casos de uso
   - `kind="note"` para detalhes de implementação

4. **StatusBadge** em features mensuráveis (done/in_progress/planned/blocked)

5. **Source citation** em cada claim não-trivial (`§X`, `ADR-NAME`, `Track N`, `D-PERM-X`)

**Anti-pattern**: inventar. Toda info vem do material fonte. Se faltar, anote em `outputs/design-ops/{route_slug}/source-gaps.md` em vez de preencher.

### Fase 4 — Visual polish (1-2h)

Aplique o checklist `dops-docs-page-design.yaml` integralmente:

- [ ] Tipografia (body 17px / 1.8 leading)
- [ ] Sidebar bg differs from main
- [ ] Light/dark testado (toggle no header)
- [ ] Code blocks com syntax highlight + copy
- [ ] Charts deferred ao client (sem warns Recharts no SSR)
- [ ] Keyboard nav (Tab traversa todos os elementos)
- [ ] Mobile drawer abre/fecha
- [ ] ⌘K abre search

### Fase 5 — Validação local-CI (15min)

```bash
# 1. Typecheck
npx tsc --noEmit

# 2. Lint
npx eslint src/app/{route_slug}/

# 3. SSR smoke
: > /tmp/dev.log
curl -s -o /tmp/page.html -w "%{http_code}\n" http://localhost:{port}/{route_slug}
sleep 3
grep -iE "warn|invalid|hydrat|width\(-1\)|error" /tmp/dev.log

# 4. Anchor stability (todos os href="#{id}" têm target)
node -e "
  const html = require('fs').readFileSync('/tmp/page.html', 'utf8');
  const hrefs = [...html.matchAll(/href=\"#([^\"]+)\"/g)].map(m => m[1]);
  const ids = [...html.matchAll(/id=\"([^\"]+)\"/g)].map(m => m[1]);
  const orphans = hrefs.filter(h => !ids.includes(h));
  console.log('Orphan anchors:', orphans);
"
```

Esperado: tsc=0, lint=0, SSR=200 sem warns, zero anchors órfãos.

### Fase 6 — Postmortem (30min)

Escrever `outputs/design-ops/{route_slug}/buildout-log.md` com:

1. **What worked** — patterns que economizaram tempo
2. **What broke** — issues encontrados (linter, hydration, etc.)
3. **What's missing in material** — gaps no SOT que viraram TODO
4. **Time breakdown** — quantas horas por fase
5. **Tokens learnings** — qualquer ajuste no checklist `dops-docs-page-design.yaml`

Se aprendizado for relevante para futuras pages, propor edit no checklist.

---

## Acceptance criteria

- [ ] Página renderiza 200 OK em SSR
- [ ] Zero warnings em dev log (Recharts, hydration, lint)
- [ ] `npx tsc --noEmit` passes
- [ ] `npx eslint` passes
- [ ] Theme toggle alterna entre dark/light sem FOUC
- [ ] Sidebar e header **fixos** durante scroll
- [ ] ⌘K abre search e filtra sections
- [ ] Todos os anchors funcionam (zero órfãos)
- [ ] Mobile: drawer abre via hambúrguer
- [ ] Cada seção segue padrão 3-layer (conceitual + spec + exemplo)
- [ ] Toda claim cita fonte (`§`, ADR, Track)
- [ ] Zero `bg-bb-*` ou tokens hardcoded — apenas semantic
- [ ] Code blocks têm syntax highlight + copy button
- [ ] Source links apontam para GitHub `main` (não `#`)

---

## Riscos & mitigações

| Risco | Mitigação |
|-------|-----------|
| Linter remove imports não-usados antes da Edit usar | Write atômico (regra AN_KE_163) |
| Sticky quebra em parent com `overflow-x: hidden` | Use `position: fixed` desde o início |
| Recharts SSR warns | ChartFrame com useIsClient |
| Hardcoded dark tokens viram retrabalho | Tokens semânticos AIOX desde o scaffold |
| Theme toggle pisca tema errado | Inline script `beforeInteractive` |
| Sidebar com 20+ items vira ilegível | Agrupe em 5-7 temas no nav-sections.ts |
| Tudo em 1 arquivo de 2000 linhas | Split por seção em sections/ |
| Inventar conteúdo onde SOT é vago | Documentar gap em `source-gaps.md` |

---

## Tools recomendados

- `Read` em chunks (max 200 lines) para SOTs grandes
- `Bash` + `grep -nE "^## |^### "` para mapear TOC
- `Bash` + `find -size +30k` para identificar SOTs densos primeiro
- `Edit` para mudanças cirúrgicas em section files
- `Write` atômico quando 2+ Edits no mesmo arquivo sob linter
- `Bash` + sed `-E` para refactor de tokens em massa

---

## Cross-references

- **Checklist (canonical):** `squads/design-ops/checklists/dops-docs-page-design.yaml`
- **Checklist (human-readable):** `squads/design-ops/checklists/dops-docs-page-design.md`
- **Page composition** (landing pages, não docs): `squads/design-ops/checklists/page-composition-checklist.md`
- **Component quality**: `squads/design-ops/checklists/dops-component-quality.yaml`
- **Visual reference**: `apps/anthropic-ds/src/pages/kits/docs/DocsLayout.tsx`
- **Canonical implementation**: `apps/aiox-brandbook/src/app/sinkra-hub-prd/`

---

*dops-docs-page-buildout v1.0.0 — design-ops squad*
