import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative rounded-lg border border-white/60 bg-white/75 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:rounded-t-lg before:bg-gradient-to-r before:from-emerald-400/80 before:via-primary/50 before:to-transparent text-card-foreground shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-16px_rgba(11,122,90,0.18)] ring-1 ring-black/[0.04] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_1px_2px_rgba(16,24,40,0.04),0_18px_40px_-16px_rgba(11,122,90,0.38)]",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1 p-5", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold leading-tight tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

/* Large centred header for the auth cards: icon tile, title, description */
function CardHero({
  icon,
  title,
  description,
  className,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("tf-hero flex flex-col items-center px-6 pb-6 pt-10 text-center sm:px-10 sm:pt-12", className)}>
      <span
        aria-hidden
        className="tf-hero-icon relative mb-6 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.375rem] bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800 text-white shadow-[0_14px_30px_-10px_rgba(4,120,87,0.6),inset_0_1px_0_rgba(255,255,255,0.35)] ring-[6px] ring-emerald-100/70 before:absolute before:-inset-4 before:-z-10 before:rounded-[2rem] before:bg-emerald-300/30 before:blur-xl [&>svg]:h-8 [&>svg]:w-8"
      >
        {icon}
      </span>
      <h3 className="tf-hero-title bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-800 bg-clip-text pb-0.5 font-extrabold tracking-tight text-transparent">
        {title}
      </h3>
      {description ? (
        <p className="mt-2.5 max-w-sm text-[0.9375rem] leading-6 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardHero };
