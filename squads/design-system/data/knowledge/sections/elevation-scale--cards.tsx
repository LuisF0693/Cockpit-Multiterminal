// elevation-scale--cards.tsx
// Elevation scale showing surface hierarchy with shadow previews.
import { Card, CardHeader, CardTitle, CardDescription, Badge } from '@sinkra/ds-core'

const elevations = [
  { name: 'Void', desc: 'Fundo absoluto', shadowClass: '', bgClass: 'bg-background' },
  { name: 'Base', desc: 'Superficie padrao', shadowClass: 'shadow-sm', bgClass: 'bg-background' },
  { name: 'Raised', desc: 'Cards e paineis', shadowClass: 'shadow-md', bgClass: 'bg-card' },
  { name: 'Elevated', desc: 'Dropdowns e popovers', shadowClass: 'shadow-lg', bgClass: 'bg-popover' },
  { name: 'Overlay', desc: 'Modais e sheets', shadowClass: 'shadow-xl', bgClass: 'bg-card' },
]

export function ElevationScaleCards() {
  return (
    <section className="py-16 px-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {elevations.map((e) => (
          <Card key={e.name} className={`${e.shadowClass} ${e.bgClass}`}>
            <CardHeader>
              <CardTitle className="text-base">{e.name}</CardTitle>
              <CardDescription>{e.desc}</CardDescription>
              <Badge variant="secondary" className="w-fit mt-1">{e.shadowClass || 'none'}</Badge>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
