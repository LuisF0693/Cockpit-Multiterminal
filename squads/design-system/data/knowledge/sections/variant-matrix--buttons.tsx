// variant-matrix--buttons.tsx
// Button variant matrix showing all variants and sizes.
import { Button, Card, CardHeader, CardTitle, Badge } from '@sinkra/ds-core'

const variants = ['default', 'secondary', 'outline', 'ghost', 'destructive'] as const
const sizes = ['sm', 'default', 'lg'] as const

export function VariantMatrixButtons() {
  return (
    <section className="py-16 px-4 max-w-5xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Matriz de Variantes</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <div className="grid gap-6">
            {variants.map((variant) => (
              <div key={variant}>
                <Badge variant="secondary" className="mb-3">{variant}</Badge>
                <div className="flex items-center gap-3 flex-wrap">
                  {sizes.map((size) => (
                    <Button key={`${variant}-${size}`} variant={variant} size={size}>
                      {variant} {size}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </section>
  )
}
