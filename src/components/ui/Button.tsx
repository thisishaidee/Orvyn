import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'inverse'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Shows a spinner, disables the button and sets aria-busy. */
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-navy text-white shadow-card hover:bg-brand-blue active:bg-brand-navy disabled:hover:bg-brand-navy',
  secondary:
    'bg-surface text-ink border border-line-strong hover:bg-brand-mist active:bg-brand-mist disabled:hover:bg-surface',
  destructive: 'bg-danger text-white shadow-card hover:bg-danger-dark active:bg-danger-dark disabled:hover:bg-danger',
  ghost: 'text-brand-blue hover:bg-brand-mist active:bg-brand-mist disabled:hover:bg-transparent',
  // For navy surfaces such as the mobile top bar and sidebar
  inverse:
    'focus-ring-dark border border-white/25 bg-white/10 text-white hover:bg-white/20 active:bg-white/20 disabled:hover:bg-white/10',
}

// md and lg meet the 44px touch target. sm is for dense desktop toolbars only.
const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-support gap-1.5',
  md: 'h-11 px-4 text-body gap-2',
  lg: 'h-12 px-6 text-body gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, iconLeft, iconRight, fullWidth, className, disabled, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-control font-medium transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  )
})
