import { cn } from '@/lib/cn'
import logomark from '@/assets/logomark.png'
import wordmark from '@/assets/wordmark.png'

type LogoProps = {
  /** Show only the logomark (collapsed sidebar). */
  markOnly?: boolean
  className?: string
}

/** Brand mark — logomark paired with the wordmark.
 *  Asset-dependent: swap `src/assets/*.png` per brand (DESIGN.md §02). */
export function Logo({ markOnly = false, className }: LogoProps) {
  return (
    <div className={cn('flex select-none items-center gap-2', className)}>
      <img src={logomark} alt="" aria-hidden className="h-[30px] w-[30px] shrink-0" />
      {!markOnly && <img src={wordmark} alt="Eicore" className="h-5 w-auto" />}
    </div>
  )
}
