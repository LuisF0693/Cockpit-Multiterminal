// presentation-rules--slides.tsx
// Presentation rules: aspect ratio, density, and speaker-distance guidance.
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Card, CardHeader, CardTitle } from '@sinkra/ds-core'

const rules = [
  { regra: 'Aspect ratio', valor: '16:9 padrao', nota: 'Compativel com projetores e telas.' },
  { regra: 'Densidade max', valor: '6 linhas / 6 palavras', nota: 'Regra 6x6 para legibilidade.' },
  { regra: 'Fonte minima', valor: '24pt corpo, 36pt titulo', nota: 'Legivel a 5 metros de distancia.' },
  { regra: 'Contraste', valor: 'WCAG AA minimo', nota: 'Projetores reduzem contraste em 30%.' },
  { regra: 'Animacao', valor: 'Apenas fade e slide', nota: 'Sem efeitos distraidores.' },
]

export function PresentationRulesSlides() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader><CardTitle>Regras de Apresentacao</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Regra</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Observacao</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((r) => (
              <TableRow key={r.regra}>
                <TableCell><Badge variant="secondary">{r.regra}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{r.valor}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.nota}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </section>
  )
}
