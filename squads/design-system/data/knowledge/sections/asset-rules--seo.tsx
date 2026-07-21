// asset-rules--seo.tsx
// SEO asset rules: image aspect ratios, fallbacks, copy length guidance.
import { Card, CardHeader, CardTitle, CardDescription, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@sinkra/ds-core'

const assets = [
  { tipo: 'OG Image', ratio: '1200x630 (1.91:1)', fallback: 'Logo centralizado em fundo brand' },
  { tipo: 'Twitter Card', ratio: '1200x600 (2:1)', fallback: 'Mesma OG image (crop automatico)' },
  { tipo: 'Favicon', ratio: '32x32, 16x16', fallback: 'Marca do logo' },
  { tipo: 'Apple Touch', ratio: '180x180', fallback: 'Marca com padding' },
]

export function AssetRulesSeo() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader><CardTitle>Regras de Assets</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Dimensao/Ratio</TableHead>
              <TableHead>Fallback</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((a) => (
              <TableRow key={a.tipo}>
                <TableCell><Badge variant="secondary">{a.tipo}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{a.ratio}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.fallback}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="px-6 pb-6 mt-4">
          <CardDescription>
            Titulo meta: 50-60 caracteres. Descricao meta: 120-155 caracteres. Ambos devem conter a keyword principal.
          </CardDescription>
        </div>
      </Card>
    </section>
  )
}
