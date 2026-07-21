// foundation-grid--cards.tsx
// Grid of foundation cards linking to each layer of the design system.
import { Card, CardHeader, CardTitle, CardDescription, Badge, Button } from '@sinkra/ds-core'

const foundations = [
  { title: 'Tipografia', description: 'Familias, escala e hierarquia tipografica.', route: '/brandbook/typography', coverage: 'Completo' },
  { title: 'Cores', description: 'Paleta, tokens semanticos e contraste.', route: '/brandbook/color-tokens', coverage: 'Completo' },
  { title: 'Espacamento', description: 'Escala de espacamento, layout e breakpoints.', route: '/brandbook/spacing-layout', coverage: 'Completo' },
  { title: 'Superficies', description: 'Elevacao, bordas e hierarquia de superficies.', route: '/brandbook/surfaces', coverage: 'Parcial' },
  { title: 'Tokens Semanticos', description: 'Mapeamento semantico de design tokens.', route: '/brandbook/semantic-tokens', coverage: 'Parcial' },
  { title: 'Componentes', description: 'Catalogo e familias de componentes.', route: '/brandbook/components', coverage: 'Em progresso' },
]

export function FoundationGridCards() {
  return (
    <section className="py-16 px-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {foundations.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <Badge variant="secondary">{item.coverage}</Badge>
              </div>
              <CardDescription>{item.description}</CardDescription>
              <Button variant="ghost" size="sm" className="mt-3 w-fit">
                Ver detalhes
              </Button>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
