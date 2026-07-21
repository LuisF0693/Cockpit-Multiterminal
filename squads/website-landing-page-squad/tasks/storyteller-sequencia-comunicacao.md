# Task: Sequência de Comunicação

**ID:** storyteller-sequencia-comunicacao
**Responsável:** storyteller
**Complexidade:** Média
**Duração Estimada:** 2 dias

## Descrição

Desenvolver sequência de comunicação coordenada entre landing page, email e follow-up. Inclui progressão de mensagens, timing, e estratégia de reengagement.

## Entrada (Inputs)

- Narrativa da marca (storyteller-narrativa-marca)
- Conteúdo emocional (storyteller-conteudo-emocional)
- Copy principal e CTA (copywriter-copy-principal, copywriter-cta-messaging)
- Email integration (backend-integracao-email)

## Saída (Outputs)

- `communication-sequence.md` - Sequência completa
- `email-sequence.json` - Sequência de emails estruturada
- `messaging-progression.md` - Progressão de mensagens por estágio
- `touchpoint-map.md` - Mapa de touchpoints

## Checklist de Execução

- [ ] Mapear jornada do usuário (awareness → conversion → retention)
- [ ] Definir mensagens para cada estágio
- [ ] Criar email de boas-vindas pós-conversão
- [ ] Desenvolver sequência de follow-up (3-7 emails)
- [ ] Definir timing entre emails (1d, 3d, 7d, etc.)
- [ ] Criar call-to-action progressiva
- [ ] Desenvolver conteúdo de retargeting
- [ ] Criar mensagens de reengagement (win-back)
- [ ] Estruturar progressão de ofertas (se aplicável)
- [ ] Identificar gatilhos automáticos (behavior-triggered)
- [ ] Validar coerência de mensagens
- [ ] Testar legibilidade de emails
- [ ] Documentar variações por segmento
- [ ] Preparar scripts de follow-up humano
- [ ] Criar guia para executar sequência

## Critérios de Aceitação

- Sequência de 5-7 emails estruturada
- Progressão lógica de mensagens
- Timing apropriado entre touchpoints
- Mensagens coerentes com narrativa de marca
- Llamadas à ação claras em cada email
- Triggers automáticos definidos
- Pronto para implementação
- Documentação para execução manual/automática

## Dependências

- storyteller-narrativa-marca.md (MUST COMPLETE)
- storyteller-conteudo-emocional.md (RECOMMENDED)

## Saída para

- backend-integracao-email.md (implementation)
- qa-analise-conversao.md (email tracking)
