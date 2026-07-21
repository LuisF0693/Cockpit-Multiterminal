// cta--centered.tsx
// Centered call-to-action section with headline, description, and action buttons.
import { Button } from '@sinkra/ds-core'

export function CtaCentered() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-6 rounded-2xl bg-primary/5 p-12">
        <h2 className="text-heading font-semibold tracking-tight text-balance">
          Pronto para comecar?
        </h2>
        <p className="text-body text-muted-foreground max-w-xl text-pretty">
          Junte-se a milhares de empresas que ja estao usando nossa plataforma
          para acelerar seus resultados.
        </p>
        <div className="flex gap-3">
          <Button size="lg">Comecar agora</Button>
          <Button size="lg" variant="outline">Agendar demo</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Sem cartao de credito. Cancele quando quiser.
        </p>
      </div>
    </section>
  )
}
