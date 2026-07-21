// system-status--metrics.tsx
// System status strip showing token count, component count, and coverage.
import { Card, CardHeader, CardTitle, CardDescription, Badge, Progress } from '@sinkra/ds-core'

const metrics = [
  { label: 'Tokens', value: '48', caption: 'Design tokens definidos', progress: 85 },
  { label: 'Componentes', value: '30', caption: 'Componentes documentados', progress: 72 },
  { label: 'Cobertura', value: '78%', caption: 'Secoes com snippets', progress: 78 },
]

export function SystemStatusMetrics() {
  return (
    <section className="py-12 px-4">
      <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader>
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-2xl">{metric.value}</CardTitle>
              <p className="text-sm text-muted-foreground">{metric.caption}</p>
              <Progress value={metric.progress} className="mt-2" />
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
