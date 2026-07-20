import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/15 text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive/15 text-destructive",
        success: "border-transparent bg-success/15 text-success",
        warning: "border-transparent bg-warning/15 text-warning",
        accent: "border-transparent bg-accent/15 text-accent",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// Map domain statuses to badge variants for consistent colouring.
export function statusVariant(status) {
  const s = String(status || "").toLowerCase();
  if (["approved", "completed", "ongoing"].includes(s)) return "success";
  if (["pending", "scheduled", "draft"].includes(s)) return "warning";
  if (["rejected", "walkover"].includes(s)) return "destructive";
  if (["live", "registration open", "waitlisted"].includes(s)) return "accent";
  return "secondary";
}

export { badgeVariants };
