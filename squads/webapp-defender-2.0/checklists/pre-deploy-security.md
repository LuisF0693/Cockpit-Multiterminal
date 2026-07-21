# Pre-Deploy Security Gate Checklist

> Execute ANTES de cada deploy em producao.
> Bloqueia deploy se itens CRITICAL nao passarem.

## CRITICAL (bloqueiam deploy)

- [ ] **RLS habilitado** em TODAS as tabelas novas
- [ ] **Policies completas** (SELECT, INSERT, UPDATE, DELETE) em tabelas novas
- [ ] **Auth check** em TODAS as RPCs novas com SECURITY DEFINER
- [ ] **Sem secrets** no client-side code (grep por API keys, passwords)
- [ ] **Sem `USING(true)`** em tabelas com PII

## HIGH (devem ser resolvidos antes de deploy)

- [ ] **CORS** nao usa wildcard `*`
- [ ] **Security headers** presentes no vercel.json
- [ ] **CSP** nao contem `unsafe-eval`
- [ ] **Signup** configurado corretamente (invite-only ou restrito)
- [ ] **Rate limiting** configurado em auth endpoints

## MEDIUM (resolver em ate 1 semana pos-deploy)

- [ ] **PostgREST hints** desabilitados
- [ ] **OpenAPI schema** nao acessivel publicamente
- [ ] **Password policy** >= 12 caracteres
- [ ] **JWT expiry** <= 1 hora
- [ ] **Referrer-Policy** e **Permissions-Policy** configurados

## LOW (resolver em sprint seguinte)

- [ ] **Information disclosure headers** removidos
- [ ] **Source maps** desabilitados em producao
- [ ] **Preview deployments** protegidos
- [ ] **Audit logging** para operacoes sensiveis
