// layout-rails--containers.tsx
// Layout rails showing container widths, columns, and gutter strategy.
import { Card, CardHeader, CardTitle, CardDescription, Tabs, TabsList, TabsTrigger, TabsContent, Badge } from '@sinkra/ds-core'

export function LayoutRailsContainers() {
  return (
    <section className="py-16 px-4 max-w-5xl mx-auto">
      <Tabs defaultValue="widths">
        <TabsList>
          <TabsTrigger value="widths">Larguras</TabsTrigger>
          <TabsTrigger value="columns">Colunas</TabsTrigger>
        </TabsList>
        <TabsContent value="widths">
          <div className="space-y-4 mt-4">
            {[
              { name: 'sm', max: 'max-w-sm', desc: 'Formularios estreitos' },
              { name: 'md', max: 'max-w-2xl', desc: 'Conteudo de leitura' },
              { name: 'lg', max: 'max-w-5xl', desc: 'Layouts com sidebar' },
              { name: 'full', max: 'max-w-7xl', desc: 'Dashboards e tabelas' },
            ].map((rail) => (
              <Card key={rail.name}>
                <CardHeader className="flex-row items-center gap-4">
                  <Badge variant="secondary">{rail.name}</Badge>
                  <div>
                    <CardTitle className="text-base">{rail.max}</CardTitle>
                    <CardDescription>{rail.desc}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="columns">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Estrategia de Colunas</CardTitle>
              <CardDescription>
                Mobile: 1 coluna. Tablet (sm): 2 colunas. Desktop (lg): 3-4 colunas.
                Gap padrao: gap-6 (1.5rem).
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  )
}
