import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90 active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:scale-[0.98]",
        ghost: "hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface IdempotentButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  preventDoubleClickMs?: number;
}

const IdempotentButton = React.forwardRef<HTMLButtonElement, IdempotentButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      loadingText,
      preventDoubleClickMs = 800,
      disabled,
      onClick,
      children,
      ...props
    },
    ref
  ) => {
    const [isInternalDebouncing, setIsInternalDebouncing] = React.useState(false);
    const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, []);

    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (isLoading || isInternalDebouncing || disabled) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        // Apply temporary double-click block
        setIsInternalDebouncing(true);
        debounceTimerRef.current = setTimeout(() => {
          setIsInternalDebouncing(false);
        }, preventDoubleClickMs);

        if (onClick) {
          onClick(e);
        }
      },
      [isLoading, isInternalDebouncing, disabled, preventDoubleClickMs, onClick]
    );

    const Component = asChild ? Slot : "button";
    const isDisabled = disabled || isLoading || isInternalDebouncing;

    return (
      <Component
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        onClick={handleClick}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText || children}
          </span>
        ) : (
          children
        )}
      </Component>
    );
  }
);

IdempotentButton.displayName = "IdempotentButton";

export { IdempotentButton, buttonVariants };
