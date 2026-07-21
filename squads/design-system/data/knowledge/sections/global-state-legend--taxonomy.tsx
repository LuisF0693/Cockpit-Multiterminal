// global-state-legend--taxonomy.tsx
// Global state legend: taxonomy of all interaction states.
import { Card, CardHeader, CardTitle, Badge } from '@sinkra/ds-core'

const states = [
  { name: 'Default', meaning: 'Estado inicial do componente', cue: 'Sem indicador visual especial' },
  { name: 'Hover', meaning: 'Cursor sobre o elemento', cue: 'Opacidade ou sombra sutil' },
  { name: 'Focus', meaning: 'Navegacao via teclado', cue: 'Ring de foco visivel' },
  { name: 'Active', meaning: 'Sendo pressionado', cue: 'Scale reduzido (0.98)' },
  { name: 'Disabled', meaning: 'Indisponivel para interacao', cue: 'Opacidade 50%' },
  { name: 'Selected', meaning: 'Item marcado ou ativo', cue: 'Background primary/accent' },
  { name: 'Loading', meaning: 'Aguardando resposta', cue: 'Spinner ou skeleton' },
  { name: 'Error', meaning: 'Validacao falhou', cue: 'Borda ou texto destructive' },
]

export function GlobalStateLegendTaxonomy() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {states.map((s) => (
          <Card key={s.name}>
            <CardHeader className="pb-3">
              <Badge variant="secondary" className="w-fit mb-1">{s.name}</Badge>
              <CardTitle className="text-sm">{s.meaning}</CardTitle>
              <p className="text-xs text-muted-foreground">{s.cue}</p>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
