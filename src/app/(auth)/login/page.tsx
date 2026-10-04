import type { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = { title: "Sign in" }

const ERRORS: Record<string, string> = {
  inactive: "Your account has been deactivated. Contact an administrator.",
  link: "That link is invalid or has expired. Please try again.",
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined
  const next = typeof params.next === "string" ? params.next : undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sign in</CardTitle>
        <CardDescription>Enter your email and password to access your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm next={next} initialError={error} />
      </CardContent>
    </Card>
  )
}
