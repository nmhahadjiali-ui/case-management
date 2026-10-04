"use client"

import { useEffect } from "react"
import { AlertTriangleIcon, RotateCcwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangleIcon className="size-6 text-destructive" aria-hidden />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Something went wrong.</h1>
        <p className="text-sm text-muted-foreground">Please try again. If the problem continues, contact your administrator.</p>
      </div>
      <Button onClick={reset}>
        <RotateCcwIcon /> Try again
      </Button>
    </div>
  )
}
