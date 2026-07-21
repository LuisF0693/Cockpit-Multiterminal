// pricing--three-tier.tsx
// Three-tier pricing with highlighted recommended plan.
import { Badge, Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Separator } from '@sinkra/ds-core'

const plans = [
  {
    name: 'Starter',
    price: 'R$ 97',
    period: '/mes',
    description: 'Ideal para quem esta comecando.',
    features: ['5 projetos', '1 usuario', 'Suporte por email', 'Relatorios basicos'],
    highlighted: false,
    cta: 'Comecar gratis',
  },
  {
    name: 'Pro',
    price: 'R$ 297',
    period: '/mes',
    description: 'Para times que precisam escalar.',
    features: ['Projetos ilimitados', '10 usuarios', 'Suporte prioritario', 'Relatorios avancados', 'API access'],
    highlighted: true,
    cta: 'Comecar agora',
  },
  {
    name: 'Enterprise',
    price: 'Sob consulta',
    period: '',
    description: 'Para operacoes de grande escala.',
    features: ['Tudo do Pro', 'Usuarios ilimitados', 'SLA dedicado', 'SSO/SAML', 'Onboarding personalizado'],
    highlighted: false,
    cta: 'Falar com vendas',
  },
]

export function PricingThreeTier() {
  return (
    <section className="py-24 px-4">
      <div className="text-center mb-16">
        <h2 className="text-heading font-semibold tracking-tight mb-4">
          Planos e precos
        </h2>
        <p className="text-body text-muted-foreground max-w-xl mx-auto text-pretty">
          Escolha o plano ideal para o seu momento.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={plan.highlighted ? 'border-primary shadow-lg relative' : ''}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge>Recomendado</Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-display font-semibold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <span className="text-primary">&#10003;</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={plan.highlighted ? 'default' : 'outline'}
              >
                {plan.cta}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  )
}
