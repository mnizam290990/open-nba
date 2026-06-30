import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(...inputs));
}

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        high: "bg-red-500/15 text-red-600 dark:text-red-400",
        medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        low: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-current",
        partial: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
        "post-event": "bg-purple-500/15 text-purple-600 dark:text-purple-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
