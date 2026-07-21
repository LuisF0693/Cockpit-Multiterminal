# LGPD Compliance Checklist

> Avaliacao de conformidade com a Lei Geral de Protecao de Dados (Lei 13.709/2018).
> Baseado em violacoes encontradas em 3 aplicacoes auditadas.

## Bases Legais (Art. 7)

- [ ] Cada processamento de dados tem base legal identificada
- [ ] Consentimento obtido quando necessario (Art. 7, I)
- [ ] Interesse legitimo documentado quando aplicavel (Art. 7, IX)

## Principios (Art. 6)

- [ ] **Finalidade (I)** — Dados usados apenas para fins declarados
- [ ] **Adequacao (II)** — Processamento compativel com finalidade
- [ ] **Necessidade (III)** — Coleta limitada ao minimo necessario
- [ ] **Livre acesso (IV)** — Titulares podem consultar seus dados
- [ ] **Qualidade (V)** — Dados exatos e atualizados
- [ ] **Transparencia (VI)** — Informacoes claras sobre o processamento
- [ ] **Seguranca (VII)** — Medidas tecnicas adequadas (RLS, encryption, auth)
- [ ] **Prevencao (VIII)** — Medidas preventivas contra danos
- [ ] **Nao discriminacao (IX)** — Dados nao usados para discriminacao
- [ ] **Responsabilidade (X)** — Demonstracao de conformidade

## Dados Sensiveis (Art. 11)

- [ ] Dados sensiveis identificados (saude, biometria, perfil psicometrico)
- [ ] Consentimento explicito para dados sensiveis
- [ ] Protecao reforçada (criptografia, acesso restrito)

## Direitos do Titular (Art. 18)

- [ ] Confirmacao de existencia de tratamento
- [ ] Acesso aos dados
- [ ] Correcao de dados incompletos
- [ ] Anonimizacao, bloqueio ou eliminacao
- [ ] Portabilidade
- [ ] Eliminacao de dados com consentimento
- [ ] Revogacao de consentimento

## Seguranca (Art. 46)

- [ ] RLS habilitado em todas as tabelas com PII
- [ ] Autenticacao robusta (rate limiting, MFA)
- [ ] Criptografia em transito (HTTPS/TLS)
- [ ] Logs de acesso a dados pessoais
- [ ] Controle de acesso baseado em roles

## Incidentes (Art. 48)

- [ ] Processo de notificacao ANPD definido
- [ ] SLA de notificacao: "prazo razoavel" (recomendado 72h)
- [ ] Template de notificacao preparado
- [ ] Responsavel por incidentes designado
