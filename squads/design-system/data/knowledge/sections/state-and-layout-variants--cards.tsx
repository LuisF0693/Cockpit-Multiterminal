// state-and-layout-variants--cards.tsx
// Card state and layout variants: interactive, static, selected, disabled.
import { Card, CardHeader, CardTitle, Badge } from '@sinkra/ds-core'

export function StateAndLayoutVariantsCards() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <Badge variant="secondary" className="w-fit">Interativo</Badge>
            <CardTitle className="text-sm">Clicavel com hover</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <Badge variant="secondary" className="w-fit">Estatico</Badge>
            <CardTitle className="text-sm">Apenas exibicao</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-primary ring-2 ring-primary/20">
          <CardHeader className="pb-3">
            <Badge className="w-fit">Selecionado</Badge>
            <CardTitle className="text-sm">Estado ativo</CardTitle>
          </CardHeader>
        </Card>
        <Card className="opacity-50 pointer-events-none">
          <CardHeader className="pb-3">
            <Badge variant="secondary" className="w-fit">Desabilitado</Badge>
            <CardTitle className="text-sm">Indisponivel</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </section>
  )
}
