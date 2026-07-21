---
task:
  name: Design Review Task
  id: design-review-task
  description: "Revisão crítica de design existente pelo squad completo com score, veredicto e plano de ação"
  squad: design-expert
  lead_agent: dieter-rams
  supporting_agents: [don-norman, jessica-walsh, josef-muller-brockmann, jony-ive, joanna-wiebe]
  outputs:
    - design-review-report.md
  elicit: true
---

# Design Review Task

Revisão crítica estruturada de qualquer design existente — desde wireframes até interfaces em produção.

---

## Quando usar esta task

- Antes de lançar uma nova feature ou página
- Quando a conversão está abaixo do esperado
- Para auditar interfaces herdadas ou legadas
- Como quality gate antes de desenvolvimento
- Para validar redesigns antes de aprovação final

---

## Inputs Necessários

1. **O design a revisar** (URL, screenshots, Figma link, ou descrição)
2. **Objetivo do design** (o que o usuário deve fazer?)
3. **Contexto** (landing page, app, componente, email?)
4. **Métricas atuais** (se disponíveis)
5. **Dúvidas específicas** (há algo que o time já sabe que está errado?)

---

## Fase 1 — Dieter Rams: Avaliação de Qualidade Global

**Score nos 10 princípios do bom design** (cada um: 0-10):

```
1. Inovador com propósito:     /10
2. Útil — serve à função:      /10
3. Estético com integridade:   /10
4. Compreensível imediatamente:/10
5. Discreto — não se intromete:/10
6. Honesto — não engana:       /10
7. Duradouro — sem modas:      /10
8. Consistente em detalhes:    /10
9. Econômico em atenção:       /10
10. Mínimo necessário:          /10

SCORE PONDERADO: /10
```

**Penalidades automáticas identificadas:**
- [ ] Animações puramente decorativas
- [ ] Elementos sem função clara
- [ ] Inconsistência tipográfica
- [ ] CTAs genéricos
- [ ] Modais com >3 ações simultâneas

---

## Fase 2 — Don Norman: Auditoria de Usabilidade

**10 heurísticas de Nielsen-Norman** (✅/⚠️/❌):

```
1. Visibilidade do status: [ ]
2. Correspondência real: [ ]
3. Controle e liberdade: [ ]
4. Consistência: [ ]
5. Prevenção de erros: [ ]
6. Reconhecimento: [ ]
7. Flexibilidade: [ ]
8. Minimalismo: [ ]
9. Ajuda em erros: [ ]
10. Documentação: [ ]
```

**Pontos de fricção na jornada:**
- Onde o usuário trava?
- O que causa abandono?
- Qual é a causa raiz?

---

## Fase 3 — Joanna Wiebe: Auditoria de Copy

**Avaliação do conteúdo textual:**

```
[ ] Headline comunica resultado, não feature?
[ ] Subheadline específica (quem + como)?
[ ] CTA não é genérico ("Saiba Mais", "Clique Aqui")?
[ ] Linguagem é do usuário (não do produto)?
[ ] Proposta de valor clara em 3 segundos?
[ ] Objeções principais endereçadas?
[ ] Prova social presente e específica?
[ ] Urgência/escassez honesta (se aplicável)?
[ ] Meta title < 60 chars + keyword?
[ ] Meta description convida ao clique?

COPY SCORE: /10
```

**Problemas identificados no copy:**
1. [Problema] → [Sugestão de melhoria]

---

## Fase 4 — Josef Müller-Brockmann: Auditoria Tipográfica e de Grid

**Checklist de tipografia:**

```
[ ] Body copy ≥ 16px?
[ ] Line-height entre 1.5 e 1.75 no corpo?
[ ] Linha de texto: 60-80 caracteres?
[ ] Máximo 2 famílias tipográficas?
[ ] Contraste mínimo 4.5:1 (WCAG AA)?
[ ] Hierarquia clara (H1 > H2 > H3 > body)?
[ ] Ritmo vertical consistente (múltiplos de 4 ou 8px)?
[ ] Grid consistente entre seções?
[ ] Responsividade: tipografia escala nos breakpoints?
[ ] Números em tabelas usam tabular figures?

TIPO SCORE: /10
```

---

## Fase 5 — Jessica Walsh: Auditoria Visual

**Sistema Visual de Avaliação (SVA):**

```
Dimensão 1 — CLAREZA (0-10)
  Em 3 segundos, o usuário sabe o que a página oferece?
  Score: /10 — Observação:

Dimensão 2 — HIERARQUIA (0-10)
  O olho flui naturalmente pelo conteúdo?
  Score: /10 — Observação:

Dimensão 3 — DISTINÇÃO (0-10)
  O design se diferencia dos concorrentes?
  Score: /10 — Observação:

Dimensão 4 — EMOÇÃO (0-10)
  O visual provoca a emoção desejada?
  Score: /10 — Observação:

Dimensão 5 — CONVERSÃO (0-10)
  O CTA é visualmente irresistível?
  Score: /10 — Observação:

SVA MÉDIO: /10
```

---

## Fase 6 — Jony Ive: Auditoria de Interação

**Checklist de interação:**

```
[ ] Todos os interativos têm hover state?
[ ] Focus rings visíveis (acessibilidade)?
[ ] Active/press states presentes?
[ ] Loading states para async?
[ ] Feedback após ações do usuário?
[ ] Transições suaves (não instantâneas)?
[ ] Tempo de resposta percebido ≤ 100ms?
[ ] Animações têm propósito funcional?
[ ] prefers-reduced-motion implementado?
[ ] Touch targets ≥ 44px no mobile?

INTERAÇÃO SCORE: /10
```

---

## Veredicto Final

### Cálculo do Score Composto

| Dimensão | Peso | Score | Ponderado |
|----------|------|-------|-----------|
| Qualidade Geral (Rams) | 25% | /10 | |
| Usabilidade (Norman) | 25% | /10 | |
| Copy (Wiebe) | 20% | /10 | |
| Visual (Walsh) | 15% | /10 | |
| Tipografia (Josef) | 10% | /10 | |
| Interação (Jony) | 5% | /10 | |
| **SCORE FINAL** | 100% | **/10** | |

### Critério de Decisão

```
≥ 8.0 → APROVADO ✅ — Pode avançar
6.0-7.9 → MELHORIAS NECESSÁRIAS ⚠️ — Lista de correções obrigatórias
< 6.0 → REDESIGN NECESSÁRIO ❌ — Não pode avançar sem revisão profunda
```

---

## Output: Design Review Report

```markdown
# Design Review Report — [Nome da Interface]
**Data:** [data]
**Squad:** Design Expert (Dieter Rams, Don Norman, Joanna Wiebe, Josef M-B, Jessica Walsh, Jony Ive)

## Score Final: X.X/10 — [VEREDICTO]

## Resumo Executivo
[2-3 parágrafos com os principais achados]

## Problemas Críticos (bloqueadores — devem ser corrigidos antes de qualquer avanço)
1. [Problema] — [Agente que identificou] — [Solução]

## Problemas Importantes (devem ser corrigidos no próximo sprint)
1. [Problema] — [Impacto] — [Solução]

## Melhorias Recomendadas (backlog de refinamento)
1. [Melhoria] — [Benefício esperado]

## Plano de Ação
| Prioridade | Ação | Responsável | Prazo |
|-----------|------|-------------|-------|
| P0 | ... | @jessica-walsh | imediato |
| P1 | ... | @joanna-wiebe | próximo sprint |
| P2 | ... | @josef | refinamento |

## Scores por Dimensão
[Tabela completa com todos os scores]
```
