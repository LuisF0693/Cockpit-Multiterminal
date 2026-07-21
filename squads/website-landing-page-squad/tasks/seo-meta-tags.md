# Task: Meta Tags e Estrutura de Dados

**ID:** seo-meta-tags
**Responsável:** seo-specialist
**Complexidade:** Baixa-Média
**Duração Estimada:** 1 dia

## Descrição

Preparar e documentar all meta tags, schema markup e structured data para landing page. Inclui title, description, Open Graph tags, social sharing e JSON-LD schema.

## Entrada (Inputs)

- Otimização on-page (seo-otimizacao-on-page)
- Keywords pesquisadas (seo-keywords-research)
- Copy principal (copywriter-copy-principal)
- Brand guidelines

## Saída (Outputs)

- `meta-tags.json` - Todos os meta tags estruturados
- `schema-markup.json` - JSON-LD structured data
- `og-social-tags.json` - Open Graph e social meta tags
- `meta-tags-spec.md` - Especificação e documentação

## Checklist de Execução

- [ ] Criar meta title (50-60 chars, keyword + brand)
- [ ] Escrever meta description (150-160 chars, CTA incluído)
- [ ] Criar og:title para social sharing
- [ ] Escrever og:description para social sharing
- [ ] Definir og:image (1200x630px recomendado)
- [ ] Adicionar twitter:card tags
- [ ] Criar canonical tag (se necessário)
- [ ] Adicionar robots meta directives
- [ ] Criar viewport meta tag (mobile)
- [ ] Adicionar language meta tag
- [ ] Definir JSON-LD schema (Organization, LocalBusiness, etc.)
- [ ] Criar Product schema (se e-commerce)
- [ ] Adicionar Breadcrumb schema
- [ ] Documentar favicon e app icons
- [ ] Validar com ferramentas (Google Rich Results tester)

## Critérios de Aceitação

- Meta title otimizado com keywords
- Meta description completo e compelling
- Open Graph tags para social sharing
- Schema markup em JSON-LD format
- Validado com Google Rich Results Tool
- Sem warnings ou errors
- Documentação clara para implementação
- Pronto para deployment

## Dependências

- seo-otimizacao-on-page.md (MUST COMPLETE)
- seo-keywords-research.md (RECOMMENDED)

## Saída para

- frontend-implementar-design.md
- qa-testes-funcionalidade.md
