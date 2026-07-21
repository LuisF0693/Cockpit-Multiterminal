// coverage-summary--stats.tsx
// Coverage summary with progress bars per family.
import { Card, CardHeader, CardTitle, CardDescription, Badge, Progress } from '@sinkra/ds-core'

const coverage = [
  { family: 'Atoms', documented: 14, total: 14, maturity: 'Completo' },
  { family: 'Molecules', documented: 6, total: 8, maturity: 'Em progresso' },
  { family: 'Organisms', documented: 5, total: 8, maturity: 'Em progresso' },
]

export function CoverageSummaryStats() {
  return (
    <section className="py-12 px-4">
      <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {coverage.map((c) => (
          <Card key={c.family}>
            <CardHeader>
              <CardDescription>{c.family}</CardDescription>
              <CardTitle className="text-2xl">{c.documented}/{c.total}</CardTitle>
              <Progress value={(c.documented / c.total) * 100} className="mt-2" />
              <Badge variant="secondary" className="mt-2 w-fit">{c.maturity}</Badge>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
