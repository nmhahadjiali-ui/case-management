"use client"

import * as React from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2Icon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/shared/form-field"
import { FormError } from "@/components/auth/login-form"
import { changePassword, requestPasswordReset, resetPassword } from "@/lib/actions/auth"
import {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@/lib/validations/auth"

export function ForgotPasswordForm() {
  const [sent, setSent] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })
  const { isSubmitting, errors } = form.formState

  async function onSubmit(values: ForgotPasswordInput) {
    setError(null)
    const result = await requestPasswordReset(values)
    if (result.ok) setSent(result.message ?? "Check your email.")
    else setError(result.error)
  }

  if (sent) {
    return (
      <div className="grid gap-4 text-sm">
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{sent}</p>
        </div>
        <Link href="/login" className="text-center text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <FormError message={error} />
      <FormField label="Email" htmlFor="email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" autoFocus {...form.register("email")} />
      </FormField>
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />}
        Send reset link
      </Button>
      <Link href="/login" className="text-center text-sm text-primary hover:underline">
        Back to sign in
      </Link>
    </form>
  )
}

export function ResetPasswordForm() {
  const [error, setError] = React.useState<string | null>(null)
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })
  const { isSubmitting, errors } = form.formState

  async function onSubmit(values: ResetPasswordInput) {
    setError(null)
    const result = await resetPassword(values)
    if (result && !result.ok) setError(result.error)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <FormError message={error} />
      <FormField label="New password" htmlFor="password" error={errors.password?.message}>
        <Input type="password" autoComplete="new-password" autoFocus {...form.register("password")} />
      </FormField>
      <FormField label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
        <Input type="password" autoComplete="new-password" {...form.register("confirmPassword")} />
      </FormField>
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />}
        Update password
      </Button>
    </form>
  )
}

export function ChangePasswordForm() {
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
  })
  const { isSubmitting, errors } = form.formState

  async function onSubmit(values: ChangePasswordInput) {
    const result = await changePassword(values)
    if (result.ok) {
      toast.success(result.message ?? "Password updated.")
      form.reset()
    } else {
      if (result.fieldErrors?.currentPassword) {
        form.setError("currentPassword", { message: result.fieldErrors.currentPassword[0] })
      }
      toast.error(result.error)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-md gap-4" noValidate>
      <FormField label="Current password" htmlFor="currentPassword" error={errors.currentPassword?.message}>
        <Input type="password" autoComplete="current-password" {...form.register("currentPassword")} />
      </FormField>
      <FormField
        label="New password"
        htmlFor="password"
        error={errors.password?.message}
        description="At least 8 characters, including a letter and a number."
      >
        <Input type="password" autoComplete="new-password" {...form.register("password")} />
      </FormField>
      <FormField label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
        <Input type="password" autoComplete="new-password" {...form.register("confirmPassword")} />
      </FormField>
      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />}
          Change password
        </Button>
      </div>
    </form>
  )
}
