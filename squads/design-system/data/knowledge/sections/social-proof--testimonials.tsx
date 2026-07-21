// social-proof--testimonials.tsx
// Testimonial grid with avatar, quote, name, and role.
import { Card, CardContent } from '@sinkra/ds-core'

const testimonials = [
  {
    quote: 'Essa plataforma transformou completamente a forma como gerenciamos nossos projetos.',
    name: 'Maria Silva',
    role: 'CEO, TechCorp',
    avatar: 'MS',
  },
  {
    quote: 'O suporte eh excepcional e os resultados apareceram no primeiro mes.',
    name: 'Joao Santos',
    role: 'CTO, StartupXYZ',
    avatar: 'JS',
  },
  {
    quote: 'Simples, rapido e eficiente. Exatamente o que precisavamos.',
    name: 'Ana Costa',
    role: 'Head of Product, ScaleUp',
    avatar: 'AC',
  },
]

export function SocialProofTestimonials() {
  return (
    <section className="py-24 px-4 bg-muted/50">
      <div className="text-center mb-16">
        <h2 className="text-heading font-semibold tracking-tight mb-4">
          O que nossos clientes dizem
        </h2>
        <p className="text-body text-muted-foreground max-w-xl mx-auto text-pretty">
          Empresas que ja transformaram seus resultados com nossa plataforma.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.name}>
            <CardContent className="pt-6">
              <blockquote className="text-sm leading-relaxed mb-6">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="text-sm font-medium">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
