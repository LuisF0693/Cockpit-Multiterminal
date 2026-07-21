// border-and-radius--tiles.tsx
// Border strength and radius scale preview.
import { Card, CardHeader, CardTitle, CardDescription, Badge } from '@sinkra/ds-core'

const radii = [
  { name: 'rounded-sm', value: 'calc(0.75rem - 4px)', preview: 'rounded-sm' },
  { name: 'rounded-md', value: 'calc(0.75rem - 2px)', preview: 'rounded-md' },
  { name: 'rounded-lg', value: '0.75rem', preview: 'rounded-lg' },
  { name: 'rounded-xl', value: '+4px', preview: 'rounded-xl' },
  { name: 'rounded-full', value: '9999px', preview: 'rounded-full' },
]

export function BorderAndRadiusTiles() {
  return (
    <section className="py-16 px-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {radii.map((r) => (
          <Card key={r.name}>
            <CardHeader>
              <div className={`h-16 w-16 bg-primary/20 border-2 border-primary ${r.preview} mb-3`} />
              <CardTitle className="text-base">{r.name}</CardTitle>
              <CardDescription>{r.value}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
