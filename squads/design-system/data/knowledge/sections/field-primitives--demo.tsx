// field-primitives--demo.tsx
// Form field primitives showcase with labels and validation.
import { Card, CardContent, Input, Textarea, Checkbox, Switch, Label, Tabs, TabsList, TabsTrigger, TabsContent } from '@sinkra/ds-core'

export function FieldPrimitivesDemo() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <Tabs defaultValue="text">
        <TabsList>
          <TabsTrigger value="text">Texto</TabsTrigger>
          <TabsTrigger value="selection">Selecao</TabsTrigger>
          <TabsTrigger value="toggle">Toggle</TabsTrigger>
        </TabsList>
        <TabsContent value="text">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" placeholder="Seu nome" className="mt-1" />
                <p className="text-sm text-muted-foreground mt-1">Texto de ajuda para o campo.</p>
              </div>
              <div>
                <Label htmlFor="bio">Biografia</Label>
                <Textarea id="bio" placeholder="Conte sobre voce" className="mt-1" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="selection">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox id="termos" />
                <Label htmlFor="termos">Aceito os termos de uso</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="toggle">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notif">Receber notificacoes</Label>
                <Switch id="notif" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  )
}
