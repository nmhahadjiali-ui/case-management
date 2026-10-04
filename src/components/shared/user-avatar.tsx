import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export function initials(name: string | null | undefined) {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?"
}

export function UserAvatar({
  name,
  src,
  size = "default",
  className,
}: {
  name: string | null | undefined
  src?: string | null
  size?: "sm" | "default" | "lg"
  className?: string
}) {
  return (
    <Avatar size={size} className={className}>
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback className={cn("bg-primary/10 font-medium text-primary", size === "sm" && "text-[10px]")}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
