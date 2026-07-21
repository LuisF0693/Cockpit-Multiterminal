// selection-and-grouping--lists.tsx
// List selection and grouping patterns.
import { Card, CardContent, Checkbox, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '@sinkra/ds-core'

export function SelectionAndGroupingLists() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Tabs defaultValue="multi">
        <TabsList>
          <TabsTrigger value="multi">Multi-selecao</TabsTrigger>
          <TabsTrigger value="groups">Agrupamento</TabsTrigger>
        </TabsList>
        <TabsContent value="multi">
          <Card>
            <CardContent className="pt-6 space-y-3">
              {['Item A', 'Item B', 'Item C'].map((item) => (
                <div key={item} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted transition-colors">
                  <Checkbox id={item} />
                  <label htmlFor={item} className="text-sm cursor-pointer">{item}</label>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="groups">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <Badge variant="secondary" className="mb-2">Grupo A</Badge>
                  <div className="space-y-1 ml-2">
                    <p className="text-sm py-1">Sub-item 1</p>
                    <p className="text-sm py-1">Sub-item 2</p>
                  </div>
                </div>
                <div>
                  <Badge variant="secondary" className="mb-2">Grupo B</Badge>
                  <div className="space-y-1 ml-2">
                    <p className="text-sm py-1">Sub-item 3</p>
                    <p className="text-sm py-1">Sub-item 4</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  )
}
