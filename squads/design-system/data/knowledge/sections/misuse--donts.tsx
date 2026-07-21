// misuse--donts.tsx
// Logo misuse examples: stretch, low contrast, crowding, effects.
import { Card, CardHeader, CardTitle, CardDescription, Badge } from '@sinkra/ds-core'

const misuses = [
  { type: 'Deformacao', desc: 'Nunca esticar ou comprimir o logo. Manter proporcoes originais.' },
  { type: 'Baixo contraste', desc: 'Nunca usar o logo sobre fundo de cor similar sem separacao.' },
  { type: 'Aglomeracao', desc: 'Nunca posicionar elementos dentro da area de protecao.' },
  { type: 'Efeitos', desc: 'Nunca aplicar sombra, brilho, gradiente ou rotacao ao logo.' },
  { type: 'Cores alteradas', desc: 'Nunca alterar as cores oficiais do logo.' },
  { type: 'Fundo complexo', desc: 'Evitar fundos com imagens ou padroes sem overlay.' },
]

export function MisuseDonts() {
  return (
    <section className="py-16 px-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {misuses.map((m) => (
          <Card key={m.type} className="border-destructive/30">
            <CardHeader>
              <Badge variant="destructive" className="w-fit">{m.type}</Badge>
              <CardTitle className="text-base mt-2">{m.type}</CardTitle>
              <CardDescription>{m.desc}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
