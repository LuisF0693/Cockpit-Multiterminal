# Design Ops Squad

**Version:** 1.0.0  
**Command:** `/DOPS`  
**Type:** Specialist Squad

## Overview

`design-ops` é o provider canônico do domínio de design no hub.

Ele nasce greenfield para absorver, aos poucos, o conteúdo provider-centric do
legado em `squads/design-system/`, sem herdar o roster inteiro nem continuar
tratando o diretório legado como destino final.

Escopo ativo:

- tokens, foundations e componentes-base
- acessibilidade e quality gates do provider
- registry, metadata e contratos machine-readable
- runtime técnico do `aiox-design-starter`
- roteamento do domínio via `design-chief`

Fora do escopo do provider:

- composição de páginas, que migra para `design-pages`
- especialização de superfícies de app, que migra para `design-app`
- evolução estrutural do legado `design-system`

## Agents

| Agent | Command | Specialty |
|---|---|---|
| Design Chief | `@design-chief` | Router único do provider, triage, sequencing e handoff |

## Legacy Source

`squads/design-system/` continua disponível apenas como `legacy_source`.

Mudanças permitidas lá:

- marcação de depreciação
- ponte mínima para continuidade operacional
- extração de conhecimento
- correção de integridade ou segurança

Mudanças que não devem mais acontecer lá:

- expansão do provider como se ele fosse o destino final
- limpeza estrutural como eixo principal do épico
- criação de novas lanes de `design-pages` ou `design-app`

## Next Squads

- `design-pages` nasce depois deste bootstrap, consumindo contratos do provider
- `design-app` nasce depois deste bootstrap, também como consumer greenfield

## Consumer Contract Policy

`design-pages` e `design-app` devem consumir contratos de design apenas via
`workspace/`:

- `workspace/businesses/{business}/L2-tactical/design/tokens.yaml`
- `workspace/businesses/{business}/L2-tactical/design/foundations.yaml`
- `workspace/businesses/{business}/L2-tactical/design/component-contracts.yaml`
- `workspace/businesses/{business}/L2-tactical/design/motion-primitives.yaml`

Não é permitido fallback para `legacy_source` como fonte canônica de consumo.
Storybook e Figma permanecem opcionais e nunca substituem os contratos do
workspace.

## Pipeline Mínimo (v0-like)

O `design-ops` agora possui um pipeline mínimo para reduzir variabilidade na
geração frontend sem depender de stack proprietária:

- `context-injector.cjs`: injeta contexto curado (workspace + referências DS)
- `autofix-deterministic.cjs`: aplica autofix determinístico pós-geração
- `run-minimal-pipeline.cjs`: orquestra contexto + autofix e salva relatório
- `resolve-workspace-contracts.cjs`: inspeciona resolução dos contratos canônicos no workspace
- `validate-workspace-contracts.cjs`: valida coerência dos contratos canônicos + catálogo core

Comandos:

```bash
node squads/design-ops/scripts/context-injector.cjs --business=aiox --format=markdown
node squads/design-ops/scripts/resolve-workspace-contracts.cjs --business=aiox --format=yaml
node squads/design-ops/scripts/validate-workspace-contracts.cjs --business=aiox --format=json --strict
node squads/design-ops/scripts/sync-design-manifest.cjs
node squads/design-ops/scripts/validate-design-manifest-drift.cjs
node squads/design-ops/scripts/generate-components-metadata.cjs --business=aiox
node squads/design-ops/scripts/validate-components-metadata.cjs
node squads/design-ops/scripts/validate-a11y-integration.cjs --business=aiox
node squads/design-ops/scripts/validate-checklists-gate.cjs --business=aiox
node squads/design-ops/scripts/validate-brandbook-contrast.cjs --ds-root=apps/aiox-brandbook/src/components/brandbook
node squads/design-ops/scripts/validate-motion-coverage.cjs --business=aiox
node squads/design-ops/scripts/validate-design-starter-matrix.cjs --source-app=apps/aiox-brandbook --starter-app=apps/aiox-design-starter
node squads/design-ops/scripts/build-token-pipeline.cjs --business=aiox
node squads/design-ops/scripts/validate-token-pipeline.cjs --business=aiox
node squads/design-ops/scripts/ast-patch.cjs --target=apps/aiox-design-starter/src/example.tsx --transform=rename-import --from-module=lucide-react --from-name=VercelLogo --to-name=Triangle # dry-run default
node squads/design-ops/scripts/autofix-deterministic.cjs --target=apps/aiox-design-starter/src --write
node squads/design-ops/scripts/run-minimal-pipeline.cjs --business=aiox --target=apps/aiox-design-starter/src --write
```

Task/Workflow canônico para extração brandbook -> workspace:

- Task: `squads/design-ops/tasks/dops-extract-brandbook-to-workspace-contracts.md`
- Workflow: `squads/design-ops/workflows/wf-brandbook-workspace-extraction.yaml`
- Workflow: `squads/design-ops/workflows/wf-style-dictionary-token-pipeline.yaml`

Pacote P1 migrado de `design-system` (adaptado para `workspace-first`):

- Task: `squads/design-ops/tasks/dops-context-contract.md`
- Workflow: `squads/design-ops/workflows/wf-dtcg-workspace-governance.yaml`
- Data: `squads/design-ops/data/quality-gates.yaml`
- Data: `squads/design-ops/data/token-registry.yaml`
- Data: `squads/design-ops/data/design-tokens-spec.yaml`

Pacote P2 migrado (checklists de A11y/Qualidade + gates de workflow):

- Checklist: `squads/design-ops/checklists/dops-accessibility-wcag-aa.yaml`
- Checklist: `squads/design-ops/checklists/dops-a11y-release-gate.yaml`
- Checklist: `squads/design-ops/checklists/dops-component-quality.yaml`

Pacote P3 migrado (YOLO):

- Runtime desacoplado para `design-ops`:
  - `squads/design-ops/scripts/runtime-paths.cjs`
  - `squads/design-ops/scripts/resolve-business-design-system.cjs`
  - `squads/design-ops/scripts/load-context.cjs`
- Governança de metadata/manifest:
  - `squads/design-ops/scripts/generate-components-metadata.cjs`
  - `squads/design-ops/scripts/validate-components-metadata.cjs`
  - `squads/design-ops/scripts/sync-design-manifest.cjs`
  - `squads/design-ops/scripts/validate-design-manifest-drift.cjs`
  - `squads/design-ops/workflows/wf-metadata-manifest-governance.yaml`
- Ops audit workspace-first:
  - `squads/design-ops/workflows/wf-ops-audit-workspace.yaml`
- Self-healing provider:
  - `squads/design-ops/workflows/wf-self-healing-provider.yaml`
- Motion coverage gate:
  - `squads/design-ops/data/motion-primitives-registry.yaml`
  - `squads/design-ops/scripts/validate-motion-coverage.cjs`

Pacote Wave 5 (pipeline gerativo provider):

- Script: `squads/design-ops/scripts/ast-patch.cjs`
- Workflow: `squads/design-ops/workflows/wf-generative-component-pipeline.yaml`
- Checklist: `squads/design-ops/checklists/dops-generative-pipeline-gate.yaml`

Pacote Wave B (external-prompt absorption — `agenmod/claw-design`, 2026-04-18):

- Rule: `squads/design-ops/rules/ai-trope-guardrails.md`
- Checklist: `squads/design-ops/checklists/dops-ai-trope-guardrails.yaml`
- Checklist enrich: `dops-component-quality.yaml` (+responsive_scaling, +ai_trope_compliance)
- Template: `squads/design-ops/templates/design-brief-intake-tmpl.yaml` (questions-first intake)
- Task enrich: `tasks/ds-build-component.md` (Step 0 divergent exploration)
- Workflow: `squads/design-ops/workflows/wf-provider-enrichment-from-external.yaml`
- ADR draft: `docs/adrs/ADR-018-design-ops-artifact-creation-capability.md` (precursor Wave C)

Pacote Wave B.2 (deeper absorption — provenance, contracts, meta-process):

- Rule: `squads/design-ops/rules/design-exploration-cycle.md` (Ask→Collect→Vocalize→Build→Show early→Iterate→Verify)
- Rule: `squads/design-ops/rules/self-contained-artifact-security.md` (SRI, CSP, no-eval, namespacing)
- Rule: `squads/design-ops/rules/context-gathering-protocol.md` (read-all-matches, parent-first, parallel-reads)
- Data: `squads/design-ops/data/deliverable-kinds-registry.yaml` (component, html_prototype, deck, pdf, pptx, email, dashboard)
- Data: `squads/design-ops/data/design-heuristics-from-external-prompts.yaml` (27 heuristics + 5 blocked pending ADR-018, full provenance ledger)
- Data: `squads/design-ops/data/artifact-file-governance.yaml` (size limits, naming, versioning pattern `Name v2.html`, module splitting)
- Data: `squads/design-ops/data/deck-contracts-spec.yaml` (speaker-notes postMessage + localStorage playback persistence contract)
- Rule enrich: `ai-trope-guardrails.md` (+no title screens, +no filler content, +no proactive screenshots)

Pacote Wave B.2.1 (consistency policy split — shadcn/Tailwind v4 + claw-design reconciliation):

- Rule: `squads/design-ops/rules/ds-consistency-policy.md` (reference-first vs copy-first por deliverable_kind; Tailwind bundling strategies; oklch gate; 5 rejeições conscientes)
- Rule: `squads/design-ops/rules/design-system-fidelity.md` (R1-R8: read-not-recall, exact values, last-resort framing, context-first mandate, visual vocabulary matching)
- Data: `squads/design-ops/data/ds-discovery-paths.yaml` (canonical + framework + brownfield fallback patterns + resolution protocol)
- Rule enrich: `design-exploration-cycle.md` (seção 1a: user-asked divergence gate kind-aware)
- Data enrich: `design-heuristics-from-external-prompts.yaml` (+7 heurísticas 28-34 + seção `explicit_rejections` com 5 itens rejeitados conscientemente)

Pacote Wave B.2.2 (deep dive verbatim — tool contracts + extended guardrails):

- Data: `squads/design-ops/data/questions-intake-protocol-spec.yaml` (question_kinds + escape-hatches mandatórias + timing + verbosity + priority ordering)
- Data: `squads/design-ops/data/starter-components-catalog.yaml` (7 starters forward-declared: deck_stage, design_canvas, ios_frame, android_frame, macos_window, browser_window, animations)
- Data: `squads/design-ops/data/tweak-protocol-spec.yaml` (full event sequence + EDITMODE-BEGIN/END JSON markers + 4 failure modes documentados)
- Data: `squads/design-ops/data/animation-primitives-contract.yaml` (Stage + Sprite + useTime/useSprite + Easing + interpolate + Popmotion fallback pinned)
- Data: `squads/design-ops/data/export-contracts-spec.yaml` (gen_pptx editable vs screenshots + open_for_print + super_inline_html bundler_thumbnail requirement)
- Rule enrich: `ai-trope-guardrails.md` (+Arial/Fraunces/system fonts, +rounded-corner-left-border card trope, emoji policy refinada, "resist titles" verbatim, "ask before filler")
- Data enrich: `deck-contracts-spec.yaml` (speaker notes opt-in + conversational-script format rule)
- Data enrich: `design-heuristics-from-external-prompts.yaml` (+16 heurísticas 35-50 + 2 rejeições scope-split REJECT-CLAW-006/007)
- Checklist enrich: `dops-ai-trope-guardrails.yaml` (38 checks total)

Pacote Wave B.3 (Execution Skill — bridge governance → runtime):

A Wave B.3 resolve o failure mode "mapa sem pipeline" identificado por `@sinkra-chief`. As Waves B–B.2.2 produziram 50 heurísticas + 17 arquivos de governance/contract sem executor. A Wave B.3 cria o executor.

- **Skill principal:** `.claude/skills/design-artifact-cycle/SKILL.md` — full Q→E→B→V lifecycle em 9 phases com gates blocking. Invocável via `/design-artifact-cycle --kind {kind} --business {slug} "{description}"`.

- **Tasks (P01-P08):**
  - `tasks/dops-materialize-brief.md` (P01 ASK)
  - `tasks/dops-resolve-ds-context.md` (P02 COLLECT)
  - `tasks/dops-capture-assumptions.md` (P03 VOCALIZE)
  - `tasks/dops-generate-variants.md` (P04 BUILD)
  - `tasks/dops-show-early-feedback.md` (P05 SHOW EARLY)
  - `tasks/dops-iterate-artifact.md` (P06 ITERATE)
  - `tasks/dops-verify-artifact.md` (P07 VERIFY)
  - `tasks/dops-handoff-artifact.md` (P08 HANDOFF)

A skill ATIVA 20+ artefatos antes governance-only (rules, checklists, templates, data registries) — cada phase da skill invoca as rules/contracts absorvidos nas Waves B–B.2.2.

Comparison com skills irmãs:

| Skill | Unidade | Relação |
|-------|---------|---------|
| `/design-artifact-cycle` | artifact | Entry point para execução design-ops |
| `/full-sdc` | story | Paralelo — diferente unidade |
| `/sinkra-map-process` | processo | Upstream — mapeia processos que consomem esta skill |
| `/story-cycle` | story | Paralelo |

Pacote Wave B.4 (UX Conversational — user-facing layer):

A Wave B.3 entregou o pipeline técnico `/design-artifact-cycle` — rigoroso mas developer-first. A Wave B.4 adiciona a camada conversacional "Claude Design" pra qualquer usuário poder criar via linguagem natural PT-BR.

Arquitetura em 2 camadas:

```
┌─────────────────────────────────────────────────┐
│ /claude-design  (conversational PT-BR)          │
│   - Persona: "Claude Design" senior designer     │
│   - Intent extraction + elicitation 1-a-1        │
│   - Terminology translation user ↔ technical     │
│   - Progressive disclosure (esconde phase IDs)   │
└──────────────┬──────────────────────────────────┘
               │ invoca por baixo
               ▼
┌─────────────────────────────────────────────────┐
│ /design-artifact-cycle  (technical pipeline)    │
│   - 9 phases com gates                           │
│   - Ativa 20+ rules/contracts das Waves B-B.2.2  │
└─────────────────────────────────────────────────┘
```

Arquivos Wave B.4:

- **Skill user-facing:** `.claude/skills/claude-design/SKILL.md` — invocável via `/claude-design`. Conversa natural em PT-BR, entende "preciso de um botão primary pra AIOX" → traduz em brief + orquestra pipeline.
- **Persona spec:** `squads/design-ops/data/claude-design-persona.yaml` — voz, tom, vocabulário, frases proibidas, heurísticas de intent extraction, protocolo de elicitação ordenado.
- **Translation table:** `squads/design-ops/data/user-terminology-translation.yaml` — ponte entre termos técnicos (success_criteria, compliance_score, BLOCKER) e linguagem de usuário (PT-BR).

Exemplo de uso:

```
User: /claude-design preciso de um botão primary pra landing da AIOX
Claude Design: Entendi: botão primary pra AIOX, landing page. Tá certo?
User: Sim
Claude Design: Uma versão só DS-first, ou explorar variações?
User: DS-first
Claude Design: Beleza. Estudando o design system da AIOX...
[... pipeline roda com progress em linguagem humana ...]
Claude Design: Pronto! Arquivo em `outputs/...`. Passou em todos os checks.
               Quer a versão com ícone também?
```

Pacote Wave B.5 (Deep Analysis #3 + Rename + Raw Prompt Preservation):

Rename: skill user-facing invocada agora via `/design-system` (ex-`/claude-design`). Persona "Claude Design" mantida — só mudou o comando.

Novidades dessa wave:

1. **Raw prompt baixado e preservado** em `data/external/claw-design-system-prompt-2026-04-18.txt` (422 linhas) + `data/external/README.md` explicando governança, re-fetch protocol e naming convention. Isso permite diffs quando a fonte evoluir.

2. **20 novas heurísticas (51-70)** da análise verbatim #3 do raw file — incluindo descobertas que passaram batido nos fetches anteriores.

3. **Nova capability descoberta — `window.claude.complete()`:** HTML artifacts podem chamar Claude direto via `window.claude.complete()` (haiku-4-5, 1024-token cap, viewer quota). Spec completa em `data/window-claude-complete-contract.yaml` — abre todo um tier de artefatos AI-enabled.

4. **Data: `data/design-system-modes.yaml`** — 13 modes/presets do `/design-system` espelhando `invoke_skill` vocabulary do claw-design (create-component, interactive-prototype, make-deck, make-tweakable, wireframe, export-pptx-editable/screenshots, create-design-system, save-as-pdf, save-as-standalone-html, send-to-canva, handoff-to-claude-code). Cada modo resolve pra deliverable_kind + invariantes.

5. **Data: `data/input-ingestion-contracts.yaml`** — contratos read-only para inputs de referência: Figma link, GitHub URL (chain obrigatório), screenshots, .napkin thumbnails, PPTX/DOCX ZIP/XML, PDF, project URLs (`/p/<id>?file=`), cross-project paths (`/projects/<id>/`), web URLs. Golden rule: COPY what you need INTO project; never runtime-reference external paths.

6. **Enrich `data/artifact-file-governance.yaml#asset_registration`** — adicionados campos do `register_assets` tool: asset_name (com inheritance rule), subtitle (version label), viewport (width+height pra fixed-size), status (needs-review/approved/changes-requested), group (Type/Colors/Spacing/Components/Brand — canonical title-case).

Descobertas-chave de valor:

- `window.claude.complete` (nova capability) — HTML pode chamar Claude em runtime
- `[data-screen-label]` attribute — marca slides/screens 1-indexed pra comment context
- "Ask at least 10 questions" regra explícita — nossa `questions-intake-protocol-spec` precisa absorver
- "Junior designer + user-as-manager" framing — alternativa à nossa "senior colleague" atual
- Single-file-with-tweaks model pra variants — menos file sprawl, mais toggle-comparison
- Asset registration groups canônicas (Type/Colors/Spacing/Components/Brand) — DS tab tem estrutura
- GitHub chain obrigatório: get_tree → import_files → read_file (não pular read_file)
- "One thousand no's for every yes" + "avoid data slop" — filosofia minimalista formalizada
- Web_fetch retorna só texto; pra design screenshot é melhor
- Don't proactively screenshot to check your work — reforço da regra
- Project URL parsing: `?file=` E `#file=` ambos válidos

Bloqueado até aprovação do ADR-018 (Wave C):

- Capability module: `design-ops/`
- Tasks: `artifact-create-html`, `artifact-create-deck`, `artifact-export-pptx`, `artifact-export-pdf`, `artifact-tweak-protocol`, `artifact-verify-postbuild`
- Workflow: `wf-artifact-creation-loop.yaml` (Q→E→B→V loop as runtime)
- Checklist: `dops-post-build-verification.yaml`
- Registry: `starter-components-registry.yaml` (device frames, deck stages, animations)
- Reason: Requer charter expansion de provider para criador de artefatos. Ver `docs/adrs/ADR-018-design-ops-artifact-creation-capability.md`.
