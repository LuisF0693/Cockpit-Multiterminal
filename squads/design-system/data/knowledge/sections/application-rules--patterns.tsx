// application-rules--patterns.tsx
// Pattern application rules: where to use and where to avoid.
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Card, CardHeader, CardTitle } from '@sinkra/ds-core'

const rules = [
  { pattern: 'Grid overlay', onde: 'Backgrounds de hero, secoes decorativas', proibido: 'Sobre texto, tabelas de dados', densidade: 'Sutil' },
  { pattern: 'Linhas horizontais', onde: 'Separadores de secao, headers', proibido: 'Dentro de cards, formularios', densidade: 'Minima' },
  { pattern: 'Textura', onde: 'Fundos de secao, areas de destaque', proibido: 'Textos longos, areas de leitura', densidade: 'Muito sutil' },
  { pattern: 'Frame', onde: 'Destaques, quotes, testemunhos', proibido: 'Botoes, inputs, navegacao', densidade: 'Moderada' },
]

export function ApplicationRulesPatterns() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader><CardTitle>Regras de Aplicacao</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Padrao</TableHead>
              <TableHead>Onde usar</TableHead>
              <TableHead>Proibido</TableHead>
              <TableHead>Densidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((r) => (
              <TableRow key={r.pattern}>
                <TableCell><Badge variant="secondary">{r.pattern}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.onde}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.proibido}</TableCell>
                <TableCell className="text-muted-foreground">{r.densidade}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </section>
  )
}
