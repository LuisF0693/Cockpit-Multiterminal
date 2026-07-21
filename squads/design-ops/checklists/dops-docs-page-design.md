# Documentation Page Design — Checklist

> Aplicar quando construir página de documentação técnica densa
> (PRD visualizado, spec arquitetural, guide, reference, runbook).
>
> **Canonical:** `dops-docs-page-design.yaml`
> **Origem:** 7 iterações construindo `/sinkra-hub-prd` no `aiox-brandbook`
> **Status:** active · advisory

---

## Quando aplicar este checklist

Use para **qualquer artefato que apresente documentação técnica > 200 linhas de prose** com necessidade de navegação, code blocks, callouts e structure repetível. Exemplos:

- PRDs com 15+ seções
- ADRs visualizados
- Runbooks operacionais
- Architecture guides
- API references estruturadas
- Onboarding docs com 7+ tópicos

NÃO use para landing pages, marketing decks ou single-page pitches — use `dops-page-composition.md`.

---

## 11 dimensões de qualidade

### 1. Layout

- [ ] **3 colunas** desktop: sidebar 260-280px · main 820-960px · TOC 200-220px
- [ ] Header **sticky ou fixed** no topo (h-14)
- [ ] Sidebar bg **diferente** do main bg (hierarquia "trás vs frente")
- [ ] Main max-width entre **820 e 960px**
- [ ] **Mobile drawer** para sidebar abaixo de `lg`
- [ ] Right TOC opcional abaixo de `xl`
- [ ] Verificou que `overflow-x: hidden` no root NÃO quebra `position: sticky`

**Anti-pattern**: tentar reinventar o layout. Use o pattern Anthropic/Stripe/Mintlify.

### 2. Navegação

- [ ] Sidebar sections **agrupadas tematicamente** (max 7 grupos, 3-5 items cada)
- [ ] Active state via **IntersectionObserver** (não window.scrollY)
- [ ] `rootMargin: "-96px 0px -55% 0px"` calibrado
- [ ] Click smooth-scroll + atualiza hash sem reload
- [ ] **⌘K abre search** com highlight de match
- [ ] **Esc** limpa search
- [ ] Search filtra sections in-place

### 3. Tipografia

- [ ] Body prose ≥ 16px (idealmente 17px)
- [ ] Line-height entre 1.7 e 1.85
- [ ] H1 / SectionHero entre **36-48px** (com clamp mobile)
- [ ] H2 section titles 30-38px
- [ ] H3 subsections 22-28px
- [ ] Tracking negativo em headings grandes (`-0.02 a -0.03em`)
- [ ] Max-width prose 60-68ch
- [ ] Mono inline 14-15px
- [ ] Small/meta text nunca abaixo de 11px

**Anti-pattern**: 14.5px body com line-height 1.65. Vira sales-page tipográfica.

### 4. Estrutura de conteúdo (3-layer obrigatória)

Cada seção precisa das 3 camadas:

- [ ] **Conceitual** (h3 "Por que existe / O que é") — prose explicativa
- [ ] **Spec técnico** (h3 com SpecTable, CodeBlock, schema)
- [ ] **Exemplo concreto** (code block ou fluxo real)
- [ ] **Estado atual** (StatusBadge ou cobertura) — bonus mas recomendado

Cada seção começa com **SectionHero**: kicker chip + title + lead em 1-2 sentences.

**Não-inventar**: toda claim cita fonte (`§4.7`, `ADR-SESSION`, `Track 7`, `D-PERM-2`).

### 5. Semantic tokens (não hardcoded)

- [ ] Zero `bg-bb-dark`, `text-bb-cream`, `bg-bb-surface` (hardcoded dark)
- [ ] Apenas tokens semânticos: `bg-background`, `text-foreground`, `bg-card`, `bg-muted`
- [ ] Border tokens: `border-border`, `border-border-subtle`, `border-border-medium`
- [ ] Accent via `text-primary` / `bg-primary` / `border-primary`
- [ ] Testado em **light AND dark**

### 6. Theme toggle (light/dark)

- [ ] ThemeProvider usa **`useSyncExternalStore`** (não `useEffect + setState`)
- [ ] **Inline script anti-FOUC** no `<head>` antes da hidratação
- [ ] `<Script strategy="beforeInteractive">`
- [ ] localStorage com namespace (`{app}-theme`)
- [ ] Fallback `prefers-color-scheme` na primeira visita
- [ ] `storage event` sincroniza entre abas
- [ ] Ícone Sun ↔ Moon swap
- [ ] `suppressHydrationWarning` no root (compat extensions)

### 7. Code blocks

- [ ] **Syntax highlighting** por linguagem (tokenizer custom OU shiki)
- [ ] **Copy button** com feedback visual ≥ 1.5s
- [ ] Label da linguagem no header
- [ ] Title/filename quando relevante
- [ ] Background distinto do card (mais escuro)
- [ ] Mono 14-15px / leading ≥ 1.65

**Cores recomendadas** (Anthropic palette):
- keywords: `#c084fc` lilac
- strings: `#fbbf24` amber
- comments: `foreground/40 italic`
- numbers: `#22d3ee` cyan
- functions: `#67e8f9` bright cyan
- tags/keys: `#f472b6` pink

### 8. Charts & diagramas

- [ ] Charts **deferred ao client** via `useSyncExternalStore` "is client"
- [ ] Zero Recharts `ResponsiveContainer` no SSR (gera width=-1 warns)
- [ ] SVG inline para diagramas estáticos (state machines, pyramids)
- [ ] `aria-label` ou `role="img"` em visualizações
- [ ] Cores funcionam em ambos os temas (ou theme-aware via CSS vars)

### 9. Performance

- [ ] Section files **modulares** (`sections/*.tsx`, 100-400 LOC cada)
- [ ] Primitivos compartilhados extraídos (`docs-primitives.tsx`)
- [ ] Data separada de views (`data.ts`)
- [ ] Layout separado de content (`docs-layout.tsx`)
- [ ] IntersectionObservers desconectados no unmount

### 10. Acessibilidade

- [ ] **Navegação por teclado** completa (Tab traversa sidebar → main → TOC)
- [ ] Focus indicators visíveis
- [ ] Skip-to-content link (opcional mas recomendado)
- [ ] ⌘K documentado via elemento `<kbd>`
- [ ] `aria-label` em buttons icon-only (theme toggle, copy, search)
- [ ] `prefers-reduced-motion` respeitado em animations
- [ ] Contraste WCAG AA em **ambos** os temas

### 11. GitHub integration

- [ ] Source links apontam para `github.com/{org}/{repo}/blob/main/{path}` (não placeholder `#`)
- [ ] `target="_blank"` + `rel="noreferrer noopener"` em externos
- [ ] Ícone `ExternalLink` em offsite
- [ ] Copy-link per h2/h3 hover (opcional, estilo Mintlify)

---

## Anti-patterns observados (e como evitar)

| Anti-pattern | Sintoma | Fix |
|---|---|---|
| Sticky em parent com overflow-x:hidden | Sidebar/header scrollam com a página | Use `position: fixed` + padding no main |
| `useEffect(setMounted(true))` para "is client" | Lint warning `react-hooks/set-state-in-effect` | `useSyncExternalStore` pattern |
| Recharts ResponsiveContainer no SSR | `width(-1) height(-1)` warnings | Wrap com ChartFrame que usa `useIsClient` |
| Hardcoded `bg-bb-dark` em conteúdo | Quebra ao adicionar light mode | Tokens semânticos desde o início |
| Body prose 14.5px | Texto microscópico, sales-page feel | Mínimo 16px, ideal 17px |
| Linter removendo imports antes do uso | Edit fica órfão | Use Write atômico ou adicione import + uso em mesma Edit |
| Lista plana de 15+ nav items | Sidebar ilegível | Agrupe em 5-7 temas |
| Tudo em um arquivo de 2000+ linhas | Lint lento, edit impossível | Split em `sections/*.tsx` |
| 13 paragraph wrappers `<p>` aleatórios | Espaçamento errático | Use `Prose` component como wrapper único |
| `className="dark"` hardcoded no root | Bloqueia theme toggle | Deixa `ThemeProvider` gerenciar `<html>` class |

---

## Comandos de validação local

```bash
# Type-safety
npx tsc --noEmit

# Lint
npx eslint src/app/{route}/

# SSR smoke (sem warnings de Recharts/hidratação)
curl -s -o /tmp/page.html -w "%{http_code}\n" http://localhost:{port}/{route}
grep -iE "warn|invalid|hydrat|width\(-1\)|error" /tmp/dev.log

# Theme toggle smoke (verificar que <html> alterna class)
# Manual: abrir DevTools → Elements → clicar botão Sun/Moon → ver `<html class="...">` mudar
```

---

## Outputs esperados

Arquivos canônicos por página de docs:

```
apps/{app}/src/app/{route}/
├── page.tsx                  # SSR entry + theme init script
├── {name}-dashboard.tsx      # Orchestrator (importa sections)
├── docs-layout.tsx           # Header + sidebar + RightToc
├── docs-primitives.tsx       # Callout, StatusBadge, CodeBlock, H3, Prose, etc.
├── theme-provider.tsx        # ThemeProvider + useTheme + ThemeInitScript
├── nav-sections.ts           # Sidebar groups
├── data.ts                   # Content data
├── sections/                 # Uma seção por arquivo (100-400 LOC)
│   ├── 01-overview.tsx
│   ├── 02-*.tsx
│   └── ...
├── charts.tsx                # Opcional · Recharts
└── diagrams.tsx              # Opcional · SVGs inline
```

---

## Referência visual

- **Padrão de mercado**: `apps/anthropic-ds/src/pages/kits/docs/DocsLayout.tsx`
- **Implementação canônica**: `apps/aiox-brandbook/src/app/sinkra-hub-prd/`
- **HTML standalone (sem Next)**: `outputs/analysis/sinkra-hub-prd-v2.2-rich.html`

---

*dops-docs-page-design v1.0.0 — design-ops squad*
