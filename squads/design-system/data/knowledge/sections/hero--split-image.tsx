// hero--split-image.tsx
// Split hero: text left, image placeholder right. Responsive stacking.
import { Badge, Button } from '@sinkra/ds-core'

export function HeroSplitImage() {
  return (
    <section className="grid md:grid-cols-2 items-center gap-12 py-24 px-4">
      <div className="flex flex-col gap-6">
        <Badge variant="secondary" className="w-fit">Lancamento</Badge>
        <h1 className="text-display font-semibold tracking-tight text-balance">
          Titulo com imagem ao lado
        </h1>
        <p className="text-body text-muted-foreground max-w-lg text-pretty">
          Texto de apoio que complementa o visual da imagem hero.
        </p>
        <div className="flex gap-3">
          <Button size="lg">Acao principal</Button>
          <Button size="lg" variant="outline">Acao secundaria</Button>
        </div>
      </div>
      <div className="relative aspect-[4/3] rounded-lg bg-muted overflow-hidden">
        {/* Replace with next/image in production */}
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          Hero Image
        </div>
      </div>
    </section>
  )
}
