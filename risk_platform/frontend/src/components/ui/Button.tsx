import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 font-semibold rounded-xl",
    "transition-all duration-200 cursor-pointer select-none border-0",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
    "active:scale-[0.97]",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "bg-[#3b82f6] text-white",
          "hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5",
        ].join(" "),
        secondary: [
          "bg-[#243044] text-[#e8eef4]",
          "hover:bg-[#2d3d55] hover:shadow-md hover:shadow-black/30 hover:-translate-y-0.5",
        ].join(" "),
        ghost: [
          "bg-transparent text-[#8b9cb3]",
          "hover:text-[#e8eef4] hover:bg-[#243044]/70",
        ].join(" "),
        success: [
          "bg-[#10b981] text-white",
          "hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5",
        ].join(" "),
        danger: [
          "bg-[#ef4444] text-white",
          "hover:bg-red-400 hover:shadow-lg hover:shadow-red-500/30 hover:-translate-y-0.5",
        ].join(" "),
        outline: [
          "bg-transparent text-[#3b82f6] border-2 border-[#3b82f6]",
          "hover:bg-[#3b82f6] hover:text-white hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5",
        ].join(" "),
        "outline-white": [
          "bg-transparent text-white border-2 border-white/70",
          "hover:bg-white hover:text-[#0f1419] hover:-translate-y-0.5",
        ].join(" "),
      },
      size: {
        sm:   "px-3.5 py-1.5 text-sm",
        md:   "px-4 py-2.5 text-sm",
        lg:   "px-6 py-3 text-base",
        xl:   "px-8 py-4 text-lg",
        icon: "p-2.5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ variant, size, className, children, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </button>
  );
}
