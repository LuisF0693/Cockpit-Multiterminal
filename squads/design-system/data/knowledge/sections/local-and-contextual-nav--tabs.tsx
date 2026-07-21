// local-and-contextual-nav--tabs.tsx
// Local navigation with tabs, filters, and breadcrumb patterns.
import { Tabs, TabsList, TabsTrigger, TabsContent, Card, CardHeader, CardTitle, CardDescription } from '@sinkra/ds-core'

export function LocalAndContextualNavTabs() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Tabs defaultValue="tabs">
        <TabsList>
          <TabsTrigger value="tabs">Tabs</TabsTrigger>
          <TabsTrigger value="breadcrumb">Breadcrumb</TabsTrigger>
          <TabsTrigger value="filtros">Filtros</TabsTrigger>
        </TabsList>
        <TabsContent value="tabs">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tabs para navegacao local</CardTitle>
              <CardDescription>Use para alternar entre views dentro da mesma pagina. Maximo 5-7 tabs.</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
        <TabsContent value="breadcrumb">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Breadcrumb</CardTitle>
              <CardDescription>Home / Produtos / Detalhe. Para hierarquias com mais de 2 niveis.</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
        <TabsContent value="filtros">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filtros contextuais</CardTitle>
              <CardDescription>Toggle groups, selects e popovers para refinar conteudo.</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  )
}
