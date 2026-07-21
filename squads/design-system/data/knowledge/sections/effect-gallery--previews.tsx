// effect-gallery--previews.tsx
// Visual effects gallery: blur, overlay, grain, glow.
import { Card, CardHeader, CardTitle, CardDescription, Badge } from '@sinkra/ds-core'

export function EffectGalleryPreviews() {
  return (
    <section className="py-16 px-4">
      <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card>
          <div className="h-24 rounded-t-lg bg-primary/30 backdrop-blur-sm" />
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Blur</Badge>
            <CardTitle className="text-base">Desfoque de fundo</CardTitle>
            <CardDescription>backdrop-blur-sm para overlays translucidos.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <div className="h-24 rounded-t-lg bg-foreground/60" />
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Overlay</Badge>
            <CardTitle className="text-base">Sobreposicao escura</CardTitle>
            <CardDescription>Opacidade 60% sobre imagens para legibilidade.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Glow</Badge>
            <CardTitle className="text-base">Brilho sutil</CardTitle>
            <CardDescription>shadow-primary/20 para destaque de elementos interativos.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Grain</Badge>
            <CardTitle className="text-base">Textura granulada</CardTitle>
            <CardDescription>Noise overlay para atmosfera editorial. Usar com moderacao.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </section>
  )
}
