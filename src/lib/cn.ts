/** Tiny classnames joiner — drops falsy values (DESIGN.md §4). No clsx, no
 *  tailwind-merge; variants are plain lookup maps joined by this. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
