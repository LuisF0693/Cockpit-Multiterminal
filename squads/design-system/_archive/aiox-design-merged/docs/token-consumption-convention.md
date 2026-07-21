# AIOX DS Token Consumption Convention

Status: approved  
Date: 2026-03-16  
Decision: Option A — dual convention by layer

## Decision Summary
- `--bb-*` CSS tokens remain the canonical source of truth.
- `brandbook/*` component layers stay inline-`var()` first because they are documentation/showcase surfaces and already rely on the bridge layer in `tokens.css`.
- `ui/`, `blocks/`, and `sections/` stay Tailwind-first through the `@theme inline` mapping in the target app `src/app/globals.css`.
- `brandbook/pages` is a composition layer: Tailwind is preferred for layout, but inline `var()` is acceptable when a page is explicitly demonstrating token behavior or composing existing brandbook primitives.

## Approval
- Owner basis: `workspace/businesses/{business}/design-system/config.yaml` declares the DS at BU level for the active business.
- Business owner basis: `workspace/businesses/{business}/L0-identity/company-dna.yaml` and related company artifacts define the local ownership context.
- Approval record: this convention was finalized on `2026-03-16` after explicit execution request in-session via `*route executar ds-token-consumption-convention`.

## Source Of Truth
- Canonical DS tokens live in the brandbook token files under the target app `src/components/brandbook/styles/`.
- The brandbook bridge in `src/components/brandbook/styles/tokens.css` maps legacy aliases like `--lime`, `--surface`, and `--cream` onto canonical `--bb-*` tokens.
- Tailwind utilities are not a separate token source. They are projections of the same tokens through `@theme inline` in `src/app/globals.css`.

## Current Distribution Snapshot

Method: source files only in the audited app `src/components`, excluding `*.stories.*`, `index.ts`, and test/spec files.

| Layer | Files | Inline only | Tailwind only | Mixed | Neither | Dominant pattern |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `brandbook/atoms` | 17 | 15 | 0 | 1 | 1 | Inline `var()` |
| `brandbook/molecules` | 24 | 11 | 4 | 8 | 1 | Inline `var()` |
| `brandbook/organisms` | 33 | 21 | 6 | 5 | 1 | Inline `var()` |
| `brandbook/chrome` | 7 | 6 | 0 | 0 | 1 | Inline `var()` |
| `brandbook/pages` | 56 | 33 | 6 | 12 | 5 | Mixed composition, inline-biased |
| `ui` | 55 | 2 | 36 | 2 | 15 | Tailwind |
| `blocks` | 38 | 0 | 32 | 2 | 4 | Tailwind |
| `sections` | 18 | 0 | 15 | 1 | 2 | Tailwind |

### Read Of The Snapshot
- Core brandbook component layers (`atoms`, `molecules`, `organisms`, `chrome`) already use inline `var()` in `67 / 81` files when mixed files are counted toward inline participation.
- Product/site layers (`ui`, `blocks`, `sections`) already use Tailwind token utilities in `88 / 111` files when mixed files are counted toward Tailwind participation.
- Forcing a full migration in either direction would fight the current architecture without solving a functional problem.

## Convention By Layer

| Layer | Default consumption | Allowed secondary pattern | Avoid |
| --- | --- | --- | --- |
| `brandbook/atoms` | Inline `var(--bb-*)` or legacy bridge aliases already mapped to `--bb-*` | Tailwind for spacing/layout/responsive utilities only | New semantic Tailwind-first styling as the primary token wiring |
| `brandbook/molecules` | Inline `var()` for token-bound visual values | Tailwind for layout, gap, flex, responsive behavior, and state composition | Adding new hardcoded color values or new legacy aliases |
| `brandbook/organisms` | Inline `var()` for charts, overlays, component chrome, and token demos | Tailwind for layout and utility composition | Rewriting reusable token wiring into arbitrary Tailwind values by default |
| `brandbook/chrome` | Inline `var()` | Tailwind for layout utilities only | Theme logic hidden in ad hoc classes |
| `brandbook/pages` | Compose according to child layer; Tailwind for layout, inline `var()` when demonstrating token behavior | Tailwind arbitrary values only when that keeps story/demo code clearer than style objects | Hardcoded hex/rgba outside approved demo exceptions |
| `ui` | Tailwind utilities backed by `@theme inline` (`bg-primary`, `text-foreground`, `border-border`, `bg-bb-dark`, etc.) | Inline `var()` only under documented exception | New inline style token wiring as default |
| `blocks` | Tailwind-first | Inline `var()` only under documented exception | Introducing brandbook bridge aliases like `--lime` in product blocks |
| `sections` | Tailwind-first | Inline `var()` only under documented exception | Inline token styles for ordinary layout/content rendering |

## Exception Policy

Inline `var()` is allowed in `ui`, `blocks`, and `sections` only when Tailwind is not a clean fit for the property or integration point. Valid examples:
- Dynamic `z-index`, `gridTemplateColumns`, `maskImage`, `clipPath`, or similar properties not expressed well as utilities
- SVG, canvas, chart, map, or third-party library APIs that expect raw style values
- Motion/animation values or computed CSS variable composition that would become less readable in arbitrary utility syntax

When using that exception outside brandbook layers, add a short comment immediately above the code:

```ts
// ds-token-exception: inline-var-required -- property unsupported by Tailwind utility
```

This is the enforcement convention for v1. Path-based lint automation is deferred because the current codebase still contains mixed brandbook demo pages and dynamic utility composition that would generate noisy false positives.

## Naming Rules For New Tokens
- New canonical tokens must use the `--bb-*` namespace.
- Prefer semantic names over literal color names when the token represents a role.
- Add the token in the CSS token layer first, not directly in component code.
- If a site/product layer needs Tailwind consumption, expose the token through `@theme inline` as the appropriate `--color-*`, `--radius-*`, `--font-*`, or `--z-*` mapping before using it in class names.
- Do not create one-off aliases like `--brand-green-2`, `--lime-alt-card`, or ad hoc utility naming that bypasses the token files.
- Legacy bridge aliases such as `--lime`, `--surface`, and `--cream` are compatibility affordances for existing brandbook code. New non-brandbook code should not introduce new dependency on that alias layer.

## Practical Rules
- No new hardcoded hex or rgba values in component files unless the page is explicitly documenting a palette/semantic state and that exception is intentional.
- Brandbook showcase components may remain more explicit, even when verbose, because the code doubles as documentation.
- Product-facing components should optimize for Tailwind readability and consistency with the app ecosystem.
- When in doubt: if the file lives under `brandbook/*`, start inline-first; if it lives under `ui/`, `blocks/`, or `sections/`, start Tailwind-first.

## Non-Decision
- This convention does not require back-migrating the existing codebase.
- It defines the forward rule for new work and refactors.
