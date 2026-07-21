// global-nav--desktop-mobile.tsx
// Global navigation: desktop and mobile patterns.
import { Button, Badge, Card, CardHeader, CardTitle, CardDescription } from '@sinkra/ds-core'

export function GlobalNavDesktopMobile() {
  return (
    <section className="py-16 px-4 max-w-5xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <Badge variant="secondary" className="w-fit">Desktop</Badge>
          <CardTitle className="text-base">Navegacao Desktop</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between border rounded-lg p-4 bg-muted">
            <span className="font-semibold">Logo</span>
            <nav className="flex gap-6">
              <span className="text-sm font-medium text-primary">Home</span>
              <span className="text-sm text-muted-foreground">Produtos</span>
              <span className="text-sm text-muted-foreground">Precos</span>
              <span className="text-sm text-muted-foreground">Contato</span>
            </nav>
            <Button size="sm">CTA</Button>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader>
          <Badge variant="secondary" className="w-fit">Mobile</Badge>
          <CardTitle className="text-base">Navegacao Mobile</CardTitle>
          <CardDescription>Menu hamburger com sheet lateral. Touch targets minimo 44px.</CardDescription>
        </CardHeader>
      </Card>
    </section>
  )
}
