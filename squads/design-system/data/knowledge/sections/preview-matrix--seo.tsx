// preview-matrix--seo.tsx
// SEO preview matrix: search, social, title and description rules.
import { Card, CardHeader, CardDescription, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '@sinkra/ds-core'

export function PreviewMatrixSeo() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Tabs defaultValue="search">
        <TabsList>
          <TabsTrigger value="search">Busca</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
        </TabsList>
        <TabsContent value="search">
          <Card>
            <CardHeader>
              <Badge variant="secondary" className="w-fit">Google</Badge>
              <div className="mt-4 border rounded-lg p-4 bg-muted">
                <p className="text-primary text-lg">Titulo da Pagina | Marca</p>
                <p className="text-sm text-green-600">https://exemplo.com/pagina</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Descricao meta com ate 155 caracteres que resume o conteudo da pagina de forma atrativa.
                </p>
              </div>
              <CardDescription className="mt-3">Titulo: 50-60 chars. Descricao: 120-155 chars.</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
        <TabsContent value="social">
          <Card>
            <CardHeader>
              <Badge variant="secondary" className="w-fit">Open Graph</Badge>
              <div className="mt-4 border rounded-lg overflow-hidden">
                <div className="h-32 bg-muted flex items-center justify-center">
                  <span className="text-sm text-muted-foreground">OG Image 1200x630</span>
                </div>
                <div className="p-3">
                  <p className="text-xs text-muted-foreground">exemplo.com</p>
                  <p className="font-medium">Titulo para compartilhamento social</p>
                  <p className="text-sm text-muted-foreground">Descricao otimizada para redes sociais.</p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  )
}
