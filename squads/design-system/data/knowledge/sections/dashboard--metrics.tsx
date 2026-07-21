// dashboard--metrics.tsx
// KPI metrics strip with 4 metric cards. Responsive grid.
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@sinkra/ds-core'

const metrics = [
  { label: 'Receita Mensal', value: 'R$ 47.200', change: '+12%', trend: 'up' },
  { label: 'Usuarios Ativos', value: '2.847', change: '+8%', trend: 'up' },
  { label: 'Taxa de Conversao', value: '3.2%', change: '-0.4%', trend: 'down' },
  { label: 'Churn Rate', value: '1.8%', change: '-0.2%', trend: 'up' },
]

export function DashboardMetrics() {
  return (
    <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold">{metric.value}</span>
              <Badge
                variant={metric.trend === 'up' ? 'secondary' : 'destructive'}
                className="text-xs"
              >
                {metric.change}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  )
}
