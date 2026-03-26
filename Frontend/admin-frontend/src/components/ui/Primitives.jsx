import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion } from "motion/react";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- Button ---
export const Button = React.forwardRef(
  ({ className, variant = "primary", size = "md", loading, children, ...props }, ref) => {
    const variants = {
      primary: "bg-cyan-500 text-black hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] border border-transparent",
      secondary: "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700",
      ghost: "bg-transparent text-slate-400 hover:text-white hover:bg-white/5",
      danger: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20",
      outline: "bg-transparent border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
    };

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50",
          variants[variant],
          sizes[size],
          className
        )}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading ? (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";

// --- Input ---
export const Input = React.forwardRef(
  ({ className, icon, ...props }, ref) => {
    return (
      <div className="relative group">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-cyan-400">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "flex h-10 w-full rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
            icon && "pl-10",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

// --- Card ---
export const Card = React.forwardRef(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-white/5 bg-slate-900/40 backdrop-blur-xl p-6 shadow-xl",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

// --- Badge ---
export const Badge = ({ children, variant = "default", className }) => {
  const variants = {
    default: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    danger: "bg-red-500/10 text-red-400 border-red-500/20",
    neutral: "bg-slate-800 text-slate-400 border-slate-700",
  };
  
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", variants[variant], className)}>
      {children}
    </span>
  );
}

// --- Avatar ---
export const Avatar = React.forwardRef(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
);
Avatar.displayName = "Avatar";

export const AvatarImage = React.forwardRef(
  ({ className, ...props }, ref) => (
    <img
      ref={ref}
      className={cn("aspect-square h-full w-full", className)}
      {...props}
    />
  )
);
AvatarImage.displayName = "AvatarImage";

export const AvatarFallback = React.forwardRef(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-slate-800 text-slate-400",
        className
      )}
      {...props}
    />
  )
);
AvatarFallback.displayName = "AvatarFallback";
