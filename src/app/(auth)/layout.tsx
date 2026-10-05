import { ScaleIcon } from "lucide-react"
import { AppFooter } from "@/components/layout/app-footer"
import { APP_NAME, APP_TAGLINE } from "@/lib/constants"

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ScaleIcon className="size-5" aria-hidden />
        </div>
        <div className="leading-tight">
          <p className="text-lg font-semibold">{APP_NAME}</p>
          <p className="text-xs text-muted-foreground">{APP_TAGLINE}</p>
        </div>
      </div>
      <div className="w-full max-w-sm">{children}</div>
      {/* The About page needs a session, so no link here. */}
      <AppFooter className="mt-10" showAboutLink={false} />
    </div>
  )
}
