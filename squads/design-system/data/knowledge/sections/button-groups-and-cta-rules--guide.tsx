// button-groups-and-cta-rules--guide.tsx
// Button grouping patterns and CTA priority rules.
import { Button, Card, CardHeader, CardTitle, CardDescription } from '@sinkra/ds-core'

export function ButtonGroupsAndCtaRulesGuide() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Grupo de Acoes</CardTitle>
            <CardDescription>Maximo 1 primary + 1 secondary por grupo.</CardDescription>
            <div className="flex gap-3 mt-4">
              <Button>Salvar</Button>
              <Button variant="outline">Cancelar</Button>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hierarquia CTA</CardTitle>
            <CardDescription>Primary para acao principal, outline para secundaria, ghost para terciaria.</CardDescription>
            <div className="flex gap-3 mt-4">
              <Button>Primary</Button>
              <Button variant="outline">Secondary</Button>
              <Button variant="ghost">Tertiary</Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    </section>
  )
}
