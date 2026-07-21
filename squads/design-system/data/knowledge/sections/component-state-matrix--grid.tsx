// component-state-matrix--grid.tsx
// Component state matrix showing all states for key components.
import { Button, Card, CardHeader, CardTitle, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '@sinkra/ds-core'

export function ComponentStateMatrixGrid() {
  return (
    <section className="py-16 px-4 max-w-5xl mx-auto">
      <Tabs defaultValue="button">
        <TabsList>
          <TabsTrigger value="button">Button</TabsTrigger>
          <TabsTrigger value="card">Card</TabsTrigger>
        </TabsList>
        <TabsContent value="button">
          <Card>
            <CardHeader><CardTitle className="text-base">Button — Estados</CardTitle></CardHeader>
            <div className="px-6 pb-6 grid grid-cols-4 gap-4">
              <div className="text-center"><Badge variant="secondary" className="mb-2">Default</Badge><div><Button size="sm">Acao</Button></div></div>
              <div className="text-center"><Badge variant="secondary" className="mb-2">Focus</Badge><div><Button size="sm" className="ring-2 ring-ring">Acao</Button></div></div>
              <div className="text-center"><Badge variant="secondary" className="mb-2">Disabled</Badge><div><Button size="sm" disabled>Acao</Button></div></div>
              <div className="text-center"><Badge variant="secondary" className="mb-2">Loading</Badge><div><Button size="sm" disabled>...</Button></div></div>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="card">
          <Card>
            <CardHeader><CardTitle className="text-base">Card — Estados</CardTitle></CardHeader>
            <div className="px-6 pb-6 grid grid-cols-3 gap-4">
              <Card><CardHeader className="pb-2"><Badge variant="secondary">Default</Badge></CardHeader></Card>
              <Card className="border-primary"><CardHeader className="pb-2"><Badge variant="secondary">Selected</Badge></CardHeader></Card>
              <Card className="opacity-50"><CardHeader className="pb-2"><Badge variant="secondary">Disabled</Badge></CardHeader></Card>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  )
}
