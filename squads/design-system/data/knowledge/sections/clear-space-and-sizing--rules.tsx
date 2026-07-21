// clear-space-and-sizing--rules.tsx
// Logo clear space and minimum sizing rules.
import { Card, CardHeader, CardTitle, CardDescription, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '@sinkra/ds-core'

export function ClearSpaceAndSizingRules() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Area de protecao</CardTitle>
            <CardDescription>
              Manter espaco minimo de 1x a altura do simbolo ao redor do logo. Nenhum elemento pode invadir esta area.
            </CardDescription>
            <div className="mt-4 border-2 border-dashed border-muted-foreground/30 p-8 rounded-lg flex items-center justify-center">
              <span className="font-bold text-xl">LOGO</span>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tamanho minimo</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Formato</TableHead>
                <TableHead>Minimo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell><Badge variant="secondary">Digital</Badge></TableCell>
                <TableCell className="text-muted-foreground">80px de largura</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Badge variant="secondary">Impresso</Badge></TableCell>
                <TableCell className="text-muted-foreground">20mm de largura</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Badge variant="secondary">Favicon</Badge></TableCell>
                <TableCell className="text-muted-foreground">16x16px (marca apenas)</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </div>
    </section>
  )
}
