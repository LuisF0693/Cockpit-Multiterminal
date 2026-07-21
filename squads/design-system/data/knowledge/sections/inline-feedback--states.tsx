// inline-feedback--states.tsx
// Inline feedback cards: success, warning, error, informational.
import { Card, CardHeader, CardTitle, CardDescription } from '@sinkra/ds-core'

const feedbacks = [
  { type: 'Sucesso', border: 'border-l-4 border-green-500', desc: 'Acao concluida com exito.' },
  { type: 'Alerta', border: 'border-l-4 border-yellow-500', desc: 'Atencao necessaria antes de continuar.' },
  { type: 'Erro', border: 'border-l-4 border-red-500', desc: 'Algo deu errado. Tente novamente.' },
  { type: 'Info', border: 'border-l-4 border-blue-500', desc: 'Informacao contextual para o usuario.' },
]

export function InlineFeedbackStates() {
  return (
    <section className="py-16 px-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {feedbacks.map((fb) => (
          <Card key={fb.type} className={fb.border}>
            <CardHeader>
              <CardTitle className="text-base">{fb.type}</CardTitle>
              <CardDescription>{fb.desc}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
