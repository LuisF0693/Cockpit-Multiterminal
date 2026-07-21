// catalog-hero--overview.tsx
// Component catalog hero with scope and family count.
import { Badge, Separator } from '@sinkra/ds-core'

export function CatalogHeroOverview() {
  return (
    <section className="py-16 px-4 max-w-3xl mx-auto">
      <Badge variant="secondary" className="mb-4">Catalogo</Badge>
      <h1 className="text-display font-semibold tracking-tight text-balance mb-4">
        Componentes do Design System
      </h1>
      <p className="text-body text-muted-foreground text-pretty mb-2">
        30 componentes organizados em 3 familias: atoms, molecules e organisms.
      </p>
      <div className="flex gap-4 mt-4">
        <Badge>14 Atoms</Badge>
        <Badge variant="secondary">8 Molecules</Badge>
        <Badge variant="secondary">8 Organisms</Badge>
      </div>
      <Separator className="mt-8" />
    </section>
  )
}
