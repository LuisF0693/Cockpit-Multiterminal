// content-hierarchy-rules--guide.tsx
// Card content hierarchy rules: header, body, footer patterns.
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Badge, Separator, Button } from '@sinkra/ds-core'

export function ContentHierarchyRulesGuide() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Header/Body/Footer</Badge>
            <CardTitle>Regra de hierarquia</CardTitle>
            <CardDescription>Header: titulo e meta. Body: conteudo. Footer: acoes.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Conteudo principal do card com texto descritivo.</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm">Acao</Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Densidade</Badge>
            <CardTitle>Compacto vs Generoso</CardTitle>
            <CardDescription>Use padding menor (p-3) para listas densas, maior (p-6) para destaques.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </section>
  )
}
