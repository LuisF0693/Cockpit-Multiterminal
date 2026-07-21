# Task: Microcopy e Mensagens Contextais

**ID:** copywriter-microcopy
**Responsável:** copywriter
**Complexidade:** Média
**Duração Estimada:** 1 dia

## Descrição

Desenvolver microcopy (pequenos textos contextuais) para toda a landing page. Inclui labels de formulários, textos de ajuda, mensagens de erro, tooltips e copy de confirmação.

## Entrada (Inputs)

- Copy principal (copywriter-copy-principal)
- CTA messaging (copywriter-cta-messaging)
- Arquitetura da landing page (architect-estrutura-site)
- Design system

## Saída (Outputs)

- `microcopy.json` - Dicionário estruturado de microcopy
- `form-copy.md` - Copy específica de formulários
- `error-messages.json` - Mensagens de erro amigáveis
- `microcopy-spec.md` - Especificação técnica

## Checklist de Execução

- [ ] Mapear todos os campos de formulário
- [ ] Escrever labels claros e acionáveis
- [ ] Criar placeholder text útil
- [ ] Escrever textos de ajuda (hint text)
- [ ] Criar mensagens de validação/erro amigáveis
- [ ] Desenvolver mensagens de sucesso
- [ ] Escrever tooltips para elementos complexos
- [ ] Criar copy de confirmação antes de submissão
- [ ] Escrever copy de follow-up (email confirmation, etc.)
- [ ] Adicionar reassurance messages onde apropriado
- [ ] Estruturar em formato JSON para implementação
- [ ] Revisar para consistência de tom

## Critérios de Aceitação

- Microcopy completa para todos os campos de formulário
- Mensagens de erro descritivas e helpful
- JSON estruturado e pronto para implementação
- Consistência de tom com resto do copy
- Labels claros (não abreviados)
- Mensagens de sucesso motivacionais
- Nenhuma jargão ou linguagem técnica

## Dependências

- copywriter-copy-principal.md (MUST COMPLETE)
- copywriter-cta-messaging.md (MUST COMPLETE)

## Saída para

- frontend-implementar-design.md
- backend-lead-capture.md
- qa-testes-funcionalidade.md
