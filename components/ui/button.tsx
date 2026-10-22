import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.98] active:ring-2 active:ring-primary/40 active:ring-offset-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variant === "default" &&
            "relative overflow-hidden after:pointer-events-none after:absolute after:inset-0 after:-translate-x-full after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:transition-transform after:duration-700 hover:after:translate-x-full bg-gradient-to-b from-emerald-600 to-primary font-semibold text-primary-foreground shadow-[0_1px_2px_rgba(16,24,40,0.10),inset_0_1px_0_rgba(255,255,255,0.18)] hover:shadow-[0_8px_22px_-6px_rgba(11,122,90,0.55)] hover:brightness-105",
          variant === "secondary" &&
            "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
          variant === "destructive" &&
            "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
          variant === "outline" &&
            "border border-border bg-white/70 text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.05)] backdrop-blur-md hover:border-primary/60 hover:bg-accent/80 hover:text-primary hover:shadow-[0_6px_18px_-8px_rgba(11,122,90,0.45)]",
          variant === "ghost" &&
            "hover:bg-accent hover:text-primary",
          size === "default" && "h-9 px-4",
          size === "sm" && "h-8 rounded-md px-3 text-xs",
          size === "lg" && "h-11 rounded-md px-6 text-[15px]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
