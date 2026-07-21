// token-contract--table.tsx
// Design system contract table for engineering handoff.
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Card, CardHeader, CardTitle, ScrollArea } from '@sinkra/ds-core'

const groups = [
  { group: 'Cores', keys: 'background, foreground, primary, accent, muted, border, ring', delivery: 'CSS vars' },
  { group: 'Espacamento', keys: 'xs, sm, md, lg, xl, 2xl, 3xl', delivery: 'Tailwind scale' },
  { group: 'Tipografia', keys: 'font-sans, font-mono, text-xs ... text-5xl', delivery: 'CSS + Tailwind' },
  { group: 'Sombras', keys: 'shadow-sm, shadow-md, shadow-lg, shadow-xl', delivery: 'Tailwind utilities' },
  { group: 'Radius', keys: 'rounded-sm, rounded-md, rounded-lg, rounded-xl', delivery: 'CSS vars' },
]

export function TokenContractTable() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Contrato de Entrega</CardTitle>
        </CardHeader>
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grupo</TableHead>
                <TableHead>Chaves</TableHead>
                <TableHead>Formato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.group}>
                  <TableCell><Badge variant="secondary">{g.group}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{g.keys}</TableCell>
                  <TableCell className="text-muted-foreground">{g.delivery}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </section>
  )
}
