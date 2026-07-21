// breakpoints-and-layering--table.tsx
// Breakpoints and z-index layering reference.
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Card, CardHeader, CardTitle } from '@sinkra/ds-core'

const breakpoints = [
  { name: 'sm', value: '640px', target: 'Celular landscape' },
  { name: 'md', value: '768px', target: 'Tablet' },
  { name: 'lg', value: '1024px', target: 'Desktop' },
  { name: 'xl', value: '1280px', target: 'Desktop grande' },
  { name: '2xl', value: '1536px', target: 'Ultra-wide' },
]

const layers = [
  { name: 'base', value: '0', uso: 'Conteudo normal' },
  { name: 'dropdown', value: '100', uso: 'Menus e selects' },
  { name: 'sticky', value: '200', uso: 'Headers fixos' },
  { name: 'modal', value: '300', uso: 'Dialogs e sheets' },
  { name: 'toast', value: '400', uso: 'Notificacoes' },
  { name: 'tooltip', value: '500', uso: 'Tooltips' },
]

export function BreakpointsAndLayeringTable() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto space-y-8">
      <Card>
        <CardHeader><CardTitle>Breakpoints</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prefixo</TableHead>
              <TableHead>Largura minima</TableHead>
              <TableHead>Dispositivo alvo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {breakpoints.map((bp) => (
              <TableRow key={bp.name}>
                <TableCell><Badge variant="secondary">{bp.name}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{bp.value}</TableCell>
                <TableCell className="text-muted-foreground">{bp.target}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card>
        <CardHeader><CardTitle>Camadas (z-index)</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Camada</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Uso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {layers.map((layer) => (
              <TableRow key={layer.name}>
                <TableCell><Badge variant="secondary">{layer.name}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{layer.value}</TableCell>
                <TableCell className="text-muted-foreground">{layer.uso}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </section>
  )
}
