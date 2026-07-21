---
paths:
  - "apps/**"
  - "workspace/shared-products/**"
  - "workspace/businesses/**/L2-tactical/design/**"
  - "workspace/businesses/**/L4-operational/campaigns/**"
  - "squads/design-ops/**"
  - "squads/**/scripts/**/*tailwind*"
  - "**/DESIGN.md"
---

# Tailwind v4 Consumption Rules for DESIGN.md

## Rule

Quando uma implementação Tailwind v4 consumir saídas do `/design-md`, trate o extractor como camada de evidência e a geração Tailwind como camada downstream. O extractor não deve inventar classes, HTML final, screenshots ou fallbacks visuais.

Use a prioridade abaixo:

1. `render-contract.json` para modo de tema, propriedades renderizáveis e avisos.
2. `tokens.json.preview_tokens` para valores concretos usados em preview.
3. `tokens-extended.json` para estados, sombras, movimento, espaçamento, dark slots e layout hints.
4. `inputs/component-properties.json`, `inputs/motion.json`, `inputs/font-faces.json`, `inputs/token-usage-graph.json` e `inputs/css-collected.css` para evidência bruta.
5. `DESIGN.md` para intenção, Do/Don't, prompt guide e contexto humano.

## Tailwind v4 Constraints

- Emita valores literais em `@theme`. Não use cadeias de alias com `var()` dentro do bloco `@theme` quando o alvo for Tailwind v4 Browser CDN ou geração estática simples.
- Preserve vírgulas dentro de arbitrary values: `linear-gradient(...)`, `rgba(...)`, `box-shadow` e listas de fontes não podem ser tokenizadas por split ingênuo.
- Use underscores apenas onde a sintaxe de arbitrary value do Tailwind espera espaços escapados. Não substitua vírgulas por underscores.
- Evite `@apply` para classes de componente que dependem de tokens customizados do `@theme` em Browser CDN. Prefira CSS escopado, explícito e pequeno.
- Reponha resets de preflight deliberadamente: headings, listas, margens de conteúdo, botões, inputs e `textarea`.
- Use seletores base com `:where()` para prose e elementos globais escopados; isso reduz briga de especificidade com utilitários.
- Quando um componente herdou `border` shorthand do pai, sobrescreva o shorthand completo no filho se precisar mudar cor, largura ou estilo. Não confie só em `border-color`.
- Não use cores, sombras, fontes ou raios fora de `DESIGN.md`, `tokens.json`, `tokens-extended.json` ou sidecars extraídos.

## Browser CDN Path

Tailwind Browser CDN é aceitável apenas para previews, protótipos e artefatos HTML autônomos. Para produção, prefira CSS Tailwind pré-compilado ou CSS manual explícito com tokens.

Se usar Browser CDN:

- Declare o menor `@theme` possível com valores finais.
- Coloque componentes complexos em CSS escopado sob um root previsível, por exemplo `.design-preview`.
- Não dependa de plugins, content scan, safelist dinâmica ou `@apply` avançado.
- Valide o HTML renderizado em desktop e mobile antes de promover como gold standard.

## Regression Checks

Antes de aceitar um gerador Tailwind downstream como consumidor de `/design-md`, valide pelo menos:

- `@theme` sem `var()` alias chain.
- Gradientes e sombras mantêm vírgulas.
- Headings, listas e form controls têm estilo visível após preflight.
- Tema claro/escuro respeita `inputs/theme-default.json` e `render-contract.json`.
- Valores ausentes continuam ausentes ou viram decisão explícita da camada downstream, nunca fallback gravado no extractor.

## Related

- Extractor canônico: `squads/design-ops/scripts/extract-from-url/`
- Task: `squads/design-ops/tasks/extract-design-md-from-url.md`
- Origem operacional: `outputs/sinkra-squad/transform-html-tailwind-gold-standard/handoff-downstream.yaml`
