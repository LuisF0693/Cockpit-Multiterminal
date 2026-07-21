// loading-and-empty--states.tsx
// Loading skeletons, progress, empty state, and retry patterns.
import { Card, CardHeader, CardContent, Skeleton, Progress, Button, Badge } from '@sinkra/ds-core'

export function LoadingAndEmptyStates() {
  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader><Badge variant="secondary">Skeleton</Badge></CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Badge variant="secondary">Progress</Badge></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Carregando dados...</p>
            <Progress value={45} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Badge variant="secondary">Vazio</Badge></CardHeader>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground mb-3">Nenhum resultado encontrado.</p>
            <Button variant="outline" size="sm">Limpar filtros</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Badge variant="secondary">Retry</Badge></CardHeader>
          <CardContent className="text-center py-8">
            <p className="text-destructive mb-3">Falha ao carregar.</p>
            <Button size="sm">Tentar novamente</Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
