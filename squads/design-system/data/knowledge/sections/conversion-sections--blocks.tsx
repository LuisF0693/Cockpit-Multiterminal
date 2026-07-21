// conversion-sections--blocks.tsx
// Landing page conversion sections: feature grid, pricing, FAQ, final CTA.
import { Card, CardHeader, CardTitle, CardDescription, Button, Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@sinkra/ds-core'

export function ConversionSectionsBlocks() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto space-y-16">
      <div>
        <h2 className="text-2xl font-semibold text-center mb-8">Recursos principais</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {['Automacao', 'Analytics', 'Integracao'].map((f) => (
            <Card key={f}>
              <CardHeader>
                <CardTitle className="text-base">{f}</CardTitle>
                <CardDescription>Descricao concisa do recurso e seu valor.</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-center mb-8">Perguntas frequentes</h2>
        <Accordion type="single" collapsible className="max-w-2xl mx-auto">
          <AccordionItem value="1">
            <AccordionTrigger>Quanto tempo leva para implementar?</AccordionTrigger>
            <AccordionContent>A implementacao padrao leva entre 2 e 4 semanas.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="2">
            <AccordionTrigger>Posso cancelar a qualquer momento?</AccordionTrigger>
            <AccordionContent>Sim, sem fidelidade. Cancele quando quiser.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      <div className="text-center py-12 bg-muted rounded-xl">
        <h2 className="text-2xl font-semibold mb-4">Pronto para comecar?</h2>
        <p className="text-muted-foreground mb-6">Teste gratis por 14 dias. Sem cartao de credito.</p>
        <Button size="lg">Criar conta gratis</Button>
      </div>
    </section>
  )
}
