import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-[8px] border border-hairline-strong bg-white px-3.5 text-base outline-none transition-colors selection:bg-green-soft selection:text-green-dark placeholder:text-stone disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-hairline-soft disabled:text-stone",
        "focus-visible:border-2 focus-visible:border-green-dark focus-visible:ring-0",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
