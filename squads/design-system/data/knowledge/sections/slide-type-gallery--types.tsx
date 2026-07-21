// slide-type-gallery--types.tsx
// Slide type gallery: title, data, quote, closing.
import { Card, CardHeader, CardDescription, Badge } from '@sinkra/ds-core'

export function SlideTypeGalleryTypes() {
  return (
    <section className="py-16 px-4 max-w-5xl mx-auto">
      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <div className="aspect-video bg-primary rounded-t-lg flex items-center justify-center">
            <span className="text-primary-foreground text-2xl font-bold">Titulo</span>
          </div>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Titulo</Badge>
            <CardDescription>Slide de abertura com nome da apresentacao e subtitulo.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Grafico / Dados</span>
          </div>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Dados</Badge>
            <CardDescription>Slide com graficos, metricas e insights quantitativos.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <div className="aspect-video bg-accent rounded-t-lg flex items-center justify-center px-8">
            <span className="text-accent-foreground italic text-center">"Citacao impactante aqui"</span>
          </div>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Citacao</Badge>
            <CardDescription>Slide de destaque com quote do cliente ou lideranca.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <div className="aspect-video bg-foreground rounded-t-lg flex items-center justify-center">
            <span className="text-background text-lg font-semibold">Obrigado</span>
          </div>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Fechamento</Badge>
            <CardDescription>Slide final com CTA, contato ou proximos passos.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </section>
  )
}
