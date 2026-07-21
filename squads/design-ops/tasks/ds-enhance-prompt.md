# Enhance Design Prompt

> Task ID: ds-enhance-prompt
> Owner: `design-chief`
> Version: 1.0.0
> **Execution Type:** `Agent`
> **Dependencies:** depends_on: `[]` · enables: `[ds-build-component, ds-compose-molecule, ds-extend-pattern, ds-bootstrap-starter]` · workflow: `standalone`

## Description

Pre-processador que transforma prompts vagos de design em prompts estruturados e otimizados antes de qualquer geracao.

Baseado no [enhance-prompt skill](https://github.com/google-labs-code/stitch-skills/tree/main/skills/enhance-prompt) do Google Stitch. O Stitch NUNCA envia prompt cru ao modelo. Este task traz o mesmo principio ao design-system squad.

## Output Schema

- **produces:** Prompt estruturado no formato `design-generation-prompt-tmpl.md`
- **format:** Markdown (texto retornado ao agente downstream, nao salvo em disco)
- **consumed_by:** Qualquer task de geracao de UI (ds-build-component, ds-compose-molecule, etc.)

## Input

| Param | Obrigatorio | Descricao | Validacao |
|-------|-------------|-----------|-----------|
| `prompt` | Sim | Texto livre do usuario descrevendo o que quer | String nao vazia |
| `target` | Nao | Tipo de output: "page", "component", "section" | Default: inferido do prompt |
| `business` | Nao | Slug do business para carregar DS | Se omitido, usar DS ativo da sessao |

## Workflow

### Step 1: Assess Input

Avaliar 6 dimensoes do prompt do usuario. Para cada dimensao faltante, preencher com default ou perguntar.

```yaml
dimensions:
  platform:
    check: "Menciona web, mobile, desktop, tablet?"
    if_missing: "Inferir do contexto. Default: Web, Desktop-first"
    examples: ["web", "mobile", "desktop", "responsive"]

  page_type:
    check: "Menciona tipo de pagina?"
    if_missing: "Inferir da descricao"
    examples: ["landing page", "dashboard", "form", "settings", "profile", "checkout"]

  structure:
    check: "Descreve secoes ou componentes especificos?"
    if_missing: "Criar structure numerada baseada no page_type"
    examples: ["header + hero + features + footer", "sidebar + main content"]

  visual_style:
    check: "Usa adjetivos de atmosfera?"
    if_missing: "Consultar design-mappings.yaml > atmosphere e sugerir"
    examples: ["brutalista", "minimal", "premium", "dark mode"]

  colors:
    check: "Menciona cores especificas?"
    if_missing: "Carregar do DS ativo"
    examples: ["#3B82F6", "azul royal", "verde esmeralda", "accent neutro"]

  components:
    check: "Usa termos tecnicos de UI?"
    if_missing: "Traduzir termos vagos via design-mappings.yaml > ui_ux_keywords"
    examples: ["card grid", "sticky nav", "modal dialog"]
```

**Output do Step 1:** Lista de dimensoes com valores resolvidos.

### Step 2: Load Design Context

```
1. Verificar DS ativo:
   - Se *show-context retorna DS configurado: extrair tokens (accent, surfaces, text, fonts)
   - Se --business fornecido: resolver via resolve_business_design_system.cjs
   - Se nenhum DS: sugerir *ds-generate-stitch-design-md ou *ds-setup-design-system

2. Se DESIGN.md existe para o business:
   - Extrair palette, typography, roundness, elevation
   - Incorporar no bloco DESIGN SYSTEM

3. Se nenhum DS disponivel:
   - Usar tokens defaults genericos
   - Adicionar nota: "[DS NOTE: Using generic tokens. Run *ds-setup-design-system for project-specific tokens]"
```

**Output do Step 2:** Bloco DESIGN SYSTEM preenchido com tokens reais.

### Step 3: Refine Terminology

```
1. Carregar squads/design-system/data/design-mappings.yaml

2. Para cada termo no prompt do usuario:
   a. Buscar em ui_ux_keywords: se match, substituir pelo "enhanced"
   b. Buscar em atmosphere: se match, usar como vibe_line
   c. Para shapes: traduzir via geometry
   d. Para profundidade: traduzir via depth

3. Regra de ouro:
   - Prompts vagos precisam de MAIS enhancement
   - Prompts detalhados precisam de MENOS (nao over-design)
   - Nunca mudar a intencao do usuario, apenas refinar a linguagem
```

**Output do Step 3:** Prompt com termos profissionais.

### Step 4: Format Output

```
1. Carregar squads/design-system/templates/design-generation-prompt-tmpl.md

2. Popular template:
   - vibe_line: 1 frase (do atmosphere match ou inferido)
   - DESIGN SYSTEM block: tokens do Step 2
   - PAGE STRUCTURE: secoes numeradas do Step 1
   - COMPONENT CONSTRAINTS: regras especificas se aplicavel
   - STATES: default, hover, focus-visible, disabled (sempre)

3. Validar preenchimento:
   - [ ] vibe_line preenchido (nao vazio)
   - [ ] Minimo 3 cores com "Nome (hex) for role"
   - [ ] Fonts com peso especificado
   - [ ] Roundness e depth com descricao natural (nao valor CSS)
   - [ ] Minimo 3 secoes na PAGE STRUCTURE

4. Retornar prompt formatado para o agente downstream
```

**Output do Step 4:** Prompt final no formato template.

## Exemplos

### Input vago:

```
*ds-enhance-prompt "faz uma landing page moderna"
```

### Output enhanced:

```markdown
A clean, minimal landing page with generous whitespace and high-contrast typography, optimized for conversion.

**DESIGN SYSTEM (REQUIRED):**
- Platform: Web, Desktop-first
- Theme: Clean, minimal, with generous whitespace and high-contrast typography
- Background: Void Dark (#121213) primary canvas
- Surface: Deep Surface (#151517) for card backgrounds
- Primary Accent: {accent_name} ({accent_hex}) for primary actions and highlights
- Text Primary: Cream White (#F4F4F4)
- Text Secondary: Dim Text (rgba(244,244,244,0.52))
- Typography: Space Grotesk 700 for headlines, Manrope 400 for body, IBM Plex Mono 500 for labels
- Roundness: Slightly softened corners (4px)
- Elevation: Whisper-soft shadow on hover, tonal layering for depth
- Borders: Subtle borders at 9% white opacity

**PAGE STRUCTURE:**
1. **Header:** Sticky navigation bar with logo and menu items
2. **Hero Section:** High-impact hero with headline, subtext, and primary CTA button
3. **Features:** Responsive card grid with hover states and subtle elevations
4. **Social Proof:** Testimonial section with quotes and attribution
5. **CTA Section:** Full-width section with centered headline and primary button
6. **Footer:** Site footer with multi-column links, social icons, and legal text

**STATES REQUIRED:**
- Default, Hover, Focus-visible, Disabled
```

## Success Criteria

| Criterio | Threshold |
|----------|-----------|
| 6 dimensoes avaliadas | 100% |
| Termos vagos traduzidos via mappings | 100% dos matches |
| DS tokens carregados | Sim (ou nota de fallback) |
| Template preenchido com minimo 3 cores | 100% |
| PAGE STRUCTURE com minimo 3 secoes | 100% |

## Failure Handling

- **Prompt vazio:** HALT. Pedir descricao.
- **DS nao encontrado:** WARN. Usar tokens genericos com nota.
- **design-mappings.yaml nao encontrado:** WARN. Processar sem traducao.
- **Template nao encontrado:** HALT. Sugerir verificar instalacao do squad.

## Related

| Artefato | Relacao |
|----------|---------|
| `data/design-mappings.yaml` | Consultado no Step 3 |
| `templates/design-generation-prompt-tmpl.md` | Usado no Step 4 |
| `tasks/ds-build-component.md` | Downstream: consome o prompt enhanced |
| `tasks/ds-compose-molecule.md` | Downstream: consome o prompt enhanced |
| `tasks/ds-generate-stitch-design-md.md` | Sugerido se DS nao existe |

## Related Checklists

- `squads/design/checklists/brief-validation-checklist.md`
- `squads/design/checklists/design-handoff-checklist.md`

## Metadata

- **Author:** Design Chief
- **Created:** 2026-03-20
- **Tags:** prompt-engineering, enhancement, stitch, consistency

## SINKRA Contract

Domain: Tactical
atomic_layer: Atom
executor: design-chief
Input:
- project_context
- design_system_context
Output:
- ds_enhance_prompt_artifact
pre_condition:
- escopo do artefato e caminho alvo definidos
post_condition:
- artefato pronto para handoff e revisão
performance:
- produzir saída auditável com critérios explícitos
Completion Criteria:
- artefato principal gerado
- recomendações ou estrutura documentadas
- pronto para próximo gate
