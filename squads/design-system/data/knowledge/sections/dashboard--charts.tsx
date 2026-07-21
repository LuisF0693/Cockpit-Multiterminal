// dashboard--charts.tsx
// Dashboard chart section with area chart and bar chart side by side.
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@sinkra/ds-core'

// Note: In production, use Recharts through the local shadcn chart wrapper.
// This snippet shows the structural pattern; replace placeholder with real chart components.

const revenueData = [
  { month: 'Jan', value: 18600 },
  { month: 'Fev', value: 22100 },
  { month: 'Mar', value: 19800 },
  { month: 'Abr', value: 31200 },
  { month: 'Mai', value: 28900 },
  { month: 'Jun', value: 47200 },
]

const channelData = [
  { channel: 'Organico', leads: 340 },
  { channel: 'Pago', leads: 280 },
  { channel: 'Referral', leads: 190 },
  { channel: 'Direto', leads: 120 },
]

export function DashboardCharts() {
  return (
    <section className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Receita Mensal</CardTitle>
          <CardDescription>Evolucao dos ultimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Replace with: <ChartContainer><AreaChart data={revenueData} ... /></ChartContainer> */}
          <div className="h-64 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-sm">
            Area Chart — {revenueData.length} data points
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Leads por Canal</CardTitle>
          <CardDescription>Distribuicao do mes atual</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Replace with: <ChartContainer><BarChart data={channelData} ... /></ChartContainer> */}
          <div className="h-64 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-sm">
            Bar Chart — {channelData.length} channels
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
