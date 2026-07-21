// contrast-check--pairs.tsx
// Contrast check table for foreground/background pairs.
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Card, CardHeader, CardTitle } from '@sinkra/ds-core'

const pairs = [
  { fg: 'text-foreground', bg: 'bg-background', ratio: '15.3:1', pass: true },
  { fg: 'text-muted-foreground', bg: 'bg-background', ratio: '7.2:1', pass: true },
  { fg: 'text-primary-foreground', bg: 'bg-primary', ratio: '8.1:1', pass: true },
  { fg: 'text-foreground', bg: 'bg-muted', ratio: '12.6:1', pass: true },
  { fg: 'text-muted-foreground', bg: 'bg-muted', ratio: '4.8:1', pass: true },
]

export function ContrastCheckPairs() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Verificacao de Contraste</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Texto</TableHead>
              <TableHead>Fundo</TableHead>
              <TableHead>Ratio</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pairs.map((pair, i) => (
              <TableRow key={i}>
                <TableCell><Badge variant="secondary">{pair.fg}</Badge></TableCell>
                <TableCell><Badge variant="secondary">{pair.bg}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{pair.ratio}</TableCell>
                <TableCell>
                  <Badge variant={pair.pass ? 'default' : 'destructive'}>
                    {pair.pass ? 'PASS' : 'FAIL'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </section>
  )
}
