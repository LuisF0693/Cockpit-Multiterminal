# Generate Stitch DESIGN.md

> Task ID: ds-generate-stitch-design-md
> Agent: Design Chief (Orchestrator) + Brad Frost (Token Extraction)
> Version: 1.0.0
> **Execution Type:** `Hybrid`
> **Human Checkpoint:** Confirm target business/app and validate atmosphere description before full generation
> **Dependencies:** depends_on: `[ds-extract-tokens]` · enables: `[ds-bootstrap-starter, ds-theme-multi-brand]` · workflow: `standalone`

## Description

Gera um arquivo DESIGN.md no formato oficial do Google Stitch a partir de um design system existente no starter ou no workspace.

O DESIGN.md serve como "source of truth" portavel para ferramentas externas de geracao de UI (Stitch, AI Studio, Lovable, Bolt, v0, Cursor). Ele traduz tokens tecnicos (CSS custom properties, Tailwind config) em linguagem descritiva de design suportada por valores exatos, seguindo a especificacao do [Stitch design-md skill](https://github.com/google-labs-code/stitch-skills/tree/main/skills/design-md).

Este task **nao** cria o design system. Ele **documenta** um DS existente no formato que ferramentas AI externas consomem.

## Canonical Context

Antes de executar, carregar:

1. **DS Config:** `apps/{app}/starter/design-system.config.yaml` OU `workspace/businesses/{bu}/design-system/config.yaml`
2. **Tokens CSS:** Todos os arquivos listados em `token_files` do DS config
3. **Site Config:** `apps/{app}/starter/site.config.yaml` (fonts, branding)
4. **Brandbook YAML:** `workspace/businesses/{bu}/brand/brandbook.yaml` (se existir)

Se o business nao tem DS configurado, resolver primeiro via `*ds-setup-design-system`.

## Output Schema

- **produces:** `outputs/design/{bu}/DESIGN.md`
- **format:** Markdown seguindo o Stitch DESIGN.md format (7 secoes)
- **consumed_by:** Google Stitch, AI Studio (Gemini), Lovable, Bolt, Cursor, v0, qualquer ferramenta AI de geracao de UI

## Input

| Param | Obrigatorio | Descricao | Validacao |
|-------|-------------|-----------|-----------|
| `business` | Sim (ou app) | Slug do business no workspace | Deve existir em `workspace/businesses/{bu}/` |
| `app` | Sim (ou business) | ID do app no monorepo | Deve existir em `apps/{app}/` |
| `atmosphere` | Nao | Override da descricao de atmosfera | String livre. Se omitido, extrair do brandbook |
| `target_tool` | Nao | Ferramenta alvo (stitch, ai-studio, lovable) | Default: stitch. Afeta secao 7 |

## Workflow

### Step 1: Resolve DS Source

```
IF --app provided:
  Read apps/{app}/starter/design-system.config.yaml
  Read apps/{app}/starter/site.config.yaml
  Read apps/{app}/src/app/globals.css
  Read ALL token_files from DS config
ELIF --business provided:
  Run: node squads/aiox-design/scripts/design-system/resolve_business_design_system.cjs --bu={business}
  IF result == "not_applicable": HALT "Business nao tem DS configurado"
  IF result == "configured": Load workspace/businesses/{bu}/design-system/config.yaml
  Read token files from config
```

### Step 2: Extract Token Inventory

Parse todos os CSS files carregados e extrair:

```
1. SURFACE TOKENS: Todas as vars que definem backgrounds/surfaces
   - Ordenar por luminosidade (mais escuro -> mais claro)
   - Atribuir Layer number (0 = mais escuro)
   - Calcular hex a partir de oklch/rgba se necessario

2. TEXT TOKENS: Todas as vars para cor de texto
   - Mapear funcao: primary, secondary, muted, accent, on-primary

3. ACCENT TOKENS: Cor de marca + escala de opacidade
   - Identificar cor base + todas as variantes alpha

4. BORDER TOKENS: Todas as vars de borda
   - Classificar por opacidade

5. STATUS TOKENS: error, warning, success, info

6. SPACING: Extrair de globals.css ou Tailwind config
   - Montar spacing scale com step numbers

7. MOTION: Easing curves + durations

8. TYPOGRAPHY: Font families, scales, weights
   - De site.config.yaml: CDN URLs
   - De globals.css: font-family declarations
   - De componentes: type scale patterns

9. Z-INDEX: Layer tokens
```

### Step 3: Extract Atmosphere

```
IF --atmosphere provided:
  Use override text
ELIF brandbook.yaml exists:
  Extract from: brand_essence, archetype, voice sections
  Translate to Stitch-style atmosphere description
  Use evocative adjectives (e.g., "Authoritative", "Technical", "Minimalist")
ELSE:
  Analyze token palette + component patterns
  Infer atmosphere from: dark/light mode, accent color warmth, border opacity, radius values
```

### Step 4: Translate to Stitch Language

Para cada token extraido, gerar descricao no formato Stitch:

```
REGRAS DE TRADUCAO:

1. CORES: Sempre "Nome Descritivo (hex)"
   Errado: --bb-surface: #151517
   Certo: Deep Charcoal Surface (#151517) - Layer 2. Standard card background.

2. FORMAS: Descrever fisicamente
   Errado: border-radius: 0px
   Certo: Sharp, squared-off edges (0px radius globally)
   Errado: border-radius: 12px
   Certo: Generously rounded corners (12px radius)

3. PROFUNDIDADE: Descrever como layering
   Errado: "card tem background #262626"
   Certo: "Card sits on Surface Container Low (#262626), layered above the Surface (#1B1B1B) foundation"

4. BORDAS: Descrever efeito
   Errado: "border: 1px solid rgba(255,255,255,0.09)"
   Certo: "Ghost Border — a whisper-thin boundary at 9% white opacity"

5. TIPOGRAFIA: Incluir personalidade
   Errado: "Manrope 800 uppercase"
   Certo: "Architectural, densely-weighted Manrope at 800 weight, set in commanding uppercase"
```

### Step 5: Compose DESIGN.md

Montar o arquivo seguindo as 7 secoes obrigatorias:

```markdown
# Design System: {Project Title}
**Project ID:** {bu_slug ou app_id}

## 1. Visual Theme & Atmosphere
(Mood, density, aesthetic philosophy. Evocative adjectives.)

## 2. Color Palette & Roles
(TODOS os tokens traduzidos: Nome Descritivo (hex) + Role funcional.)
(Subsecoes: Accent, Foundations/Surfaces, Text, Status, Borders, Glass)

## 3. Typography Rules
(Font families com CDN URLs, type scale completo, weight usage, letter-spacing.)

## 4. Component Stylings
(Buttons, Cards, Inputs, Lists, Chips/Badges, Modals.)
(CADA componente com: default, hover, focus-visible, disabled states.)
(Padding e sizing concretos.)

## 5. Layout Principles
(Grid, breakpoints, max-width, spacing scale com steps, motion tokens, z-index.)
(Asymmetry rules, dead space rules, nesting rules se aplicavel.)

## 6. Do's and Don'ts
(5-8 regras concretas extraidas do DS. Sem generalidades.)

## 7. Design System Notes for {target_tool}
(Language conventions, color reference format, component prompt examples, iteration guidelines.)
```

### Step 6: Validate

Checklist de validacao antes de salvar:

```
[ ] Todas as cores tem Nome Descritivo + hex/rgba
[ ] Todas as surfaces tem Layer number
[ ] Todos os componentes tem 4 estados (default, hover, focus-visible, disabled)
[ ] Type scale tem pelo menos 6 niveis
[ ] Spacing scale tem pelo menos 8 steps com valores concretos
[ ] Breakpoints definidos (mobile, tablet, desktop, wide)
[ ] Motion tokens presentes (easing + durations)
[ ] Secao 7 tem pelo menos 3 component prompt examples
[ ] Nenhum valor tecnico sem traducao descritiva
[ ] Font CDN URLs incluidas
```

### Step 7: Save

```bash
mkdir -p outputs/design/{bu}/
# Save DESIGN.md
outputs/design/{bu}/DESIGN.md
```

Se `--target_tool=ai-studio`:
- Gerar tambem `outputs/design/{bu}/system-instruction.txt` com o DESIGN.md formatado para o campo System Instruction do AI Studio
- Adicionar secao de few-shot examples no final

## Success Criteria

| Criterio | Threshold |
|----------|-----------|
| Tokens traduzidos com nome descritivo | 100% |
| Componentes com 4 estados | 100% |
| Secoes presentes (7/7) | 100% |
| Font CDN URLs validos | 100% |
| Spacing steps concretos | >= 8 |
| Breakpoints definidos | >= 3 |

## Failure Handling

- **DS config nao encontrado:** HALT. Sugerir `*ds-setup-design-system` primeiro.
- **Token CSS vazio ou corrompido:** HALT. Sugerir `*ds-extract-tokens` para regenerar.
- **Brandbook inexistente para atmosphere:** WARN. Usar inferencia automatica do Step 3.
- **Font URL invalido:** WARN. Marcar como "[FONT URL NEEDED]" no output e continuar.

## Related Tasks

| Task | Relacao |
|------|---------|
| `ds-extract-tokens` | Pre-requisito. Extrai tokens W3C/DTCG |
| `ds-bootstrap-starter` | Downstream. Usa DESIGN.md para validar starter |
| `ds-theme-multi-brand` | Downstream. Gera DESIGN.md por tema |
| `ds-setup-design-system` | Pre-requisito se DS nao existe |

## Related Checklists

- `squads/design/checklists/token-mapping-checklist.md`
- `squads/design/checklists/design-handoff-checklist.md`

## Metadata

- **Author:** Design Chief
- **Created:** 2026-03-20
- **Tags:** stitch, design-md, portability, ai-tools, tokens, documentation
