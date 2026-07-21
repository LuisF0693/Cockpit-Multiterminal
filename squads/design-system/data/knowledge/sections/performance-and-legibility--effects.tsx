// performance-and-legibility--effects.tsx
// Performance and legibility guidance for visual effects.
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Card, CardHeader, CardTitle } from '@sinkra/ds-core'

const effects = [
  { efeito: 'backdrop-blur', perf: 'Medio', a11y: 'OK se contraste mantido', fallback: 'Fundo solido com opacidade' },
  { efeito: 'Overlay escuro', perf: 'Baixo', a11y: 'Melhora legibilidade', fallback: 'N/A' },
  { efeito: 'Glow / shadow', perf: 'Baixo', a11y: 'Decorativo apenas', fallback: 'Borda solida' },
  { efeito: 'Grain / noise', perf: 'Alto (SVG filter)', a11y: 'Pode reduzir legibilidade', fallback: 'Remover em mobile' },
]

export function PerformanceAndLegibilityEffects() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader><CardTitle>Performance e Legibilidade</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Efeito</TableHead>
              <TableHead>Custo</TableHead>
              <TableHead>Acessibilidade</TableHead>
              <TableHead>Fallback</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {effects.map((e) => (
              <TableRow key={e.efeito}>
                <TableCell><Badge variant="secondary">{e.efeito}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{e.perf}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{e.a11y}</TableCell>
                <TableCell className="text-muted-foreground">{e.fallback}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </section>
  )
}
