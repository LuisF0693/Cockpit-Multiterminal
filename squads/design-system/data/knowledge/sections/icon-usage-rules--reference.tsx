// icon-usage-rules--reference.tsx
// Icon usage rules: with label, standalone, decorative vs semantic.
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Card, CardHeader, CardTitle } from '@sinkra/ds-core'

const rules = [
  { uso: 'Com label', desc: 'Icone + texto. Padrao para botoes e menus.', contraste: 'Herda do texto', a11y: 'aria-hidden no icone' },
  { uso: 'Standalone', desc: 'Apenas icone (icon button). Requer aria-label.', contraste: 'Minimo 3:1', a11y: 'aria-label obrigatorio' },
  { uso: 'Decorativo', desc: 'Icone sem funcao semantica (ilustracao).', contraste: 'N/A', a11y: 'aria-hidden=true' },
  { uso: 'Status', desc: 'Indica estado (check, erro, warning).', contraste: 'Semantica de cor', a11y: 'role=img + aria-label' },
]

export function IconUsageRulesReference() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader><CardTitle>Regras de Uso de Icones</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Descricao</TableHead>
              <TableHead>Contraste</TableHead>
              <TableHead>A11y</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((r) => (
              <TableRow key={r.uso}>
                <TableCell><Badge variant="secondary">{r.uso}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.desc}</TableCell>
                <TableCell className="text-muted-foreground">{r.contraste}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.a11y}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </section>
  )
}
