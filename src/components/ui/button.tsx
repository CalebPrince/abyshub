import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Square, uppercase and heavy — the buttons carry a lot of the brand.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-display text-xs font-bold uppercase tracking-[0.1em] transition-all active:translate-y-px disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/60 focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/25 cursor-pointer",
  {
    variants: {
      variant: {
        // The gradient is a highlight over the variant's own colour rather than
        // a fixed pair, so every variant picks up the same lit-from-above feel
        // without hardcoding a second shade per theme.
        default:
          "bg-primary text-primary-foreground bg-linear-to-b from-white/18 to-black/12 shadow-md shadow-primary/30 hover:bg-brand-pink-deep hover:shadow-lg",
        destructive:
          "bg-destructive text-destructive-foreground bg-linear-to-b from-white/18 to-black/12 shadow-md shadow-destructive/30 hover:bg-brand-pink-deep hover:shadow-lg",
        // Stays transparent so it can sit on the dark sections too; the
        // shadow alone carries the raised feel here.
        outline:
          "border border-foreground/25 bg-transparent shadow-sm hover:border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-md",
        secondary:
          "bg-secondary text-secondary-foreground bg-linear-to-b from-white/14 to-black/16 shadow-md hover:shadow-lg",
        accent:
          "bg-accent text-accent-foreground bg-linear-to-b from-white/18 to-black/12 shadow-md shadow-accent/30 hover:shadow-lg",
        ghost:
          "font-sans text-sm font-medium normal-case tracking-normal hover:bg-foreground/6 hover:shadow-sm",
        link: "font-sans text-sm font-medium normal-case tracking-normal text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 gap-1.5 px-3.5 text-[11px]",
        lg: "h-12 px-7 text-sm",
        icon: "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
