// page-hero--standard.tsx
// Standard page hero with eyebrow badge, title, and summary.
import { Badge, Separator } from '@sinkra/ds-core'

export function PageHeroStandard() {
  return (
    <section className="py-16 px-4 max-w-3xl mx-auto">
      <Badge variant="secondary" className="mb-4">Design System</Badge>
      <h1 className="text-display font-semibold tracking-tight text-balance mb-4">
        Titulo da pagina
      </h1>
      <p className="text-body text-muted-foreground text-pretty mb-8">
        Resumo de uma linha explicando o escopo e proposito desta secao do sistema.
      </p>
      <Separator />
    </section>
  )
}
