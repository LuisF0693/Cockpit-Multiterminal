// validation-and-submission--patterns.tsx
// Form validation and submission state patterns.
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, Progress } from '@sinkra/ds-core'

export function ValidationAndSubmissionPatterns() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <div className="grid sm:grid-cols-2 gap-6">
        <Card className="border-red-500 border-l-4">
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Erro</Badge>
            <CardTitle className="text-base">Validacao falhou</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">Campo obrigatorio nao preenchido.</p>
            <Button variant="destructive" size="sm" className="mt-3">Tentar novamente</Button>
          </CardContent>
        </Card>
        <Card className="border-green-500 border-l-4">
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Sucesso</Badge>
            <CardTitle className="text-base">Enviado com sucesso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Seus dados foram salvos.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Carregando</Badge>
            <CardTitle className="text-base">Enviando...</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={65} className="mb-3" />
            <Button disabled>Processando...</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Hierarquia</Badge>
            <CardTitle className="text-base">Botoes de submit</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button>Salvar</Button>
            <Button variant="outline">Cancelar</Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
