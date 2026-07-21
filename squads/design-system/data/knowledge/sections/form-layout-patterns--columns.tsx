// form-layout-patterns--columns.tsx
// Form layout patterns: single-column, two-column, and dense.
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label, Badge } from '@sinkra/ds-core'

export function FormLayoutPatternsColumns() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <Badge variant="secondary" className="w-fit">Coluna unica</Badge>
          <CardTitle className="text-base">Formulario simples</CardTitle>
          <CardDescription>Ideal para fluxos curtos de 3-5 campos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Email</Label><Input placeholder="email@exemplo.com" className="mt-1" /></div>
          <div><Label>Senha</Label><Input type="password" placeholder="Sua senha" className="mt-1" /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Badge variant="secondary" className="w-fit">Duas colunas</Badge>
          <CardTitle className="text-base">Formulario extenso</CardTitle>
          <CardDescription>Para cadastros com muitos campos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Nome</Label><Input placeholder="Nome" className="mt-1" /></div>
            <div><Label>Sobrenome</Label><Input placeholder="Sobrenome" className="mt-1" /></div>
            <div><Label>Telefone</Label><Input placeholder="(11) 99999-9999" className="mt-1" /></div>
            <div><Label>Cidade</Label><Input placeholder="Sao Paulo" className="mt-1" /></div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
