// narrative-support--evidence.tsx
// Narrative support: evidence blocks, timeline, and supporting visuals.
import { Card, CardHeader, CardTitle, CardDescription, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '@sinkra/ds-core'

export function NarrativeSupportEvidence() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Tabs defaultValue="evidence">
        <TabsList>
          <TabsTrigger value="evidence">Evidencias</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>
        <TabsContent value="evidence">
          <div className="grid sm:grid-cols-2 gap-6 mt-4">
            <Card>
              <CardHeader>
                <Badge variant="secondary" className="w-fit">Dado</Badge>
                <CardTitle className="text-base">78% de aprovacao</CardTitle>
                <CardDescription>Pesquisa com 200 usuarios validou a hierarquia visual.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Badge variant="secondary" className="w-fit">Referencia</Badge>
                <CardTitle className="text-base">Material Design 3</CardTitle>
                <CardDescription>Inspiracao para o sistema de elevacao e superficies.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="timeline">
          <div className="mt-4 space-y-4">
            {['v1.0 — Fundacao', 'v1.5 — Componentes', 'v2.0 — Tokens semanticos'].map((item) => (
              <div key={item} className="flex items-center gap-4">
                <div className="h-3 w-3 rounded-full bg-primary flex-shrink-0" />
                <p className="text-sm">{item}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}
