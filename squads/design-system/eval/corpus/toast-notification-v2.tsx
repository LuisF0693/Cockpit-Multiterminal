import React from 'react'
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

/**
 * A toast notification trigger (variant) (broken variant - missing provider)
 */
export function ToastNotificationBroken() {
  const { toast } = useToast()
  return (
    <div>
      <Button onClick={() => toast({ title: 'Test' })}>
        A toast notification trigger (variant)
      </Button>
    </div>
  )
}
