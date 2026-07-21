// component-family-grid--cards.tsx
// Component family grid with counts and route links.
import { Card, CardHeader, CardTitle, CardDescription, Badge, Button } from '@sinkra/ds-core'

const families = [
  { name: 'Atoms', count: 14, desc: 'Button, Input, Badge, Checkbox, Switch, Toggle...', route: '/brandbook/buttons' },
  { name: 'Molecules', count: 8, desc: 'Alert, Card, Field, Popover, Tooltip, Breadcrumb...', route: '/brandbook/forms' },
  { name: 'Organisms', count: 8, desc: 'Dialog, Sheet, Table, Tabs, Accordion, Select...', route: '/brandbook/tables' },
]

export function ComponentFamilyGridCards() {
  return (
    <section className="py-16 px-4">
      <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {families.map((f) => (
          <Card key={f.name}>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-lg">{f.name}</CardTitle>
                <Badge>{f.count}</Badge>
              </div>
              <CardDescription>{f.desc}</CardDescription>
              <Button variant="ghost" size="sm" className="mt-3 w-fit">Ver todos</Button>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
