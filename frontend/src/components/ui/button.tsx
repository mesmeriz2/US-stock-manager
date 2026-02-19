import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm sm:text-base font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg hover-lift',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md hover:shadow-lg hover-lift',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:shadow-md hover-lift',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md hover-lift',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        gradient: 'gradient-primary text-white shadow-md hover:shadow-lg hover-lift hover:opacity-90',
        gradientSuccess: 'gradient-success text-white shadow-md hover:shadow-lg hover-lift hover:opacity-90',
        gradientDanger: 'gradient-danger text-white shadow-md hover:shadow-lg hover-lift hover:opacity-90',
      },
      size: {
        default: 'h-11 min-h-[44px] px-4 sm:px-6 py-2',  // 터치 타겟 44px 이상
        sm: 'h-10 min-h-[40px] rounded-md px-3 sm:px-4 text-xs sm:text-sm',
        lg: 'h-12 min-h-[48px] rounded-md px-6 sm:px-8 text-base sm:text-lg',
        icon: 'h-11 w-11 min-h-[44px] min-w-[44px]',  // 터치 타겟 최소 크기
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };








