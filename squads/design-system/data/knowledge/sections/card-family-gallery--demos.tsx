// card-family-gallery--demos.tsx
// Card family gallery: basic, feature, article, profile.
import { Card, CardHeader, CardTitle, CardDescription, CardFooter, Badge, Button } from '@sinkra/ds-core'

export function CardFamilyGalleryDemos() {
  return (
    <section className="py-16 px-4">
      <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Basico</Badge>
            <CardTitle>Card basico</CardTitle>
            <CardDescription>Container simples para conteudo agrupado.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <span className="text-primary">*</span>
            </div>
            <Badge variant="secondary" className="w-fit">Feature</Badge>
            <CardTitle>Card de recurso</CardTitle>
            <CardDescription>Com icone e acao. Ideal para grids de funcionalidades.</CardDescription>
          </CardHeader>
          <CardFooter><Button variant="ghost" size="sm">Saiba mais</Button></CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-32 bg-muted rounded-lg mb-3" />
            <Badge variant="secondary" className="w-fit">Artigo</Badge>
            <CardTitle>Card de artigo</CardTitle>
            <CardDescription>Com imagem, titulo e resumo. Para blogs e feeds.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-primary/20" />
              <div>
                <CardTitle className="text-base">Nome da pessoa</CardTitle>
                <CardDescription>Cargo ou funcao</CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="w-fit">Perfil</Badge>
          </CardHeader>
        </Card>
      </div>
    </section>
  )
}
