// body-and-code--samples.tsx
// Body copy and code specimen panel.
import { Card, CardHeader, CardContent, Tabs, TabsList, TabsTrigger, TabsContent, Badge } from '@sinkra/ds-core'

export function BodyAndCodeSamples() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Tabs defaultValue="body">
        <TabsList>
          <TabsTrigger value="body">Corpo de texto</TabsTrigger>
          <TabsTrigger value="code">Codigo</TabsTrigger>
          <TabsTrigger value="small">Caption e Small</TabsTrigger>
        </TabsList>
        <TabsContent value="body">
          <Card>
            <CardContent className="pt-6">
              <p className="text-base leading-relaxed max-w-prose">
                Este e um exemplo de corpo de texto com tamanho base e line-height confortavel.
                O comprimento ideal e entre 50 e 75 caracteres por linha para leitura prolongada.
                Use a classe max-w-prose para limitar a largura automaticamente.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="code">
          <Card>
            <CardContent className="pt-6">
              <pre className="text-sm font-mono bg-muted p-4 rounded-lg overflow-x-auto">
                <code>{`const config = {\n  theme: 'dark',\n  spacing: 'balanced',\n}`}</code>
              </pre>
              <p className="text-sm text-muted-foreground mt-3">
                Use fonte mono (JetBrains Mono) para todos os blocos de codigo.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="small">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Badge variant="secondary">Caption</Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  Texto de caption para imagens, tabelas e notas de rodape.
                </p>
              </div>
              <div>
                <Badge variant="secondary">Small</Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  Texto auxiliar para labels, timestamps e metadados.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  )
}
