// spacing-scale--bars.tsx
// Visual spacing scale with bars representing each step.
import { Card, CardHeader, CardTitle, CardDescription, Badge } from '@sinkra/ds-core'

const steps = [
  { name: 'xs', value: '0.25rem', width: 'w-1' },
  { name: 'sm', value: '0.5rem', width: 'w-2' },
  { name: 'md', value: '1rem', width: 'w-4' },
  { name: 'lg', value: '1.5rem', width: 'w-6' },
  { name: 'xl', value: '2rem', width: 'w-8' },
  { name: '2xl', value: '3rem', width: 'w-12' },
  { name: '3xl', value: '4rem', width: 'w-16' },
]

export function SpacingScaleBars() {
  return (
    <section className="py-16 px-4 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Escala de Espacamento</CardTitle>
          <CardDescription>Valores baseados em multiplos de 0.25rem (4px).</CardDescription>
        </CardHeader>
        <div className="px-6 pb-6 space-y-4">
          {steps.map((step) => (
            <div key={step.name} className="flex items-center gap-4">
              <Badge variant="secondary" className="w-12 justify-center">{step.name}</Badge>
              <div className={`h-4 ${step.width} bg-primary rounded`} />
              <span className="text-sm text-muted-foreground">{step.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}
