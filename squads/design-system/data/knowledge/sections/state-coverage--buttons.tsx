// state-coverage--buttons.tsx
// Button state coverage: default, hover, focus, disabled, loading.
import { Button, Card, CardHeader, CardTitle, Badge, Spinner } from '@sinkra/ds-core'

export function StateCoverageButtons() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Cobertura de Estados</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="text-center space-y-2">
            <Badge variant="secondary">Default</Badge>
            <div><Button>Botao</Button></div>
          </div>
          <div className="text-center space-y-2">
            <Badge variant="secondary">Hover</Badge>
            <div><Button className="opacity-90">Botao</Button></div>
          </div>
          <div className="text-center space-y-2">
            <Badge variant="secondary">Focus</Badge>
            <div><Button className="ring-2 ring-ring ring-offset-2">Botao</Button></div>
          </div>
          <div className="text-center space-y-2">
            <Badge variant="secondary">Disabled</Badge>
            <div><Button disabled>Botao</Button></div>
          </div>
          <div className="text-center space-y-2">
            <Badge variant="secondary">Loading</Badge>
            <div><Button disabled><Spinner className="mr-2 h-4 w-4" />Carregando</Button></div>
          </div>
        </div>
      </Card>
    </section>
  )
}
