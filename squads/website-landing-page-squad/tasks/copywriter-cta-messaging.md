# Task: Call-to-Action e Messaging

**ID:** copywriter-cta-messaging
**Responsável:** copywriter
**Complexidade:** Média
**Duração Estimada:** 1-2 dias

## Descrição

Desenvolver estratégia completa de Call-to-Action (CTAs) e messaging com variações para teste. Inclui botões principais, secondary CTAs, urgency messaging e copywriting persuasivo específico.

## Entrada (Inputs)

- Mapa de conversão (architect-mapa-conversao)
- Copy principal (copywriter-copy-principal)
- Estratégia de landing page (architect-estrategia-landing)
- Objetivos de conversão

## Saída (Outputs)

- `cta-strategy.md` - Estratégia completa de CTAs
- `cta-variations.json` - Variações de CTA para teste A/B
- `urgency-messaging.json` - Mensagens de urgência por seção
- `cta-copy-spec.json` - Especificação de copy para cada CTA

## Checklist de Execução

- [ ] Mapear todas as posições de CTA conforme mapa de conversão
- [ ] Escrever CTA primário (main conversion goal)
- [ ] Criar CTAs secundários (alt paths)
- [ ] Desenvolver 3-5 variações de CTA principal para teste
- [ ] Escrever urgency messaging (limited time, scarcity, etc.)
- [ ] Criar FOMO messaging onde apropriado
- [ ] Escrever copy de confirmação/reassurance
- [ ] Desenvolver objection-handling CTAs
- [ ] Especificar microcopy (helper text, tooltips)
- [ ] Documentar ações esperadas após CTA click
- [ ] Validar alinhamento com fluxo de conversão
- [ ] Preparar para implementação técnica

## Critérios de Aceitação

- CTA principal claro e compelling
- Mínimo 3 variações para teste A/B
- Urgency messaging apropriado sem exagero
- CTAs secundários bem posicionados
- Copy segue tom de voz da marca
- Ações pós-CTA documentadas
- Pronto para implementação
- Validado com stakeholders

## Dependências

- copywriter-copy-principal.md (MUST COMPLETE)
- architect-mapa-conversao.md (RECOMMENDED)

## Saída para

- copywriter-microcopy.md
- frontend-implementar-design.md
- qa-analise-conversao.md
- backend-lead-capture.md
