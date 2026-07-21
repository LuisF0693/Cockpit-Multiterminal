// accent-and-brand-palette--swatches.tsx
// Brand color palette with semantic labels and light/dark preview.
import { Card, CardHeader, CardTitle, CardDescription, Badge } from '@sinkra/ds-core'

const colors = [
  { name: 'Primary', cssVar: 'bg-primary', textVar: 'text-primary-foreground', label: 'Acao principal' },
  { name: 'Accent', cssVar: 'bg-accent', textVar: 'text-accent-foreground', label: 'Destaque visual' },
  { name: 'Muted', cssVar: 'bg-muted', textVar: 'text-muted-foreground', label: 'Fundo secundario' },
  { name: 'Destructive', cssVar: 'bg-destructive', textVar: 'text-destructive-foreground', label: 'Acoes destrutivas' },
]

export function AccentAndBrandPaletteSwatches() {
  return (
    <section className="py-16 px-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {colors.map((color) => (
          <Card key={color.name}>
            <div className={`h-24 rounded-t-lg ${color.cssVar} flex items-center justify-center`}>
              <span className={`text-sm font-medium ${color.textVar}`}>{color.name}</span>
            </div>
            <CardHeader>
              <CardTitle className="text-base">{color.name}</CardTitle>
              <CardDescription>{color.label}</CardDescription>
              <Badge variant="secondary" className="w-fit mt-1">{color.cssVar}</Badge>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
