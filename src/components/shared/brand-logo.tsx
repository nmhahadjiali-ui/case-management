import { ScaleIcon } from "lucide-react"
import { APP_NAME } from "@/lib/constants"
import { cn } from "@/lib/utils"

const SIZES = {
  sm: { box: "size-9 rounded-lg", icon: "size-5" },
  md: { box: "size-10 rounded-lg", icon: "size-5" },
  lg: { box: "size-14 rounded-xl", icon: "size-7" },
  xl: { box: "size-24 rounded-2xl", icon: "size-12" },
}

/** The application logo: an uploaded image when set, otherwise the default scales tile. */
export function BrandLogo({ src, size = "sm", className }: { src?: string | null; size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size]
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote, admin-uploaded image of unknown size
      <img src={src} alt={`${APP_NAME} logo`} className={cn("shrink-0 object-contain", s.box, className)} />
    )
  }
  return (
    <div className={cn("flex shrink-0 items-center justify-center bg-primary text-primary-foreground", s.box, className)}>
      <ScaleIcon className={s.icon} aria-hidden />
    </div>
  )
}
