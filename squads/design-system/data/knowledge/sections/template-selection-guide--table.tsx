// template-selection-guide--table.tsx
// Template selection guide: use case, density, best match.
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Card, CardHeader, CardTitle } from '@sinkra/ds-core'

const guides = [
  { caso: 'Captura de leads', densidade: 'Baixa', template: 'Landing Page' },
  { caso: 'Monitoramento de KPIs', densidade: 'Alta', template: 'Dashboard' },
  { caso: 'Referencia tecnica', densidade: 'Media', template: 'Documentacao' },
  { caso: 'Login/Cadastro', densidade: 'Minima', template: 'Autenticacao' },
  { caso: 'Catalogo de produtos', densidade: 'Media', template: 'Landing Page' },
  { caso: 'Admin de conteudo', densidade: 'Alta', template: 'Dashboard' },
]

export function TemplateSelectionGuideTable() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader><CardTitle>Guia de Selecao</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Caso de uso</TableHead>
              <TableHead>Densidade</TableHead>
              <TableHead>Template recomendado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guides.map((g, i) => (
              <TableRow key={i}>
                <TableCell className="text-muted-foreground">{g.caso}</TableCell>
                <TableCell><Badge variant="secondary">{g.densidade}</Badge></TableCell>
                <TableCell className="font-medium">{g.template}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </section>
  )
}
