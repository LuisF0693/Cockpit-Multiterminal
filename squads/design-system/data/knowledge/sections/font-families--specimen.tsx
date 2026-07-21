// font-families--specimen.tsx
// Font family specimen cards showing primary and secondary typefaces.
import { Card, CardHeader, CardTitle, CardDescription, Badge, Separator } from '@sinkra/ds-core'

const families = [
  { name: 'Inter', fallback: 'system-ui, sans-serif', use: 'Corpo de texto e interface', specimen: 'Aa Bb Cc Dd Ee Ff 0123456789' },
  { name: 'JetBrains Mono', fallback: 'monospace', use: 'Codigo e tokens', specimen: 'const x = 42; // mono' },
]

export function FontFamiliesSpecimen() {
  return (
    <section className="py-16 px-4">
      <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {families.map((family) => (
          <Card key={family.name}>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-lg">{family.name}</CardTitle>
                <Badge variant="secondary">{family.use}</Badge>
              </div>
              <p className="text-2xl mb-2" style={{ fontFamily: family.name }}>
                {family.specimen}
              </p>
              <Separator className="my-3" />
              <CardDescription>Fallback: {family.fallback}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
