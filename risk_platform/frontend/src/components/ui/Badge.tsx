import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const badgeVariants = cva(
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        low:    "bg-emerald-900/50 text-emerald-300 border border-emerald-700/40",
        medium: "bg-amber-900/50 text-amber-300 border border-amber-700/40",
        high:   "bg-red-900/50 text-red-300 border border-red-700/40",
        approve:"bg-emerald-900/50 text-emerald-300 border border-emerald-700/40",
        manual_review: "bg-amber-900/50 text-amber-300 border border-amber-700/40",
        reject: "bg-red-900/50 text-red-300 border border-red-700/40",
        admin:  "bg-purple-900/50 text-purple-300 border border-purple-700/40",
        loan_officer: "bg-blue-900/50 text-blue-300 border border-blue-700/40",
        risk_analyst: "bg-cyan-900/50 text-cyan-300 border border-cyan-700/40",
        applicant: "bg-slate-700/50 text-slate-300 border border-slate-600/40",
        default:"bg-[#243044] text-[#8b9cb3]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)}>
      {children}
    </span>
  );
}
