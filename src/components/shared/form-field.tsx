import * as React from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type FormFieldProps = {
  label: string
  htmlFor: string
  error?: string
  description?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

/** Label + control + validation message, with the right ARIA wiring. */
export function FormField({ label, htmlFor, error, description, required, className, children }: FormFieldProps) {
  const errorId = `${htmlFor}-error`
  const descId = `${htmlFor}-desc`
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </Label>
      {React.isValidElement<Record<string, unknown>>(children)
        ? React.cloneElement(children, {
            id: htmlFor,
            "aria-invalid": error ? true : undefined,
            "aria-describedby": cn(error && errorId, description && descId) || undefined,
          })
        : children}
      {description && !error && (
        <p id={descId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/** Titled group of fields inside a form. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("grid gap-4 border-b pb-6 last:border-b-0 last:pb-0", className)}>
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}
