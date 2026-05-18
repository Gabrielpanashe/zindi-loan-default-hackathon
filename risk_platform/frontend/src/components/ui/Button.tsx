import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-0",
  {
    variants: {
      variant: {
        primary:   "bg-[#3b82f6] text-white hover:bg-blue-500 active:bg-blue-700",
        secondary: "bg-[#243044] text-[#e8eef4] hover:bg-[#2d3d55] active:bg-[#1a2332]",
        ghost:     "bg-transparent text-[#8b9cb3] hover:text-[#e8eef4] hover:bg-[#243044]",
        success:   "bg-[#10b981] text-white hover:bg-emerald-500",
        danger:    "bg-[#ef4444] text-white hover:bg-red-500",
        outline:   "bg-transparent text-[#3b82f6] border border-[#3b82f6] hover:bg-[#3b82f6]/10",
      },
      size: {
        sm:  "px-3 py-1.5 text-sm",
        md:  "px-4 py-2 text-sm",
        lg:  "px-6 py-3 text-base",
        xl:  "px-8 py-4 text-lg",
        icon:"p-2",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
}

export function Button({ variant, size, className, children, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </button>
  );
}
