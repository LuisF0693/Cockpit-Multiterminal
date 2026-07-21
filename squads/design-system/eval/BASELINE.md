# Eval Baseline — Design System V0 Pipeline

> Generated: 2026-04-12T17:55:39.288Z
> Story: STORY-119.36

## Overall Error-Free Rate

**57.5%** (23/40 files)

Target: >88% (Epic 119E goal)

## Per-Dimension Pass Rates

| Dimension | Check | Pass Rate |
|-----------|-------|-----------|
| D1 | eval dimension | 100% |
| D2 | eval dimension | 100% |
| D3 | eval dimension | 100% |
| D4 | eval dimension | 57% |
| D5 | eval dimension | 100% |
| D6 | eval dimension | 100% |
| D7 | eval dimension | 100% |
| D8 | eval dimension | 98% |
| D9 | eval dimension | 100% |

## A23 Note (D6, D7, D8)

D6 (accessibility), D7 (token compliance), D8 (provider completeness) are feasibility spikes.
Full implementation requires AST analysis tools. Current checks are heuristic.

## Next Steps

1. Improve error-free rate by fixing common D4/D9 issues in generated code
2. Re-run `npm run eval:baseline` after each rule absorption batch
3. Track progress toward >88% target in sprint reviews
