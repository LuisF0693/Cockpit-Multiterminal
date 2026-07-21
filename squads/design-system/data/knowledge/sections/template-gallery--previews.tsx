// template-gallery--previews.tsx
// Page template gallery with previews and usage notes.
import { Card, CardHeader, CardTitle, CardDescription, Badge, Button } from '@sinkra/ds-core'

const templates = [
  { name: 'Landing Page', layout: 'Hero + Features + Pricing + CTA', personality: 'Conversao' },
  { name: 'Dashboard', layout: 'Sidebar + Metricas + Tabelas + Graficos', personality: 'Dados' },
  { name: 'Documentacao', layout: 'Sidebar nav + Conteudo + TOC', personality: 'Referencia' },
  { name: 'Autenticacao', layout: 'Card centralizado + Form simples', personality: 'Foco' },
]

export function TemplateGalleryPreviews() {
  return (
    <section className="py-16 px-4 max-w-5xl mx-auto">
      <div className="grid sm:grid-cols-2 gap-6">
        {templates.map((t) => (
          <Card key={t.name}>
            <div className="h-32 bg-muted rounded-t-lg flex items-center justify-center">
              <span className="text-sm text-muted-foreground">Preview</span>
            </div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t.name}</CardTitle>
                <Badge variant="secondary">{t.personality}</Badge>
              </div>
              <CardDescription>{t.layout}</CardDescription>
              <Button variant="ghost" size="sm" className="w-fit mt-2">Ver detalhes</Button>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
