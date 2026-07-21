// surface-and-content-pairs--preview.tsx
// Surface and content pairing preview with accessibility notes.
import { Card, CardHeader, CardTitle, CardDescription, Badge } from '@sinkra/ds-core'

const pairs = [
  { surface: 'bg-background', text: 'text-foreground', label: 'Principal', a11y: 'WCAG AAA' },
  { surface: 'bg-muted', text: 'text-muted-foreground', label: 'Secundario', a11y: 'WCAG AA' },
  { surface: 'bg-primary', text: 'text-primary-foreground', label: 'Acao', a11y: 'WCAG AA' },
  { surface: 'bg-card', text: 'text-card-foreground', label: 'Card', a11y: 'WCAG AAA' },
]

export function SurfaceAndContentPairsPreview() {
  return (
    <section className="py-16 px-4">
      <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {pairs.map((pair) => (
          <Card key={pair.label} className={pair.surface}>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className={`text-base ${pair.text}`}>{pair.label}</CardTitle>
                <Badge variant="secondary">{pair.a11y}</Badge>
              </div>
              <p className={`text-sm ${pair.text}`}>
                Exemplo de texto sobre esta superficie.
              </p>
              <CardDescription className="mt-2">
                {pair.surface} + {pair.text}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
