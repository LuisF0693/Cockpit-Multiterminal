# Design Generation Prompt Template

> Template padrao para formatar prompts de geracao de UI/componentes.
> Todas as tasks de geracao devem popular este template antes de enviar ao agente executor.
>
> Baseado em: google-labs-code/stitch-skills (enhance-prompt + text-to-design)
> Epic: epic-stitch-design-intelligence (Story 2)
> Version: 1.0.0

## Instrucoes de Uso

1. O agente que recebe um pedido de geracao DEVE popular este template antes de executar
2. Carregar o DS ativo via `*show-context` ou config para preencher o bloco DESIGN SYSTEM
3. Consultar `data/design-mappings.yaml` para traduzir termos vagos
4. O template preenchido e o prompt final enviado ao modelo

## Template

```markdown
{{vibe_line}}

**DESIGN SYSTEM (REQUIRED):**
- Platform: {{platform}}
- Theme: {{theme_description}}
- Background: {{bg_name}} ({{bg_hex}}) {{bg_role}}
- Surface: {{surface_name}} ({{surface_hex}}) for {{surface_role}}
- Primary Accent: {{accent_name}} ({{accent_hex}}) for {{accent_role}}
- Text Primary: {{text_primary_name}} ({{text_primary_hex}})
- Text Secondary: {{text_secondary_name}} ({{text_secondary_hex}})
- Typography: {{font_display}} for headlines, {{font_body}} for body, {{font_mono}} for labels/metadata
- Roundness: {{roundness_description}}
- Elevation: {{depth_description}}
- Borders: {{border_description}}

**PAGE STRUCTURE:**
1. **{{section_1_name}}:** {{section_1_description}}
2. **{{section_2_name}}:** {{section_2_description}}
3. **{{section_3_name}}:** {{section_3_description}}
4. **{{section_4_name}}:** {{section_4_description}}
{{additional_sections}}

**COMPONENT CONSTRAINTS (if applicable):**
{{component_constraints}}

**STATES REQUIRED:**
- Default, Hover, Focus-visible, Disabled
{{additional_states}}
```

## Placeholder Reference

| Placeholder | Tipo | Origem | Obrigatorio |
|-------------|------|--------|-------------|
| `vibe_line` | string | 1 frase descrevendo mood/purpose. Consultar `design-mappings.yaml > atmosphere` | Sim |
| `platform` | enum | "Web, Desktop-first" ou "Web, Mobile-first" ou "Mobile native" | Sim |
| `theme_description` | string | Adjetivos de atmosfera. Consultar `design-mappings.yaml > atmosphere` | Sim |
| `bg_name` | string | Nome descritivo da cor de fundo. Ex: "Void Dark" | Sim |
| `bg_hex` | string | Hex da cor de fundo. Ex: "#131313" | Sim |
| `bg_role` | string | Funcao. Ex: "primary canvas" | Nao |
| `surface_name` | string | Nome descritivo da cor de surface. Ex: "Charcoal Surface" | Sim |
| `surface_hex` | string | Hex. Ex: "#1b1b1b" | Sim |
| `surface_role` | string | Ex: "card backgrounds" | Sim |
| `accent_name` | string | Nome descritivo da cor accent. Ex: "Electric Blue" ou "Emerald" | Sim |
| `accent_hex` | string | Hex da cor accent da brand. Ex: "#3B82F6" ou "#22C55E" | Sim |
| `accent_role` | string | Ex: "primary actions and active states" | Sim |
| `text_primary_name` | string | Ex: "Warm White" | Sim |
| `text_primary_hex` | string | Ex: "#ffffff" | Sim |
| `text_secondary_name` | string | Ex: "Muted Silver" | Sim |
| `text_secondary_hex` | string | Ex: "#c8c6c5" ou "rgba(244,244,244,0.52)" | Sim |
| `font_display` | string | Ex: "Tasa Orbiter 800" ou "Space Grotesk 700" | Sim |
| `font_body` | string | Ex: "Geist 400" ou "Manrope 400" | Sim |
| `font_mono` | string | Ex: "Geist Mono 500" ou "IBM Plex Mono 500" | Sim |
| `roundness_description` | string | Consultar `design-mappings.yaml > geometry > border_radius`. Ex: "Sharp, squared-off edges (0px globally)" | Sim |
| `depth_description` | string | Consultar `design-mappings.yaml > depth`. Ex: "Tonal layering only, no shadows" | Sim |
| `border_description` | string | Ex: "Ghost borders at 15% opacity maximum" | Nao |
| `section_N_name` | string | Ex: "Header", "Hero Section", "Content Area", "Footer" | Sim (min 3) |
| `section_N_description` | string | Descricao do conteudo da secao | Sim |
| `additional_sections` | string | Secoes extras alem das 4 padrao | Nao |
| `component_constraints` | string | Regras especificas de componentes. Ex: "Cards must be open-ended (no border on all 4 sides)" | Nao |
| `additional_states` | string | Estados extras. Ex: "Active, Selected, Error, Loading" | Nao |

## Exemplos Preenchidos

### Exemplo 1: Landing Page Brutalista

```markdown
A precision-engineered landing page that feels like a high-end command center, with asymmetric layout, data-dense hero section, and neon accent against void-dark surfaces.

**DESIGN SYSTEM (REQUIRED):**
- Platform: Web, Desktop-first
- Theme: Raw, high-density, brutalist, command-center precision
- Background: Void Dark (#131313) primary canvas
- Surface: Charcoal Surface (#1b1b1b) for section backgrounds
- Primary Accent: {accent_name} ({accent_hex}) for primary actions and critical status
- Text Primary: Warm White (#ffffff)
- Text Secondary: Muted Silver (#c8c6c5)
- Typography: Tasa Orbiter 800 for headlines, Geist 400 for body, Geist Mono 500 for labels/metadata
- Roundness: Sharp, squared-off edges (0px globally)
- Elevation: Tonal layering only, no shadows. Depth via surface token shifts.
- Borders: Ghost borders at 15% opacity maximum. No solid borders for sectioning.

**PAGE STRUCTURE:**
1. **Header:** Sticky navigation bar with logo left, sparse menu items right, ghost border bottom
2. **Hero Section:** Asymmetric two-column: headline left (Tasa Orbiter display), data metrics right (KPI cards with Geist Mono)
3. **Features Grid:** 3-column card grid, open-ended cards with left ruling line, surface-container-low backgrounds
4. **Social Proof:** Testimonial strip with monospace attribution and accent highlight
5. **CTA Section:** Full-width dark section with centered headline and gradient primary button
6. **Footer:** Minimal, monospace links, ghost border top

**COMPONENT CONSTRAINTS:**
- Cards must be open-ended (no border on all 4 sides). Use left ruling line only.
- Buttons: 0px radius, Geist Mono uppercase text
- Dead space around accent elements is mandatory

**STATES REQUIRED:**
- Default, Hover, Focus-visible, Disabled
```

### Exemplo 2: Dashboard Card (componente unico)

```markdown
A data-dense KPI card for a premium dashboard, designed for high-information-density display.

**DESIGN SYSTEM (REQUIRED):**
- Platform: Web, Desktop-first
- Theme: Premium, dark, data-first
- Background: Deep Surface (#151517) for card
- Surface: Panel Background (#18181B) for inner sections
- Primary Accent: {accent_name} ({accent_hex}) for highlights and trend indicators
- Text Primary: Cream White (#F4F4F4)
- Text Secondary: Dim Text (rgba(244,244,244,0.52))
- Typography: Space Grotesk 800 for values, Manrope 400 for body, IBM Plex Mono 500 for labels
- Roundness: Slightly softened corners (4px)
- Elevation: Whisper-soft shadow on hover only
- Borders: Subtle border at 9% white opacity

**PAGE STRUCTURE:**
1. **Label:** Monospace uppercase label (0.55rem, tracking wide, dim color)
2. **Value:** Large display number (2rem, bold, primary text)
3. **Trend:** Inline trend indicator with direction arrow and percentage
4. **Sparkline:** Optional mini chart below value

**STATES REQUIRED:**
- Default, Hover (inset glow), Focus-within (accent left border), Loading (skeleton)
```

## Regras de Preenchimento

1. **Vibe line:** SEMPRE 1 frase. Nunca um paragrafo. Descrever mood + purpose.
2. **Cores:** SEMPRE no formato "Nome Descritivo (hex) for role". Nunca so hex.
3. **Tipografia:** SEMPRE incluir peso (400, 700, 800). Nunca so o nome da font.
4. **Roundness/Depth:** SEMPRE consultar `design-mappings.yaml`. Nunca inventar termos.
5. **Page Structure:** MINIMO 3 secoes. Cada secao com nome bold + descricao.
6. **Se o DS ativo nao tem algum token:** Usar valor do tema default ou perguntar ao usuario.

---

## Bloco de Negative Constraints (OBRIGATORIO)

Pesquisa mostra que constraints negativos sao mais eficazes que positivos para consistencia de design em LLMs (Gemini, Claude, GPT). SEMPRE incluir este bloco no prompt final.

```markdown
**CONSTRAINTS (MUST NOT):**
- NUNCA usar cores hardcoded (hex/rgb direto). SEMPRE var(--token).
- NUNCA usar inline styles. SEMPRE Tailwind classes ou CSS custom properties.
- NUNCA inventar tokens que nao existem no DESIGN SYSTEM acima.
- NUNCA omitir responsive. Mobile-first com breakpoints md: e lg:.
- NUNCA omitir estados (hover, focus-visible, disabled).
{{additional_negative_constraints}}
```

### Quando adicionar constraints extras

| Estetica | Constraint adicional |
|----------|---------------------|
| Brutalist | "NUNCA usar border-radius > 0px" |
| Brutalist | "NUNCA usar sombras. Profundidade via tonal layering APENAS" |
| Brutalist | "NUNCA usar borders solidos para separacao. Usar shift de background" |
| Editorial | "NUNCA centralizar todos os elementos. Usar assimetria intencional" |
| Brandbook | "NUNCA usar cores fora do namespace bb-*" |
| Premium | "NUNCA usar mais de 2 cores accent" |

---

## Bloco de Few-Shot Examples (RECOMENDADO)

Pesquisa Google (2026) confirma: 2-3 few-shot examples superam instrucoes textuais longas para consistencia. RECOMENDADO incluir 1-2 exemplos de componentes existentes no prompt.

### Formato de few-shot

```markdown
**REFERENCE COMPONENTS (match this pattern):**

Example 1 - {{component_name}}:
```tsx
{{component_code_snippet}}
```

Example 2 - {{component_name}}:
```tsx
{{component_code_snippet}}
```
```

### Regras para selecao de few-shot

1. Escolher componentes do MESMO nivel atomico que o pedido (atom para atom, molecule para molecule)
2. Escolher componentes do MESMO design system ativo
3. Maximo 2 exemplos (mais que 3 causa overfitting no Gemini)
4. Incluir pattern completo: imports, interface, component, export
5. Se nao existem componentes gerados ainda, usar os exemplos deste template

---

## Adaptacao para Plataformas Externas

### Google AI Studio / Gemini

Ao usar este template para gerar output no Gemini (AI Studio):

1. **System Instruction:** Colocar `<role>`, `<stack>`, `<constraints>` e `<design-tokens>` no campo System Instruction (delimitado com XML tags)
2. **Primeira mensagem:** Colar 2 few-shot examples como primeira mensagem do chat
3. **Prompt de pagina:** Usar o template preenchido + screenshot como segunda mensagem
4. **Uma pagina por conversa.** Re-colar system instruction a cada nova sessao
5. **Temperature:** Manter padrao (1.0 no Gemini 3). Nao reduzir

### Lovable / Bolt / v0

1. **Upload do projeto:** Se possivel, enviar ZIP do starter standalone
2. **Prompt unico:** Colar template preenchido + screenshot + constraints no mesmo prompt
3. **Iteracao:** Usar o bloco "Update Delicado" de `prompt-templates-library.md` para ajustes

### Claude Code / AIOX

1. **Automatico:** O pipeline `ds-enhance-prompt` preenche este template automaticamente
2. **Manual:** O agente @brad-frost ou @design-chief preenche antes de executar
3. **DS ativo:** Carregado via `*show-context` (design-chief) ou config.yaml (automatico)
