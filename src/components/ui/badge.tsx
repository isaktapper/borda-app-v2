import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md px-2.5 py-1 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-blue-100 text-blue-600 [a&]:hover:bg-blue-200",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-grey-400",
        success:
          "bg-success/10 text-success [a&]:hover:bg-success/20",
        warning:
          "bg-warning/10 text-warning [a&]:hover:bg-warning/20",
        destructive:
          "bg-destructive/10 text-destructive [a&]:hover:bg-destructive/20",
        outline:
          "text-foreground [a&]:hover:bg-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
