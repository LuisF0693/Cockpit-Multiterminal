// features--grid.tsx
// 3-column responsive feature grid with icon placeholders and descriptions.
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@sinkra/ds-core'

const features = [
  { title: 'Recurso 1', description: 'Descricao concisa do primeiro recurso e seu valor.' },
  { title: 'Recurso 2', description: 'Descricao concisa do segundo recurso e seu valor.' },
  { title: 'Recurso 3', description: 'Descricao concisa do terceiro recurso e seu valor.' },
  { title: 'Recurso 4', description: 'Descricao concisa do quarto recurso e seu valor.' },
  { title: 'Recurso 5', description: 'Descricao concisa do quinto recurso e seu valor.' },
  { title: 'Recurso 6', description: 'Descricao concisa do sexto recurso e seu valor.' },
]

export function FeaturesGrid() {
  return (
    <section className="py-24 px-4">
      <div className="text-center mb-16">
        <h2 className="text-heading font-semibold tracking-tight mb-4">
          Tudo o que voce precisa
        </h2>
        <p className="text-body text-muted-foreground max-w-2xl mx-auto text-pretty">
          Uma plataforma completa para resolver seu problema de ponta a ponta.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <span className="text-primary text-lg">*</span>
              </div>
              <CardTitle className="text-lg">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
