// pattern-library--gallery.tsx
// Visual pattern library: grid, line, texture, and framing patterns.
import { Card, CardHeader, CardTitle, CardDescription, Badge } from '@sinkra/ds-core'

export function PatternLibraryGallery() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <div className="h-24 bg-muted rounded-t-lg" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 20px, var(--border) 20px, var(--border) 21px)' }} />
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Grid</Badge>
            <CardTitle className="text-base">Padrao de grid</CardTitle>
            <CardDescription>Linhas de referencia para alinhamento visual.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <div className="h-24 bg-muted rounded-t-lg" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 10px, var(--border) 10px, var(--border) 11px)' }} />
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Linhas</Badge>
            <CardTitle className="text-base">Padrao de linhas</CardTitle>
            <CardDescription>Linhas horizontais para ritmo visual.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Textura</Badge>
            <CardTitle className="text-base">Motivos de textura</CardTitle>
            <CardDescription>Texturas sutis para fundos e superficies.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Frame</Badge>
            <CardTitle className="text-base">Motivos de moldura</CardTitle>
            <CardDescription>Bordas decorativas para destaque de conteudo.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </section>
  )
}
