// motion-demos--transitions.tsx
// Motion demo examples: enter, exit, hover, page transition.
import { Card, CardHeader, CardTitle, CardDescription, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '@sinkra/ds-core'

export function MotionDemosTransitions() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Tabs defaultValue="enter">
        <TabsList>
          <TabsTrigger value="enter">Entrada</TabsTrigger>
          <TabsTrigger value="exit">Saida</TabsTrigger>
          <TabsTrigger value="hover">Hover</TabsTrigger>
          <TabsTrigger value="page">Pagina</TabsTrigger>
        </TabsList>
        <TabsContent value="enter">
          <Card>
            <CardHeader>
              <Badge variant="secondary" className="w-fit">fadeIn + slideUp</Badge>
              <CardTitle className="text-base">Animacao de entrada</CardTitle>
              <CardDescription>Opacity 0 para 1 + translateY 8px para 0. Duracao: normal (200ms). Easing: easeOut.</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
        <TabsContent value="exit">
          <Card>
            <CardHeader>
              <Badge variant="secondary" className="w-fit">fadeOut</Badge>
              <CardTitle className="text-base">Animacao de saida</CardTitle>
              <CardDescription>Opacity 1 para 0. Duracao: fast (100ms). Easing: easeIn.</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
        <TabsContent value="hover">
          <Card>
            <CardHeader>
              <Badge variant="secondary" className="w-fit">hover scale</Badge>
              <CardTitle className="text-base">Hover interativo</CardTitle>
              <CardDescription>Scale 1.02 + shadow-md. Duracao: fast (100ms). Easing: easeOut.</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
        <TabsContent value="page">
          <Card>
            <CardHeader>
              <Badge variant="secondary" className="w-fit">pageTransition</Badge>
              <CardTitle className="text-base">Transicao de pagina</CardTitle>
              <CardDescription>Cross-fade com duracao slower (500ms). Apenas para navegacao principal.</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  )
}
