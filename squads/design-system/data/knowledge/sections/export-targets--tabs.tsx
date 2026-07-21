// export-targets--tabs.tsx
// Design system export targets with format tabs and copy actions.
import { Tabs, TabsList, TabsTrigger, TabsContent, Card, CardHeader, CardTitle, CardDescription, Button } from '@sinkra/ds-core'

export function ExportTargetsTabs() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Tabs defaultValue="css">
        <TabsList>
          <TabsTrigger value="css">CSS Custom Properties</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
          <TabsTrigger value="tailwind">Tailwind Config</TabsTrigger>
        </TabsList>
        <TabsContent value="css">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CSS Custom Properties</CardTitle>
              <CardDescription>
                Formato nativo para web. Inclui todas as variaveis de cor, espacamento e tipografia.
              </CardDescription>
              <pre className="mt-4 text-sm font-mono bg-muted p-4 rounded-lg overflow-x-auto">
                <code>{`:root {\n  --background: 250 250 250;\n  --foreground: 15 23 42;\n  --primary: 59 130 246;\n}`}</code>
              </pre>
              <Button variant="outline" size="sm" className="mt-3 w-fit">Copiar</Button>
            </CardHeader>
          </Card>
        </TabsContent>
        <TabsContent value="json">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">JSON</CardTitle>
              <CardDescription>Para integracao com ferramentas e pipelines.</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
        <TabsContent value="tailwind">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tailwind Config</CardTitle>
              <CardDescription>Extensao direta do tailwind.config.ts.</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  )
}
