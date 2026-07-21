// list-item-families--variants.tsx
// List item families: simple, media, meta-rich, actionable.
import { Card, CardHeader, CardTitle, Badge, Button, Separator } from '@sinkra/ds-core'

export function ListItemFamiliesVariants() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader><CardTitle>Familias de Itens de Lista</CardTitle></CardHeader>
        <div className="px-6 pb-6 space-y-1">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">Item simples</p>
              <p className="text-sm text-muted-foreground">Apenas titulo e subtitulo.</p>
            </div>
            <Badge variant="secondary">Simple</Badge>
          </div>
          <Separator />
          <div className="flex items-center gap-4 py-3">
            <div className="h-12 w-12 rounded-lg bg-muted flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Item com midia</p>
              <p className="text-sm text-muted-foreground">Thumbnail, titulo e descricao.</p>
            </div>
            <Badge variant="secondary">Media</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">Item rico em metadados</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="secondary">Tag 1</Badge>
                <Badge variant="secondary">Tag 2</Badge>
                <span className="text-xs text-muted-foreground">3 min atras</span>
              </div>
            </div>
            <Badge variant="secondary">Meta</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">Item com acao</p>
              <p className="text-sm text-muted-foreground">Botoes inline para acoes rapidas.</p>
            </div>
            <Button variant="outline" size="sm">Acao</Button>
          </div>
        </div>
      </Card>
    </section>
  )
}
