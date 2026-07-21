import { Button } from '@/components/ui/button'
import { NonExistentIcon } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { SomeUnknownComponent } from '@/components/ui/unknown-component'

// This file is intentionally broken for testing validation scripts
// Issues: NonExistentIcon (invalid), useToast without Toaster provider
export function BrokenComponent() {
  const { toast } = useToast()

  return (
    <div>
      <NonExistentIcon />
      <SomeUnknownComponent />
      <Button onClick={() => toast({ title: 'Test' })}>Toast</Button>
    </div>
  )
}
