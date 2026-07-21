// modal-and-blocking-feedback--examples.tsx
// Modal and sheet feedback patterns with escape rules.
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@sinkra/ds-core'

export function ModalAndBlockingFeedbackExamples() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Dialog</Badge>
            <CardTitle className="text-base">Feedback em Modal</CardTitle>
            <CardDescription>Para confirmacoes destrutivas e alertas criticos.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-muted">
              <p className="font-medium mb-2">Tem certeza que deseja excluir?</p>
              <p className="text-sm text-muted-foreground mb-4">Esta acao nao pode ser desfeita.</p>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm">Excluir</Button>
                <Button variant="outline" size="sm">Cancelar</Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Sheet</Badge>
            <CardTitle className="text-base">Feedback em Sheet</CardTitle>
            <CardDescription>Para detalhes expandidos e fluxos secundarios.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-muted">
              <p className="font-medium mb-2">Detalhes do erro</p>
              <p className="text-sm text-muted-foreground mb-4">Codigo: 422 — Entidade nao processavel.</p>
              <Button variant="outline" size="sm">Fechar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
