import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-60", {
  variants: {
    variant: {
      primary: "btn-primary",
      secondary: "btn-secondary",
      dark: "btn-dark",
    },
  },
  defaultVariants: { variant: "primary" },
});

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant }), className)} {...props} />;
}