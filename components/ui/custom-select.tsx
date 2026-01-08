import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const CustomSelect = React.forwardRef<HTMLSelectElement, CustomSelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            "flex h-12 w-full rounded-full border-2 border-slate-300 bg-white px-4 py-2 pr-10 text-sm",
            "focus-visible:outline-none focus-visible:border-amber-500 focus-visible:ring-0",
            "transition-colors duration-200",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "appearance-none cursor-pointer",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <ChevronDown 
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" 
          strokeWidth={2}
        />
      </div>
    );
  }
);
CustomSelect.displayName = "CustomSelect";

export { CustomSelect };

