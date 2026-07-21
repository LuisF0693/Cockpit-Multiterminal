// chart-usage-rules--reference.tsx
// Chart usage rules: when to use each type and color semantics.
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Card, CardHeader, CardTitle } from '@sinkra/ds-core'

const rules = [
  { chart: 'Linha', dados: 'Series temporal continua', minPoints: '5+', cor: 'Primary para destaque, muted para contexto' },
  { chart: 'Barra', dados: 'Categorias discretas', minPoints: '3-12', cor: 'Primary por categoria, accent para destaque' },
  { chart: 'Area', dados: 'Volume acumulado', minPoints: '5+', cor: 'Primary com opacidade 20%' },
  { chart: 'Pizza', dados: 'Proporcao de um todo', minPoints: '3-7', cor: 'Paleta distinta por segmento' },
]

export function ChartUsageRulesReference() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader><CardTitle>Regras de Uso</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Dados</TableHead>
              <TableHead>Min. pontos</TableHead>
              <TableHead>Cor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((r) => (
              <TableRow key={r.chart}>
                <TableCell><Badge variant="secondary">{r.chart}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{r.dados}</TableCell>
                <TableCell className="text-muted-foreground">{r.minPoints}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.cor}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </section>
  )
}
