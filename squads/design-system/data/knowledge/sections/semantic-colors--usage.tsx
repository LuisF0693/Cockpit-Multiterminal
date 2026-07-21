// semantic-colors--usage.tsx
// Semantic color cards: success, warning, error, info.
import { Card, CardHeader, CardTitle, CardDescription, Badge } from '@sinkra/ds-core'

const semanticColors = [
  { name: 'Success', cssClass: 'border-green-500', badge: 'Confirmacao', note: 'Acoes concluidas, validacoes positivas.' },
  { name: 'Warning', cssClass: 'border-yellow-500', badge: 'Atencao', note: 'Alertas nao-criticos que requerem atencao.' },
  { name: 'Error', cssClass: 'border-red-500', badge: 'Erro', note: 'Falhas, validacoes negativas, acoes destrutivas.' },
  { name: 'Info', cssClass: 'border-blue-500', badge: 'Informacao', note: 'Contexto adicional, dicas e orientacoes.' },
]

export function SemanticColorsUsage() {
  return (
    <section className="py-16 px-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {semanticColors.map((color) => (
          <Card key={color.name} className={`border-l-4 ${color.cssClass}`}>
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-base">{color.name}</CardTitle>
                <Badge variant="secondary">{color.badge}</Badge>
              </div>
              <CardDescription>{color.note}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
