// heading-hierarchy--preview.tsx
// H1-H6 heading hierarchy with usage notes.
import { Card, CardHeader, CardContent, Separator, Badge } from '@sinkra/ds-core'

const headings = [
  { tag: 'H1', className: 'text-4xl font-bold', note: 'Titulo principal da pagina. Apenas 1 por pagina.' },
  { tag: 'H2', className: 'text-3xl font-semibold', note: 'Secoes principais.' },
  { tag: 'H3', className: 'text-2xl font-semibold', note: 'Subsecoes dentro de H2.' },
  { tag: 'H4', className: 'text-xl font-medium', note: 'Detalhes dentro de subsecoes.' },
  { tag: 'H5', className: 'text-lg font-medium', note: 'Uso raro. Labels ou agrupamentos.' },
  { tag: 'H6', className: 'text-base font-medium', note: 'Uso excepcional.' },
]

export function HeadingHierarchyPreview() {
  return (
    <section className="py-16 px-4 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-semibold">Hierarquia de Headings</h2>
        </CardHeader>
        <CardContent className="space-y-6">
          {headings.map((h) => (
            <div key={h.tag}>
              <div className="flex items-center gap-3 mb-1">
                <Badge variant="secondary">{h.tag}</Badge>
                <span className={h.className}>Exemplo de {h.tag}</span>
              </div>
              <p className="text-sm text-muted-foreground ml-14">{h.note}</p>
              <Separator className="mt-4" />
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  )
}
