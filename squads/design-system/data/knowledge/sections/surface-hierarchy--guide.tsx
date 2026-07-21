// surface-hierarchy--guide.tsx
// Surface hierarchy guide with background, panel, card, and overlay levels.
import { Card, CardHeader, CardTitle, CardDescription, Separator, Badge } from '@sinkra/ds-core'

export function SurfaceHierarchyGuide() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <div className="grid sm:grid-cols-2 gap-6">
        <Card className="bg-background">
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Background</Badge>
            <CardTitle className="text-base mt-2">Fundo base</CardTitle>
            <CardDescription>Nivel mais baixo. Cor de fundo principal da pagina.</CardDescription>
          </CardHeader>
        </Card>
        <Card className="bg-muted">
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Panel</Badge>
            <CardTitle className="text-base mt-2">Painel</CardTitle>
            <CardDescription>Agrupamento visual. Sidebars e areas secundarias.</CardDescription>
          </CardHeader>
        </Card>
        <Card className="bg-card shadow-md">
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Card</Badge>
            <CardTitle className="text-base mt-2">Card</CardTitle>
            <CardDescription>Conteudo elevado. Containers interativos.</CardDescription>
          </CardHeader>
        </Card>
        <Card className="bg-popover shadow-lg border-2">
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Overlay</Badge>
            <CardTitle className="text-base mt-2">Overlay</CardTitle>
            <CardDescription>Nivel mais alto. Modais, sheets, dropdowns.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </section>
  )
}
