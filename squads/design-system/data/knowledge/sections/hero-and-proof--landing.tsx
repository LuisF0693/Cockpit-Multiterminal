// hero-and-proof--landing.tsx
// Landing page hero with social proof, primary and secondary CTA.
import { Button, Badge, Card, CardHeader, CardTitle } from '@sinkra/ds-core'

export function HeroAndProofLanding() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <Badge variant="secondary" className="mb-4">+500 clientes ativos</Badge>
        <h1 className="text-display font-semibold tracking-tight text-balance mb-4">
          A plataforma que transforma resultados
        </h1>
        <p className="text-body text-muted-foreground max-w-xl mx-auto text-pretty mb-8">
          Solucao completa para escalar seu negocio com dados, automacao e inteligencia.
        </p>
        <div className="flex justify-center gap-3 mb-12">
          <Button size="lg">Comecar gratis</Button>
          <Button size="lg" variant="outline">Ver demo</Button>
        </div>
        <div className="flex justify-center gap-8">
          {['4.9/5 avaliacao', '99.9% uptime', 'Suporte 24/7'].map((proof) => (
            <div key={proof} className="text-center">
              <p className="text-sm font-medium">{proof}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
