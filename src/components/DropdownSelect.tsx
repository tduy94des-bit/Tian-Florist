import { useState, useRef, useEffect, type ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
}

interface DropdownSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  title?: string;
  className?: string;
  variant?: "field" | "pill" | "compact";
  icon?: ReactNode;
  align?: "left" | "right";
}

export function DropdownSelect({
  value,
  onChange,
  options,
  placeholder = "Chọn...",
  title,
  className = "",
  variant = "field",
  icon,
  align = "left",
}: DropdownSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  // Trigger style variants
  const getTriggerClass = () => {
    if (variant === "pill") {
      return "h-8 rounded-full px-3.5 text-xs font-semibold bg-white border border-border text-foreground hover:border-foreground/30 shadow-2xs";
    }
    if (variant === "compact") {
      return "h-8.5 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-2xs hover:border-primary/60";
    }
    // Default 'field'
    return "field flex items-center justify-between cursor-pointer text-sm font-medium";
  };

  return (
    <div className={`relative ${variant === "field" ? "w-full" : "inline-block"}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center justify-between gap-2 transition-all cursor-pointer ${getTriggerClass()} ${className}`}
      >
        <span className="flex items-center gap-2 truncate">
          {icon || selectedOption?.icon}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 opacity-60 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } top-full z-50 mt-1.5 min-w-[12rem] w-full max-h-64 overflow-y-auto rounded-[22px] border border-border/70 bg-card p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in-50 zoom-in-95`}
        >
          {title && (
            <div className="px-3 pt-1.5 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1">
              {title}
            </div>
          )}

          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-all text-left ${
                    isSelected
                      ? "bg-[#EFF2EB] dark:bg-primary/15 text-foreground font-bold shadow-2xs"
                      : "text-foreground font-medium hover:bg-muted/70"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate pr-2">
                    {opt.icon}
                    <span className="truncate">{opt.label}</span>
                  </span>

                  <span className="flex items-center gap-1.5 shrink-0">
                    {opt.badge}
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary shrink-0 stroke-[2.5]" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
