// icon-grid--gallery.tsx
// Icon grid gallery with size options and category filters.
import { Card, CardHeader, CardTitle, CardDescription, Badge, Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@sinkra/ds-core'

const iconCategories = [
  { name: 'Navegacao', icons: ['Home', 'Menu', 'Seta', 'Voltar', 'Busca'] },
  { name: 'Acao', icons: ['Editar', 'Excluir', 'Salvar', 'Copiar', 'Baixar'] },
  { name: 'Status', icons: ['Check', 'Erro', 'Alerta', 'Info', 'Loading'] },
]

export function IconGridGallery() {
  return (
    <section className="py-16 px-4 max-w-5xl mx-auto">
      <Tabs defaultValue="Navegacao">
        <TabsList>
          {iconCategories.map((cat) => (
            <TabsTrigger key={cat.name} value={cat.name}>{cat.name}</TabsTrigger>
          ))}
        </TabsList>
        {iconCategories.map((cat) => (
          <TabsContent key={cat.name} value={cat.name}>
            <div className="grid grid-cols-5 gap-4 mt-4">
              {cat.icons.map((icon) => (
                <Card key={icon}>
                  <CardHeader className="items-center text-center pb-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mb-2">
                      <span className="text-muted-foreground text-xs">icon</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{icon}</p>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  )
}
