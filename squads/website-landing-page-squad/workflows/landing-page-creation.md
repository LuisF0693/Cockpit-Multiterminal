# Workflow: Landing Page Creation

**ID:** landing-page-creation
**Version:** 1.0
**Type:** Primary Development Workflow
**Squad:** website-landing-page-squad

## Overview

The primary workflow for creating high-performing landing pages from strategy through launch. Orchestrates all 9 agents across 28 tasks in a coordinated sequence.

## Stages

### Stage 1: Strategy & Planning (Parallel - Days 1-3)

**Agents:** website-architect, ux-researcher, storyteller

1. **architect-estrategia-landing** (website-architect)
   - Duration: 2-3 days
   - Outputs: Strategy document, objectives, personas, conversion funnel
   - Triggers: Stage 2 upon completion

2. **researcher-pesquisa-usuario** (ux-researcher) - *Parallel*
   - Duration: 2-3 days
   - Outputs: User research report, validated personas, insights
   - Triggers: Design phase feedback

3. **storyteller-narrativa-marca** (storyteller) - *Parallel*
   - Duration: 2 days
   - Outputs: Brand narrative, messaging framework
   - Triggers: Copy phase input

**Gate:** architect-estrategia-landing MUST complete before proceeding

---

### Stage 2: Architecture & Analysis (Parallel - Days 4-6)

**Agents:** website-architect, seo-specialist

1. **architect-estrutura-site** (website-architect)
   - Depends: architect-estrategia-landing
   - Duration: 1-2 days
   - Outputs: Architecture document, wireframes, components list
   - Triggers: Design and Frontend phases

2. **architect-mapa-conversao** (website-architect)
   - Depends: architect-estrategia-landing (recommended: architect-estrutura-site)
   - Duration: 1-2 days
   - Outputs: Detailed conversion map, CTA strategy, trust elements
   - Triggers: Copy and Design phases

3. **seo-keywords-research** (seo-specialist) - *Parallel*
   - Depends: architect-estrategia-landing
   - Duration: 2-3 days
   - Outputs: Keywords research, target keywords, mapping
   - Triggers: Copy and SEO optimization

**Gate:** architect-estrutura-site MUST complete before design phase

---

### Stage 3: Content & Design (Parallel - Days 7-13)

**Agents:** copywriter, ux-designer, storyteller, seo-specialist

**Branch 3A: Copywriting**
1. **copywriter-copy-principal** (copywriter)
   - Depends: architect-estrategia-landing, architect-mapa-conversao
   - Duration: 2-3 days
   - Outputs: Main copy, headlines, variations for A/B testing
   - Triggers: CTA and microcopy tasks

2. **copywriter-cta-messaging** (copywriter)
   - Depends: copywriter-copy-principal, architect-mapa-conversao
   - Duration: 1-2 days
   - Outputs: CTA strategy, variations, urgency messaging
   - Triggers: Frontend implementation

3. **copywriter-microcopy** (copywriter)
   - Depends: copywriter-copy-principal, copywriter-cta-messaging
   - Duration: 1 day
   - Outputs: Form labels, help text, error messages
   - Triggers: Frontend implementation

**Branch 3B: Design**
1. **designer-prototipo-desktop** (ux-designer)
   - Depends: architect-estrutura-site
   - Duration: 2-3 days
   - Outputs: Desktop prototypes, design specifications
   - Triggers: Design system, Frontend

2. **designer-prototipo-mobile** (ux-designer)
   - Depends: architect-estrutura-site (parallel to desktop)
   - Duration: 2-3 days
   - Outputs: Mobile prototypes, mobile specifications
   - Triggers: Design system, Frontend

3. **designer-design-system** (ux-designer)
   - Depends: designer-prototipo-desktop, designer-prototipo-mobile
   - Duration: 2 days
   - Outputs: Design system, tokens, component library
   - Triggers: Visual guide and Frontend

4. **designer-guia-visual** (ux-designer)
   - Depends: designer-design-system
   - Duration: 1-2 days
   - Outputs: Visual guide, component specs, responsive guide
   - Triggers: Frontend implementation

**Branch 3C: SEO & Storytelling**
1. **seo-otimizacao-on-page** (seo-specialist)
   - Depends: seo-keywords-research, copywriter-copy-principal
   - Duration: 2 days
   - Outputs: On-page optimization guide, content structure
   - Triggers: Meta tags, Frontend

2. **seo-meta-tags** (seo-specialist)
   - Depends: seo-otimizacao-on-page, seo-keywords-research
   - Duration: 1 day
   - Outputs: Meta tags, schema markup, OG tags
   - Triggers: Frontend implementation

3. **storyteller-conteudo-emocional** (storyteller)
   - Depends: storyteller-narrativa-marca
   - Duration: 2 days
   - Outputs: Testimonials, customer stories, impact content
   - Triggers: Frontend, Sequencing

4. **storyteller-sequencia-comunicacao** (storyteller)
   - Depends: storyteller-conteudo-emocional, copywriter-copy-principal
   - Duration: 2 days
   - Outputs: Email sequence, communication plan
   - Triggers: Backend email integration

**Gate:** All design tasks (3B) MUST complete before Frontend phase

---

### Stage 4: Backend Setup (Days 14-16)

**Agents:** backend-developer

1. **backend-setup-api** (backend-developer)
   - Duration: 1-2 days
   - Outputs: Server, database, API endpoints
   - Triggers: Lead capture and Email integration

2. **backend-lead-capture** (backend-developer)
   - Depends: backend-setup-api
   - Duration: 2 days
   - Outputs: Form endpoints, validation, lead storage
   - Triggers: Email integration, Testing

3. **backend-integracao-email** (backend-developer)
   - Depends: backend-lead-capture
   - Duration: 2 days
   - Outputs: Email system, confirmation emails, templates
   - Triggers: Testing phase

**Gate:** All backend tasks MUST complete before Frontend

---

### Stage 5: Frontend Implementation (Days 17-24)

**Agents:** frontend-developer

1. **frontend-setup-projeto** (frontend-developer)
   - Duration: 1 day
   - Outputs: Project structure, build configuration, dev environment
   - Triggers: Design implementation

2. **frontend-implementar-design** (frontend-developer)
   - Depends: designer-prototipo-desktop, designer-prototipo-mobile, designer-design-system, copywriter-copy-principal, copywriter-microcopy, seo-meta-tags, backend-setup-api
   - Duration: 5-7 days
   - Outputs: React components, styling, interactions, full landing page
   - Triggers: Performance optimization

3. **frontend-otimizar-performance** (frontend-developer)
   - Depends: frontend-implementar-design
   - Duration: 2-3 days
   - Outputs: Optimized page, performance report, Lighthouse scores
   - Triggers: Testing phase

**Gate:** All Frontend tasks MUST complete before Testing

---

### Stage 6: Testing & Validation (Days 25-30)

**Agents:** qa-analyst, ux-researcher

1. **qa-testes-funcionalidade** (qa-analyst)
   - Depends: frontend-implementar-design, backend-integracao-email
   - Duration: 2-3 days
   - Outputs: Test report, bug list, cross-browser validation
   - Triggers: Conversion analysis

2. **qa-analise-conversao** (qa-analyst)
   - Depends: frontend-implementar-design, qa-testes-funcionalidade
   - Duration: 2 days
   - Outputs: Conversion flow report, event tracking, funnel analysis
   - Triggers: Final report

3. **researcher-teste-usabilidade** (ux-researcher)
   - Depends: frontend-implementar-design (optional)
   - Duration: 3 days
   - Outputs: Usability report, SUS scores, recommendations
   - Triggers: Behavioral analysis, Optimization cycle

4. **researcher-analise-comportamento** (ux-researcher)
   - Depends: Landing page live + 2 weeks data
   - Duration: 2 days
   - Outputs: Behavior analysis, flow patterns, optimization recommendations
   - Triggers: Iterative optimization

5. **qa-relatorio-performance** (qa-analyst)
   - Depends: qa-testes-funcionalidade, qa-analise-conversao, frontend-otimizar-performance
   - Duration: 2 days
   - Outputs: Final report, QA sign-off, deployment checklist
   - Triggers: Deployment approval

**Gate:** qa-relatorio-performance MUST achieve sign-off before launch

---

## Parallel Execution Matrix

```
Stage 1: architect-estrategia-landing | researcher-pesquisa-usuario | storyteller-narrativa-marca
         ↓ (all parallel, architect gates next)
Stage 2: architect-estrutura-site | architect-mapa-conversao | seo-keywords-research
         ↓ (architect gates next)
Stage 3: copywriter-* | designer-* | seo-* | storyteller-* (all parallel within branches)
         ↓ (all design tasks gate next)
Stage 4: backend-setup-api → backend-lead-capture → backend-integracao-email
         ↓
Stage 5: frontend-setup-projeto → frontend-implementar-design → frontend-otimizar-performance
         ↓
Stage 6: qa-testes-funcionalidade | researcher-teste-usabilidade (parallel)
         → qa-analise-conversao (depends on qa-testes)
         → qa-relatorio-performance (final gate)
         → researcher-analise-comportamento (post-launch, 2 weeks data)
```

## Estimated Timeline

- **Total Duration:** 30-35 days (5 weeks)
- **Critical Path:** architect-estrategia → architect-estrutura → designer-prototypes → frontend-implementation → testing → deployment
- **Parallel Savings:** ~20 days through concurrent execution

## Handoff Points

1. **After Strategy:** architect-estrategia-landing → All downstream teams
2. **After Architecture:** architect-estrutura-site → Design and Frontend teams
3. **After Design:** designer-design-system → Frontend team (no unplanned changes)
4. **After Frontend:** frontend-otimizar-performance → QA team
5. **Before Launch:** qa-relatorio-performance → Client approval and DevOps

## Rollback/Escape Hatches

| Stage | Issue | Action |
|-------|-------|--------|
| Strategy | Misaligned on goals | Loop back to architect-estrategia |
| Design | Major discovery | Return to architect-estrutura (adjust wireframes) |
| Frontend | Performance issues | Additional frontend-otimizar-performance iteration |
| Testing | Critical bugs | Return to frontend or backend for fixes |
| Pre-Launch | QA failures | Iterate per feedback, re-run qa-relatorio-performance |

## Success Criteria

- All 28 tasks completed
- QA sign-off obtained (qa-relatorio-performance)
- Performance > 90 Lighthouse score
- Conversion funnel tested and validated
- All links and forms functional
- Responsividade verified (mobile, tablet, desktop)
- SEO metadata and schema implemented
- Email sequences ready for launch
- User research validated design decisions
- Client approval obtained

## Post-Launch (Continuous)

After Stage 6 completion and launch:

1. **researcher-analise-comportamento** starts (requires 2 weeks live data)
2. **optimization-cycle** workflow begins for iterative improvements
3. Daily monitoring of conversion metrics
4. Weekly email performance review
5. Monthly comprehensive performance analysis
