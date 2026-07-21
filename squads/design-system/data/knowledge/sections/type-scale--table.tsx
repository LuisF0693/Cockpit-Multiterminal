// type-scale--table.tsx
// Type scale reference table with live previews.
import { Card, CardHeader, CardTitle, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@sinkra/ds-core'

const scale = [
  { name: 'text-xs', size: '0.75rem', lh: '1rem', preview: 'Extra Small' },
  { name: 'text-sm', size: '0.875rem', lh: '1.25rem', preview: 'Small' },
  { name: 'text-base', size: '1rem', lh: '1.5rem', preview: 'Base' },
  { name: 'text-lg', size: '1.125rem', lh: '1.75rem', preview: 'Large' },
  { name: 'text-xl', size: '1.25rem', lh: '1.75rem', preview: 'Extra Large' },
  { name: 'text-2xl', size: '1.5rem', lh: '2rem', preview: 'Heading 3' },
  { name: 'text-3xl', size: '1.875rem', lh: '2.25rem', preview: 'Heading 2' },
  { name: 'text-4xl', size: '2.25rem', lh: '2.5rem', preview: 'Heading 1' },
]

export function TypeScaleTable() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Escala Tipografica</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Classe</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Altura de linha</TableHead>
              <TableHead>Preview</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scale.map((row) => (
              <TableRow key={row.name}>
                <TableCell><Badge variant="secondary">{row.name}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{row.size}</TableCell>
                <TableCell className="text-muted-foreground">{row.lh}</TableCell>
                <TableCell className={row.name}>{row.preview}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </section>
  )
}
