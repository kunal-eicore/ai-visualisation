import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** §4.1 — six variants. There is deliberately no `success` variant: a green
 *  confirm button is not part of this system; use primary and carry the
 *  semantics in the label. */
type Variant = 'primary' | 'destructive' | 'secondary' | 'outline' | 'text' | 'neutral'
type Size = 'sm' | 'md' | 'lg'

const VARIANT: Record<Variant, string> = {
  primary:     'bg-btn-primary text-inverse hover:bg-btn-primary-hover active:bg-btn-primary-pressed',
  destructive: 'bg-danger-500 text-inverse hover:bg-danger-600 active:bg-danger-700',
  secondary:   'border border-brand-200 bg-brand-100 text-brand hover:bg-brand-200 hover:border-brand-300 active:bg-brand-300',
  outline:     'border border-brand-300 text-brand hover:border-brand-400 hover:bg-brand-50 active:bg-brand-100',
  text:        'text-brand hover:bg-btn-text-hover active:bg-brand-100',
  neutral:     'border border-btn-neutral bg-btn-neutral text-default hover:border-btn-neutral-hover hover:bg-btn-neutral-hover active:bg-btn-neutral-pressed',
}

/** §4.1 geometry — heights 32/40/48, radius 6/8/8, label Medium 13/14/16. */
const SIZE: Record<Size, string> = {
  sm: 'h-8 gap-2 rounded-md px-3 text-sm',
  md: 'h-10 gap-2 rounded-lg px-4 text-base',
  lg: 'h-12 gap-2 rounded-lg px-5 text-md',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}

/**
 * §4.1 Button. Focus is a 2px `button/focus-ring` — uniform across all six
 * variants, not an offset ring. Disabled uses dedicated tokens, never
 * `opacity-50`, because opacity on a filled button muddies the label.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-medium transition-colors duration-base',
        'focus-visible:outline-none focus-visible:shadow-focus',
        'disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-disabled',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
