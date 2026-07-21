// chart-gallery--types.tsx
// Chart type gallery: line, bar, area, pie descriptions with usage notes.
import { Card, CardHeader, CardTitle, CardDescription, Badge } from '@sinkra/ds-core'

const charts = [
  { type: 'Linha', desc: 'Tendencias ao longo do tempo. Ideal para series temporais.', when: 'Crescimento, evolucao, comparacao temporal.' },
  { type: 'Barra', desc: 'Comparacao entre categorias. Vertical ou horizontal.', when: 'Rankings, distribuicoes, comparativos.' },
  { type: 'Area', desc: 'Volume acumulado. Variacao de linha com preenchimento.', when: 'Market share, volumes, acumulados.' },
  { type: 'Pizza/Radial', desc: 'Proporcoes de um todo. Maximo 5-7 segmentos.', when: 'Distribuicao percentual, composicao.' },
]

export function ChartGalleryTypes() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <div className="grid sm:grid-cols-2 gap-6">
        {charts.map((chart) => (
          <Card key={chart.type}>
            <CardHeader>
              <Badge variant="secondary" className="w-fit">{chart.type}</Badge>
              <CardTitle className="text-base mt-2">{chart.type}</CardTitle>
              <CardDescription>{chart.desc}</CardDescription>
              <p className="text-xs text-muted-foreground mt-2">Quando usar: {chart.when}</p>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
