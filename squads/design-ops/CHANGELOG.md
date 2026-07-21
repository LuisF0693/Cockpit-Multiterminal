# Changelog

## 2026-04-19 (v2.5 — framework-agnostic archetype + scaffold-ds.sh v2.0)

- **Archetype v2.0.0** — ID `ds-nextjs-tailwind-shadcn` → `ds-tailwind-shadcn`. Framework promoted from locked "Next.js 16" in invariant to `parameterized.framework` enum `[next, vite, astro, remix, sveltekit]`. Invariant stays Tailwind v4 + shadcn (new-york) + Radix namespace + Lucide + TS strict. Each framework has its own `shape` declaring config files, src layout, router, image/link primitives, theme provider, client_directive, build_command. Supported MVP: `next` + `vite`; others are `ARCHITECTURAL_PLACEHOLDER`.
- **Archetype.invariant.config_files** split into `required_all_frameworks` (package.json, tsconfig, postcss, components.json, .gitignore) + `framework_specific` (pointer to parameterized).
- **Archetype.invariant.src_layout** split into `required_all_frameworks` (components/ui, lib/utils.ts) + `framework_specific` (entry + globals CSS path per framework).
- **Archetype.mandatory_outputs** split into `baseline` (all profiles/frameworks — check-token-drift + components.map.json + focus-indicators) and `full_only` (profile=full — build-manifest + tokens.dtcg.json + designTokensLanguageServer + Storybook).
- **Archetype.legacy_grandfather** — apps/anthropic-ds, apps/redpine-ds, apps/aiox-brandbook grandfathered at v1.0 baseline (não violam v2.0).
- **scaffold-ds.sh v2.0.0** reescrito: `--framework=next|vite` flag, template verification antes do write, branch logic per framework (package.json/tsconfig/eslint/configs/entry/globals.css), wire completo das mandatory outputs (templates copiados + package.json enriched).
- **Workflow v2.1.0** — adicionado `framework` input, `npx next build` → `npm run build` (agnostic), step-1-scaffold declara `emits.baseline` + `emits.full_only`.
- **`docs/redpine-playbook-integration-2026-04-19.md`** — master doc retroativo com gap→fix map, 10 heurísticas extraídas, follow-ups pendentes.

## 2026-04-19 (v2.4 — Redpine playbook integration via external agent)

**[Retroactive entry — external agent applied these changes in a preceding pass; documented here for audit trail]**

- `dops-ai-trope-guardrails.yaml` v1.1.0 → v1.2.0 — adicionadas dimensões `token_naming_discipline` (4 checks: semantic/base prefix distinct, no self-reference, no unresolved vars) + `react_prop_contracts` (5 checks: no `ref` prop, no `key`, no function-passing across RSC boundary). Total 45 → 56.
- `visual-gate-lean.yaml` 47 → 57 checks — adicionada seção `stack-discipline` (10 checks React/Next: no-ref-prop, no-transition-all, no-opacity-hover, no-rounded-drift, focus-global-only, palette-shadcn-override, semantic-vs-base-distinct, drift-check-passes, manifest-in-sync, dtcg-valid).
- `ds-archetype.yaml` invariant.quality_gates 9 → 20 clauses (+11 GAP-DS-010 stack-discipline gates).
- `ds-archetype.yaml` invariant.baseline_primitives.contract +4 items (GAP-DS-011 status + a11y mandatory, `ref` prop ban, tokenized hover).
- `ds-archetype.yaml` forbids 14 → 19 (+5 semantic/base collision, ref-in-RSC, palette incomplete, focus per-component, concurrent writers).
- `ds-archetype.yaml` NEW `mandatory_outputs` section declaring required files + package.json requirements.
- Workflow `ds-static-to-dynamic-migration.yaml` gates 7 → 8 (G7 Continuous Drift Audit weekly post-delivery).
- Rules +1: `rules/concurrent-writer-audit.md` (5-step CWA protocol com precedent Redpine).
- Templates +3: `check-token-drift.mjs.tmpl`, `build-manifest.mjs.tmpl`, `focus-indicators-global.css.tmpl`.
- Fixture +1: `fixtures/ds-test-minimal/expected-outputs.yaml` (E2E contract G0-G7).
- Extension rule +2 sections: "Absorb contracts, not runtime" + "Grep before invent".

## 2026-04-19 (v2.3 — final pass: placeholder policy + code-over-screenshots + extension protocol)

- Adicionados 3 checks em `dops-ai-trope-guardrails.yaml` v1.2.0: `placeholder_better_than_bad_attempt_at_missing_asset`, `missing_assets_flagged_in_readme_caveats_not_silently_invented`, `source_code_read_first_then_screenshots_if_ambiguous`. Total 42 → 45.
- Adicionados 2 anti-patterns em `data/ds-archetype.yaml` forbids: placeholder-over-bad-attempt + recreating-from-screenshots-when-source-exists.
- `discover-brand.cjs` header atualizado com PRINCIPLE block explicitando code-over-screenshots e placeholder policy (tornando implícito em explícito para futuros maintainers).
- Criado `rules/extension-vocabulary-match.md` — protocolo para quando user pede ADIÇÃO a DS existente (não migration). Observação obrigatória antes de código: leia tokens + 3-5 primitives + 1-2 kits + README voice; articule vocabulary in writing; propose plan; implement. Status: protocolo interactive via @design-chief; workflow `ds-extension.yaml` deferido até demanda.
- Workflow `ds-static-to-dynamic-migration.yaml` — step-6 Polish agora cita explicitamente visual-gate-lean (content-discipline + scale-minimums) e ai-trope-guardrails como inputs + validation criteria. Adicionado `workflow_mode` input stub (migration | extension-DEFERRED).

## 2026-04-19 (v2.2 — heuristic reinforcement from Claude Design prompt)

- Enriquecido `checklists/dops-ai-trope-guardrails.yaml` v1.1.0 — adicionados 4 checks: `no_aggressive_gradient_backgrounds_on_full_surfaces`, `new_colors_via_oklch_harmonic_extension_not_invented`, `no_data_slop_decorative_stats_or_numbers_without_function`, `system_vocalized_up_front_before_building_artifact`. Total items 38 → 42.
- Estendido `checklists/visual-gate-lean.yaml` com 2 seções novas: **content-discipline** (no-filler, no-data-slop, ask-before-adding, system-up-front) e **scale-minimums** (deck 24px, mobile 44px, print 12pt, interactive hit area 44×44).
- Adicionados 4 anti-patterns ao `data/ds-archetype.yaml` forbids: guessing-values-from-memory, mocking-from-scratch-when-source-exists, aggressive-gradient-backgrounds, data-slop.
- Origem: heurísticas destiladas do system prompt do Claude Design (HTML-artifact flavor) — portáveis pra nosso stack Next.js/shadcn apesar do target diferente.

## 2026-04-19 (v2.1 — Organism 0 executor)

- Implementado `scripts/design-system/discover-brand.cjs` — **Worker determinístico** para Organism 0 (Brand Discovery). Extrai colors (HSL-raw+hsl-fn+hex), classifica roles, parse typography (@import + --font-*), mapeia baseline 24 primitives, detecta specialized via dual heurística (prose signals + class/id structural match), lista surfaces com category inference. Emite `brand-profile.yaml`.
- Criado fixture `fixtures/ds-test-minimal/` — synthetic "Cobalt" DS com 16 colors, 2 preview components, 2 ui_kits. Validação verde: 3 dedicated baseline + 4 mentioned + 17 missing; 5 specialized detectados (composer+message score 1.0, hero+cta-band+pillar-card score 0.6); 2 surfaces com categoria correta.
- Workflow atualizado: Organism 0 vira `type: script` (Worker) com fallback para `design-chief` se output tiver gaps. Impacto: discovery determinística + auditável + idempotente (mesmo source → mesmo brand-profile).

## 2026-04-19 (v2 — archetype promotion)

- Formalizado archetype `data/ds-archetype.yaml` em 3 camadas: INVARIANTE (stack+token-architecture-4-tier+24 baseline primitives+dark-mode+quality-gates), PARAMETRIZADO (profile+brand-colors+typography+casing+voice+kit-surfaces taxonomy), EMERGENTE (discovery catalog com 20+ specialized primitives evidenciados nos 3 DSs + surfaces derivation rule)
- Workflow `ds-static-to-dynamic-migration.yaml` → **v2.0.0** com 7 Organisms (adicionado **Organism 0: Brand Discovery** antes do Scaffold)
- Organism 3 agora gera **baseline (24) + emergent (N aprovados no G0)** — não mais hardcoded
- Organism 4b agora deriva surfaces de `legacy-static/ui_kits/*/` — não mais nomes hardcoded (claude/anthropic-com/docs)
- Novo gate G0 valida brand-profile + baseline coverage map + proposed specialized com evidence_score
- Modo `interactive` (user aprova specialized) vs `yolo` (auto-approve evidence_score >= 0.7)
- Resultado: workflow produz DSs **não-idênticos** (cada brand com primitives/surfaces emergentes próprias) preservando a espinha dorsal invariante entre eles

## 2026-04-19

- Absorvido workflow **DS Static-to-Dynamic Migration** derivado do mapeamento SINKRA em `outputs/sinkra-squad/migracao-ds-estatico-para-dinamico-tokenizado/` (compliance 87/100, estrutural 0.91, todos 5 checkpoints APPROVE)
- Adicionado `workflows/ds-static-to-dynamic-migration.yaml` v1.0.0 — 6 Organisms (Scaffold → Tokens → Primitives → Routes → QA → Polish), 6 gates G1-G6, perfis lean|full, paralelização preview || kits em G3, execução de referência em `apps/anthropic-ds`
- Criado `scripts/design-system/scaffold-ds.sh` — parametriza Next.js 16 + React 19 + TS + Tailwind v4 + shadcn/ui + next-themes + Lucide (fecha GAP-DS-001)
- Criado `checklists/visual-gate-lean.yaml` — inspeção visual manual para perfil lean, 7 seções, verdict PASS/FAIL (fecha GAP-DS-003a)
- GAP-DS-003b (Playwright visual regression para perfil full) permanece aberto — owner: target project

## 2026-04-09

- Bootstrap greenfield inicial de `design-ops`
- `design-chief` reancorado como agent residente canônico do provider
- `design-system` marcado como `legacy_source`
