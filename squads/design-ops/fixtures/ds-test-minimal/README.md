# ds-test-minimal — Discovery Fixture

Tiny static DS used to exercise `scripts/design-system/discover-brand.cjs`.

Brand: **Cobalt** (synthetic — dominant accent `#3b5bdb`).

Exercises:
- Baseline match: `components-buttons.html`, `components-cards.html` (expect matched)
- Baseline missing: `accordion`, `table`, `tabs` (no source file — expect missing_from_source)
- Specialized detection: `hero`, `pillar-card`, `composer`, `message` (expect evidence_score > 0)
- Surfaces: `marketing-home` (category: marketing), `product-chat` (category: product)
- Colors: foundation + accent + feedback
- Typography: @import (Inter + JetBrains Mono) + font-family CSS vars

Run:
```bash
node squads/design-ops/scripts/design-system/discover-brand.cjs \
  --source=squads/design-ops/fixtures/ds-test-minimal \
  --output=/tmp/cobalt-brand-profile.yaml
```
