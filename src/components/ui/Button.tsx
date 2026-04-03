import type { ReactNode, ButtonHTMLAttributes } from "react";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
}

const variantClasses = {
  primary: "bg-accent text-white active:brightness-90",
  secondary: "bg-card border border-border-light text-text active:brightness-90",
  danger: "bg-danger text-white active:brightness-90",
  ghost: "bg-transparent text-text-soft active:bg-border",
} as const;

const sizeClasses = {
  sm: "min-h-11 px-3 text-sm",
  md: "min-h-11 px-5 text-base",
  lg: "min-h-12 px-6 text-lg",
} as const;

export default function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`rounded-xl font-medium transition-all select-none inline-flex items-center justify-center ${variantClasses[variant]} ${sizeClasses[size]} ${
        disabled ? "opacity-40 pointer-events-none" : "cursor-pointer"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
