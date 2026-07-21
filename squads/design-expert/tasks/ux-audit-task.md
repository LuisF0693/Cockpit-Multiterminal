---
task:
  name: UX Audit Task
  id: ux-audit-task
  description: "Auditoria completa de UX usando heurísticas de Nielsen-Norman e princípios de Don Norman"
  squad: design-expert
  lead_agent: don-norman
  supporting_agents: [dieter-rams, jony-ive]
  outputs:
    - ux-audit-report.md
  elicit: true
---

# UX Audit Task

Auditoria sistemática de usabilidade e experiência do usuário para web pages, landing pages e interfaces digitais.

---

## Inputs Necessários

Antes de iniciar, o **Don Norman** solicita:

1. **URL ou screenshots** da interface a auditar
2. **Objetivo principal** da página/produto (o que o usuário deve fazer?)
3. **Público-alvo** (quem são os usuários?)
4. **Métricas atuais** (se disponíveis: taxa de conversão, bounce rate, tempo na página)
5. **Contexto de negócio** (qual o problema que queremos resolver?)

---

## Fase 1 — Don Norman: Análise Heurística

**Avalia as 10 heurísticas de Nielsen-Norman** para cada tela/seção:

### Checklist de Auditoria

Para cada heurística, registra: ✅ Atende / ⚠️ Parcialmente / ❌ Falha / N/A

```
[ ] 1. Visibilidade do status do sistema
    - O usuário sabe onde está? O que está acontecendo?
    - Loading states claros? Progresso visível?

[ ] 2. Correspondência com o mundo real
    - Linguagem familiar ao usuário? Ícones óbvios?
    - Metáforas visuais fazem sentido?

[ ] 3. Controle e liberdade do usuário
    - É possível desfazer ações? Há saída clara?
    - O usuário não fica "preso"?

[ ] 4. Consistência e padrões
    - Mesmos elementos têm mesmo comportamento?
    - Segue convenções da plataforma (web, mobile)?

[ ] 5. Prevenção de erros
    - O design evita que erros aconteçam?
    - Confirmações para ações destrutivas?

[ ] 6. Reconhecimento em vez de memorização
    - Opções visíveis sem precisar memorizar?
    - Contexto sempre disponível?

[ ] 7. Flexibilidade e eficiência
    - Atalhos para usuários experientes?
    - Personalização disponível?

[ ] 8. Design estético e minimalista
    - Informações irrelevantes removidas?
    - Cada elemento tem propósito?

[ ] 9. Ajuda a reconhecer e corrigir erros
    - Mensagens de erro claras e orientadas à solução?
    - Linguagem humana, não código de erro?

[ ] 10. Ajuda e documentação
     - Suporte disponível quando necessário?
     - FAQ ou onboarding para novos usuários?
```

---

## Fase 2 — Don Norman: Mapeamento de Fricção

**Identifica pontos de dor na jornada do usuário:**

```
JORNADA: [Entrada] → [Descoberta] → [Avaliação] → [Decisão] → [Ação] → [Resultado]

Para cada etapa:
- O que o usuário tenta fazer?
- O que o design faz em resposta?
- Onde está a fricção? (0-5 pontos)
- Qual é a causa raiz?
- Qual é a solução recomendada?
```

---

## Fase 3 — Jony Ive: Auditoria de Interação

**Avalia estados e feedback de interação:**

```
[ ] Todos os elementos interativos têm hover state?
[ ] Focus rings visíveis para navegação por teclado?
[ ] Active/press states presentes em botões e links?
[ ] Loading states para operações assíncronas?
[ ] Success/error feedback após ações do usuário?
[ ] Transições entre estados são suaves (não instantâneas)?
[ ] Tempo de resposta percebido é ≤ 100ms para feedback?
[ ] Animações têm propósito funcional (não apenas decorativas)?
[ ] prefers-reduced-motion implementado?
[ ] Touch targets ≥ 44px em mobile?
```

---

## Fase 4 — Dieter Rams: Quality Gate

**Score final por princípios de bom design:**

```
Princípio                    | Score | Problema Identificado
-----------------------------|-------|----------------------
Útil — resolve problema real |  /10  |
Compreensível de imediato    |  /10  |
Discreto — não se intromete  |  /10  |
Mínimo necessário            |  /10  |
Consistente em detalhes      |  /10  |
MÉDIA                        |  /10  |
```

---

## Output: Relatório de Auditoria UX

```markdown
# UX Audit Report — [Nome da Interface]
Data: [data]
Auditado por: Squad Design Expert (Don Norman, Jony Ive, Dieter Rams)

## Score Geral
Heurísticas Nielsen-Norman: X/10
Qualidade de Interação: X/10
Princípios Rams: X/10
**Score Composto: X/10**

## Veredicto
[APROVADO ✅ / PRECISA MELHORAR ⚠️ / REDESIGN NECESSÁRIO ❌]

## Problemas Críticos (bloqueadores)
1. [Problema] — [Heurística violada] — [Solução específica]

## Problemas Importantes
1. [Problema] — [Impacto estimado] — [Solução recomendada]

## Oportunidades de Melhoria
1. [Oportunidade] — [Benefício esperado]

## Próximos Passos Recomendados
1. [Ação imediata]
2. [Ação de médio prazo]
3. [Ação de longo prazo]
```
