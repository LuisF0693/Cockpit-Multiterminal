// table-foundation--demo.tsx
// Data table foundation with sortable columns and density modes.
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Card, CardHeader, CardTitle, Badge, Button, ScrollArea } from '@sinkra/ds-core'

const rows = [
  { id: 1, nome: 'Projeto Alpha', status: 'Ativo', criado: '12/03/2026' },
  { id: 2, nome: 'Projeto Beta', status: 'Pausado', criado: '28/02/2026' },
  { id: 3, nome: 'Projeto Gamma', status: 'Concluido', criado: '15/01/2026' },
]

export function TableFoundationDemo() {
  return (
    <section className="py-16 px-4 max-w-5xl mx-auto">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Projetos</CardTitle>
          <Button variant="outline" size="sm">Filtrar</Button>
        </CardHeader>
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground">{row.id}</TableCell>
                  <TableCell className="font-medium">{row.nome}</TableCell>
                  <TableCell><Badge variant="secondary">{row.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{row.criado}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </section>
  )
}
