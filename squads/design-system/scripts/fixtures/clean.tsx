import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'

export function CleanComponent() {
  return (
    <Card>
      <CardHeader>
        <CheckCircle className="h-4 w-4" />
        <h2>Clean Component</h2>
      </CardHeader>
      <CardContent>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  )
}
