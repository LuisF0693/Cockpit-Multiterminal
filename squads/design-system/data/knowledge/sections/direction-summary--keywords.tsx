// direction-summary--keywords.tsx
// Moodboard direction summary: keywords, do more of, avoid list.
import { Card, CardHeader, CardTitle, CardDescription, Badge, Separator } from '@sinkra/ds-core'

export function DirectionSummaryKeywords() {
  return (
    <section className="py-16 px-4 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Direcao Visual</CardTitle>
          <div className="flex flex-wrap gap-2 mt-3">
            {['Limpo', 'Profissional', 'Confiavel', 'Moderno', 'Acessivel'].map((kw) => (
              <Badge key={kw} variant="secondary">{kw}</Badge>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="space-y-4">
            <div>
              <CardTitle className="text-base text-green-600">Fazer mais</CardTitle>
              <CardDescription>Espacos generosos, hierarquia clara, microinteracoes sutis, fotografia real.</CardDescription>
            </div>
            <div>
              <CardTitle className="text-base text-red-600">Evitar</CardTitle>
              <CardDescription>Gradientes exagerados, sombras pesadas, animacoes longas, iconografia generica.</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </section>
  )
}
