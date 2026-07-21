// features--alternating.tsx
// Alternating left-right feature rows with image placeholders.
import { Badge } from '@sinkra/ds-core'

const features = [
  {
    badge: 'Recurso 1',
    title: 'Titulo do primeiro recurso',
    description: 'Explicacao detalhada do valor que este recurso entrega ao usuario.',
  },
  {
    badge: 'Recurso 2',
    title: 'Titulo do segundo recurso',
    description: 'Explicacao detalhada do valor que este recurso entrega ao usuario.',
  },
  {
    badge: 'Recurso 3',
    title: 'Titulo do terceiro recurso',
    description: 'Explicacao detalhada do valor que este recurso entrega ao usuario.',
  },
]

export function FeaturesAlternating() {
  return (
    <section className="py-24 px-4 space-y-24">
      {features.map((feature, i) => (
        <div
          key={feature.badge}
          className={`grid md:grid-cols-2 items-center gap-12 max-w-5xl mx-auto ${
            i % 2 === 1 ? 'md:direction-rtl' : ''
          }`}
          style={i % 2 === 1 ? { direction: 'rtl' } : undefined}
        >
          <div style={{ direction: 'ltr' }} className="flex flex-col gap-4">
            <Badge variant="secondary" className="w-fit">{feature.badge}</Badge>
            <h3 className="text-heading font-semibold tracking-tight">
              {feature.title}
            </h3>
            <p className="text-body text-muted-foreground text-pretty">
              {feature.description}
            </p>
          </div>
          <div
            style={{ direction: 'ltr' }}
            className="aspect-[4/3] rounded-lg bg-muted flex items-center justify-center text-muted-foreground"
          >
            Feature Image
          </div>
        </div>
      ))}
    </section>
  )
}
