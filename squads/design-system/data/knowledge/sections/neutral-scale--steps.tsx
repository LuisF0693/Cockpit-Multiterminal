// neutral-scale--steps.tsx
// Neutral color scale with foreground/background preview.
import { Card, CardHeader, CardTitle, Badge } from '@sinkra/ds-core'

const neutrals = [
  { name: 'Background', bg: 'bg-background', fg: 'text-foreground' },
  { name: 'Foreground', bg: 'bg-foreground', fg: 'text-background' },
  { name: 'Muted', bg: 'bg-muted', fg: 'text-muted-foreground' },
  { name: 'Card', bg: 'bg-card', fg: 'text-card-foreground' },
  { name: 'Popover', bg: 'bg-popover', fg: 'text-popover-foreground' },
  { name: 'Border', bg: 'bg-border', fg: 'text-foreground' },
]

export function NeutralScaleSteps() {
  return (
    <section className="py-16 px-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {neutrals.map((n) => (
          <Card key={n.name} className={n.bg}>
            <CardHeader>
              <CardTitle className={`text-base ${n.fg}`}>{n.name}</CardTitle>
              <p className={`text-sm ${n.fg} opacity-70`}>
                Exemplo de texto sobre esta superficie.
              </p>
              <Badge variant="secondary" className="w-fit mt-1">{n.bg}</Badge>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
