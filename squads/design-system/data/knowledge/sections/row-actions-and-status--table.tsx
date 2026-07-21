// row-actions-and-status--table.tsx
// Table row actions, selection state, and status badges.
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Card, CardHeader, CardTitle } from '@sinkra/ds-core'

const rows = [
  { nome: 'Campanha A', status: 'Ativo', acoes: true },
  { nome: 'Campanha B', status: 'Rascunho', acoes: true },
  { nome: 'Campanha C', status: 'Encerrado', acoes: false },
]

export function RowActionsAndStatusTable() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader><CardTitle>Acoes por Linha</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.nome}>
                <TableCell className="font-medium">{row.nome}</TableCell>
                <TableCell>
                  <Badge variant={row.status === 'Ativo' ? 'default' : 'secondary'}>{row.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {row.acoes ? (
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm">Editar</Button>
                      <Button variant="ghost" size="sm">Duplicar</Button>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sem acoes</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </section>
  )
}
