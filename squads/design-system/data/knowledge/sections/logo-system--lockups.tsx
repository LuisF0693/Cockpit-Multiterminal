// logo-system--lockups.tsx
// Logo system: primary, secondary, mark-only, and inverse variants.
import { Card, CardHeader, CardTitle, CardDescription, Badge, Separator } from '@sinkra/ds-core'

export function LogoSystemLockups() {
  return (
    <section className="py-16 px-4">
      <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card>
          <div className="h-24 bg-background flex items-center justify-center rounded-t-lg border-b">
            <span className="text-2xl font-bold text-foreground">LOGO</span>
          </div>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Primario</Badge>
            <CardTitle className="text-base">Lockup principal</CardTitle>
            <CardDescription>Uso padrao em fundos claros.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <div className="h-24 bg-background flex items-center justify-center rounded-t-lg border-b">
            <span className="text-lg font-semibold text-foreground">LOGO</span>
          </div>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Secundario</Badge>
            <CardTitle className="text-base">Lockup compacto</CardTitle>
            <CardDescription>Para espacos reduzidos e footers.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <div className="h-24 bg-background flex items-center justify-center rounded-t-lg border-b">
            <span className="text-3xl font-bold text-primary">L</span>
          </div>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Marca</Badge>
            <CardTitle className="text-base">Apenas marca</CardTitle>
            <CardDescription>Favicon, avatar, icones de app.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <div className="h-24 bg-foreground flex items-center justify-center rounded-t-lg">
            <span className="text-2xl font-bold text-background">LOGO</span>
          </div>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Inverso</Badge>
            <CardTitle className="text-base">Fundo escuro</CardTitle>
            <CardDescription>Para fundos escuros ou coloridos.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </section>
  )
}
