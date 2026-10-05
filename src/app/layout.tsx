import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { SplashScreen } from "@/components/layout/splash-screen"
import { APP_NAME, APP_TAGLINE, SPLASH_SEEN_KEY } from "@/lib/constants"
import { DEFAULT_FAVICON, getBranding } from "@/lib/data/branding"
import "./globals.css"

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export async function generateMetadata(): Promise<Metadata> {
  const { appLogoUrl } = await getBranding()
  return {
    title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
    description: APP_TAGLINE,
    // The browser-tab icon follows the app logo setting (Settings → Branding).
    icons: { icon: appLogoUrl ? [{ url: appLogoUrl }] : [{ url: DEFAULT_FAVICON, type: "image/svg+xml" }] },
  }
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { splashLogoUrl } = await getBranding()
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Hide the splash before first paint if this tab has already seen it. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(sessionStorage.getItem(${JSON.stringify(SPLASH_SEEN_KEY)}))document.documentElement.dataset.splash="off"}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full">
        <SplashScreen logoUrl={splashLogoUrl} />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider delay={300}>{children}</TooltipProvider>
          <Toaster richColors closeButton position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
