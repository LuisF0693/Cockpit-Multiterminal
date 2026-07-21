# Task: Otimizar Performance Frontend

**ID:** frontend-otimizar-performance
**Responsável:** frontend-developer
**Complexidade:** Média-Alta
**Duração Estimada:** 2-3 dias

## Descrição

Otimizar performance da landing page para velocidade máxima. Inclui otimização de imagens, code splitting, lazy loading, caching, minificação e otimização de bundle size.

## Entrada (Inputs)

- Landing page implementada (frontend-implementar-design)
- Design system
- Padrões de performance definidos

## Saída (Outputs)

- Performance audit report
- `performance-optimization.md` - Detalhes das otimizações
- Lighthouse scores >= 90
- Bundle size reduzido
- Core Web Vitals otimizados

## Checklist de Execução

- [ ] Executar Lighthouse audit inicial
- [ ] Otimizar imagens (WebP, AVIF, compressão)
- [ ] Implementar lazy loading de imagens
- [ ] Code splitting de componentes grandes
- [ ] Minificar CSS e JavaScript
- [ ] Remover dependências não utilizadas
- [ ] Implementar tree-shaking
- [ ] Configurar cache headers
- [ ] Implementar gzip/brotli compression
- [ ] Otimizar fonte web (subsetting, woff2)
- [ ] Remover render-blocking resources
- [ ] Implementar critical CSS inline
- [ ] Otimizar third-party scripts
- [ ] Implementar service worker (optional)
- [ ] Monitorar Core Web Vitals (LCP, FID, CLS)
- [ ] Executar Lighthouse audit final

## Critérios de Aceitação

- Lighthouse Performance score >= 90
- LCP <= 2.5s
- FID <= 100ms
- CLS <= 0.1
- Bundle size < 200KB (gzipped)
- Primeira página carrega < 2s em 4G
- Todas as imagens otimizadas
- Zero warnings críticos de performance
- Performance audit documentado

## Dependências

- frontend-implementar-design.md (MUST COMPLETE)

## Saída para

- qa-testes-funcionalidade.md
- qa-analise-conversao.md
