// editorial-spreads--prose.tsx
// Editorial layout with lead statement, body prose, and pull quote.
import { Separator, Badge } from '@sinkra/ds-core'

export function EditorialSpreadsProse() {
  return (
    <section className="py-16 px-4 max-w-2xl mx-auto">
      <Badge variant="secondary" className="mb-6">Editorial</Badge>
      <h2 className="text-3xl font-semibold tracking-tight mb-6">
        Por que construimos desta forma
      </h2>
      <p className="text-lg text-muted-foreground leading-relaxed mb-8">
        Cada decisao de design reflete uma crenca fundamental: simplicidade gera clareza,
        e clareza gera confianca. Este nao e apenas um sistema de componentes — e uma
        linguagem visual que comunica os valores da marca.
      </p>
      <Separator className="my-8" />
      <blockquote className="border-l-4 border-primary pl-6 py-2 my-8">
        <p className="text-xl italic text-foreground">
          "Design nao e como parece. Design e como funciona."
        </p>
        <cite className="text-sm text-muted-foreground mt-2 block">Steve Jobs</cite>
      </blockquote>
      <Separator className="my-8" />
      <p className="text-base leading-relaxed text-muted-foreground">
        O resultado e um sistema que escala sem perder personalidade.
        Cada componente carrega consigo as decisoes que o tornaram necessario.
      </p>
    </section>
  )
}
