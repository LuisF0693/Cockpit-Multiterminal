// reference-grid--moodboard.tsx
// Moodboard reference grid with image placeholders and tone labels.
import { Card, CardHeader, CardDescription, Badge } from '@sinkra/ds-core'

const references = [
  { label: 'Minimalismo', note: 'Espacos vazios, tipografia forte, paleta neutra.' },
  { label: 'Premium', note: 'Texturas sutis, contraste alto, sombras profundas.' },
  { label: 'Editorial', note: 'Grid assimetrico, citacoes, fotografia em preto e branco.' },
  { label: 'Tecnologico', note: 'Gradientes suaves, linhas finas, icones monocromaticos.' },
  { label: 'Humano', note: 'Fotografias reais, cores quentes, cantos arredondados.' },
  { label: 'Bold', note: 'Cores vibrantes, tipografia oversized, contrastes extremos.' },
]

export function ReferenceGridMoodboard() {
  return (
    <section className="py-16 px-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {references.map((ref) => (
          <Card key={ref.label}>
            <div className="h-32 bg-muted rounded-t-lg flex items-center justify-center">
              <span className="text-sm text-muted-foreground">Referencia visual</span>
            </div>
            <CardHeader>
              <Badge variant="secondary" className="w-fit">{ref.label}</Badge>
              <CardDescription>{ref.note}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
