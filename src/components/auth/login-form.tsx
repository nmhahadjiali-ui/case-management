"use client"

import * as React from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircleIcon, Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/shared/form-field"
import { signIn } from "@/lib/actions/auth"
import { loginSchema, type LoginInput } from "@/lib/validations/auth"

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  )
}

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [error, setError] = React.useState<string | null>(initialError ?? null)
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })
  const { isSubmitting, errors } = form.formState

  async function onSubmit(values: LoginInput) {
    setError(null)
    // On success the action redirects, so a result only comes back on failure.
    const result = await signIn(values, next)
    if (result && !result.ok) setError(result.error)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <FormError message={error} />
      <FormField label="Email" htmlFor="email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" autoFocus {...form.register("email")} />
      </FormField>
      <FormField label="Password" htmlFor="password" error={errors.password?.message}>
        <Input type="password" autoComplete="current-password" {...form.register("password")} />
      </FormField>
      <div className="-mt-2 text-right">
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />}
        Sign in
      </Button>
    </form>
  )
}
