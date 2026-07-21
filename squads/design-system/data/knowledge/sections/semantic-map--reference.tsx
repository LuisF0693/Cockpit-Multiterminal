// semantic-map--reference.tsx
// Semantic design map: from raw value to semantic role.
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Card, CardHeader, CardTitle } from '@sinkra/ds-core'

const mappings = [
  { semantic: 'background', raw: 'slate-50 / slate-900', context: 'Fundo principal da pagina', mode: 'Inverte em dark' },
  { semantic: 'foreground', raw: 'slate-900 / slate-50', context: 'Texto principal', mode: 'Inverte em dark' },
  { semantic: 'primary', raw: 'blue-500', context: 'Acoes e links principais', mode: 'Mantido' },
  { semantic: 'muted', raw: 'slate-100 / whiteAlpha-6', context: 'Fundos secundarios', mode: 'Opacidade em dark' },
  { semantic: 'border', raw: 'slate-200 / whiteAlpha-8', context: 'Divisores e contornos', mode: 'Opacidade em dark' },
  { semantic: 'ring', raw: 'blue-500', context: 'Focus ring', mode: 'Mantido' },
]

export function SemanticMapReference() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Mapeamento Semantico</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Papel semantico</TableHead>
              <TableHead>Valor base</TableHead>
              <TableHead>Contexto</TableHead>
              <TableHead>Tema</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.map((m) => (
              <TableRow key={m.semantic}>
                <TableCell><Badge variant="secondary">{m.semantic}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{m.raw}</TableCell>
                <TableCell className="text-muted-foreground">{m.context}</TableCell>
                <TableCell className="text-muted-foreground">{m.mode}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </section>
  )
}
