// timing-tokens--reference.tsx
// Motion timing and easing reference.
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Card, CardHeader, CardTitle } from '@sinkra/ds-core'

const durations = [
  { name: 'instant', value: '0ms', context: 'Feedback imediato (checkbox toggle)' },
  { name: 'fast', value: '100ms', context: 'Hover states, tooltips' },
  { name: 'normal', value: '200ms', context: 'Transicoes padrao (fade, slide)' },
  { name: 'slow', value: '300ms', context: 'Modais, expansoes' },
  { name: 'slower', value: '500ms', context: 'Animacoes complexas, page transitions' },
]

const easings = [
  { name: 'linear', value: 'linear', context: 'Progress bars, countdowns' },
  { name: 'easeOut', value: 'cubic-bezier(0, 0, 0.2, 1)', context: 'Elementos entrando (padrao)' },
  { name: 'easeIn', value: 'cubic-bezier(0.4, 0, 1, 1)', context: 'Elementos saindo' },
  { name: 'easeInOut', value: 'cubic-bezier(0.4, 0, 0.2, 1)', context: 'Transicoes internas' },
]

export function TimingTokensReference() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto space-y-8">
      <Card>
        <CardHeader><CardTitle>Duracoes</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Nome</TableHead><TableHead>Valor</TableHead><TableHead>Contexto</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {durations.map((d) => (
              <TableRow key={d.name}>
                <TableCell><Badge variant="secondary">{d.name}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{d.value}</TableCell>
                <TableCell className="text-muted-foreground">{d.context}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card>
        <CardHeader><CardTitle>Easings</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Nome</TableHead><TableHead>Valor</TableHead><TableHead>Contexto</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {easings.map((e) => (
              <TableRow key={e.name}>
                <TableCell><Badge variant="secondary">{e.name}</Badge></TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{e.value}</TableCell>
                <TableCell className="text-muted-foreground">{e.context}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </section>
  )
}
