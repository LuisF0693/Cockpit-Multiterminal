---
task:
  name: Landing Page Design Task
  id: landing-page-design-task
  description: "Criação completa de landing page: estratégia UX, copy de conversão, design visual e sistema de interação"
  squad: design-expert
  lead_agent: don-norman
  supporting_agents: [joanna-wiebe, jessica-walsh, josef-muller-brockmann, jony-ive, dieter-rams]
  outputs:
    - landing-page-brief.md
    - landing-page-copy.md
    - landing-page-design-spec.md
  elicit: true
---

# Landing Page Design Task

Processo completo de criação de landing page de alta conversão, com todos os especialistas do squad trabalhando em sequência.

---

## Inputs Necessários

Antes de iniciar, coleta:

1. **Produto/serviço** que a landing page vende
2. **Público-alvo** (persona principal)
3. **Objetivo de conversão** (cadastro, compra, agendamento?)
4. **Proposta de valor principal** (o que diferencia?)
5. **Tom de comunicação** (formal/informal, B2B/B2C?)
6. **Referências visuais** (links ou descrição de estilos)
7. **Urgência/deadline** do projeto

---

## Fase 1 — Don Norman: Arquitetura de Informação

**Define a estrutura estratégica da landing page:**

### Hierarquia de Informação

```
[HERO]          → Captura atenção, comunica proposta de valor
[PROBLEMA]      → Agita a dor do usuário
[SOLUÇÃO]       → Apresenta o produto como resposta óbvia
[BENEFÍCIOS]    → Features → Vantagens → Resultados
[PROVA SOCIAL]  → Depoimentos, números, logos
[OFERTA]        → O que o usuário recebe exatamente
[GARANTIA]      → Reversão de risco
[CTA FINAL]     → Última chance de conversão
[FAQ]           → Remove objeções residuais
```

### Fluxo de Usuário

- Define de onde vêm os visitantes (anúncio, orgânico, email?)
- Mapeia o estado emocional ao chegar na página
- Traça o caminho mínimo até a conversão
- Identifica pontos de abandono possíveis

### Entrega: `landing-page-brief.md`

---

## Fase 2 — Joanna Wiebe: Copy de Conversão

**Escreve todo o conteúdo textual da landing page:**

### Deliverables de Copy

```
HERO SECTION:
  ├── Headline principal (fórmula: resultado + tempo + mesmo que objeção)
  ├── Subheadline (como entrega + para quem)
  ├── CTA principal (nunca genérico — "Eu quero ___")
  └── Prova social imediata ("Usado por X clientes")

PROBLEMA:
  ├── Descrição visceral da dor atual
  └── Validação empática ("Você já sentiu isso?")

SOLUÇÃO:
  ├── Apresentação do produto
  ├── Features → Benefícios → Resultados
  └── Diferencial competitivo

PROVA SOCIAL:
  ├── 3 depoimentos específicos com nome, empresa, resultado
  └── Números reais de impacto

CTA SECTIONS:
  ├── CTA primário (repetido 3x mínimo)
  └── CTA secundário (para indecisos)

FAQ:
  └── 8 objeções mais comuns respondidas

META:
  ├── Title tag (max 60 chars)
  └── Meta description (max 160 chars)
```

### Entrega: `landing-page-copy.md`

---

## Fase 3 — Josef Müller-Brockmann: Sistema Tipográfico e Grid

**Define a estrutura visual da página:**

### Grid System

```css
/* Grid da Landing Page */
:root {
  --lp-columns: 12;
  --lp-gutter: clamp(16px, 2.5vw, 32px);
  --lp-margin: clamp(24px, 5vw, 80px);
  --lp-max-width: 1280px;

  /* Breakpoints */
  --bp-mobile: 375px;
  --bp-tablet: 768px;
  --bp-desktop: 1280px;
}
```

### Escala Tipográfica

Seleciona e documenta:
- Família de fonte para display/headlines
- Família de fonte para body copy
- Escala modular completa (xs → 3xl)
- Espaçamento e ritmo vertical

---

## Fase 4 — Jessica Walsh: Design Visual

**Cria o design de alta fidelidade:**

### Moodboard (3 Direções)

Apresenta 3 direções visuais distintas antes do design final:

```
Direção A: [Nome] — [2 palavras que a definem]
  Paleta: [cores]
  Sensação: [emoção]
  Referência: [exemplo visual]

Direção B: [Nome] — [2 palavras que a definem]
  ...

Direção C: [Nome] — [2 palavras que a definem]
  ...
```

### Design Final (após aprovação de 1 direção)

```
1. Desktop (1440px) — seção a seção
2. Tablet (768px) — adaptações de layout
3. Mobile (375px) — redesign para vertical
4. States: hover, active, form validation
5. Dark mode (se aplicável)
```

---

## Fase 5 — Jony Ive: Sistema de Interação

**Define animações e microinterações:**

```
- Hero section: animação de entrada (fade + translate)
- Scroll behavior: parallax sutil, sticky nav
- Botões CTA: hover lift + press feedback
- Form fields: focus states, validation feedback
- Testimonials: carousel ou scroll horizontal
- FAQ accordion: expand/collapse animado
- Scroll progress: indicador de leitura (opcional)
```

---

## Fase 6 — Dieter Rams: Quality Gate Final

**Score final antes de aprovação:**

```
Critério de aprovação da landing page:
[ ] Proposta de valor clara em 3 segundos?
[ ] CTA visível acima do fold?
[ ] Design serve à conversão (não ao ego)?
[ ] Cada seção tem propósito claro?
[ ] Nada que distraia do objetivo principal?
[ ] Score Rams ≥ 7.5/10?

Veredicto: [APROVADO / PRECISA AJUSTES / REPROVADO]
```

---

## Output Final: Design Spec Completa

```markdown
# Landing Page Design Spec — [Nome do Produto]

## Arquitetura (Don Norman)
[Hierarquia de seções e fluxo de usuário]

## Copy (Joanna Wiebe)
[Conteúdo completo de cada seção]

## Tipografia & Grid (Josef)
[CSS variables e especificações]

## Design Visual (Jessica Walsh)
[Paleta, componentes, layouts por breakpoint]

## Interação (Jony Ive)
[Animações, estados, timing]

## Quality Gate (Dieter Rams)
Score: X/10 — [Veredicto]
```
