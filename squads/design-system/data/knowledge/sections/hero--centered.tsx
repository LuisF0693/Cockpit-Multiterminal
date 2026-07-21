// hero--centered.tsx
// Centered hero with badge, headline, description, and dual CTA.
import { Badge, Button } from '@sinkra/ds-core'

export function HeroCentered() {
  return (
    <section className="flex flex-col items-center text-center py-24 px-4 gap-6">
      <Badge variant="secondary">Novo</Badge>
      <h1 className="text-display font-semibold tracking-tight text-balance max-w-3xl">
        Titulo principal da hero section
      </h1>
      <p className="text-body text-muted-foreground max-w-xl text-pretty">
        Descricao secundaria que explica o valor da proposta.
      </p>
      <div className="flex gap-3">
        <Button size="lg">Comecar agora</Button>
        <Button size="lg" variant="outline">Saiba mais</Button>
      </div>
    </section>
  )
}
