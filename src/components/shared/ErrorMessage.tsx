import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppError } from "@/lib/errors"

export function ErrorMessage({ error }: { error: unknown }) {
  if (!error) return null

  const appError = AppError.fromUnknown(error)

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{appError.message}</AlertDescription>
    </Alert>
  )
}
