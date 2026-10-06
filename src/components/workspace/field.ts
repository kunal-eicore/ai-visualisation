/* The §0.5 primitive set has no text field, and two explorations now need one
 * (the workbench's context form, the harness's credential form). It stays a
 * class recipe rather than becoming a half-considered shared Input component.
 * Geometry is DESIGN.md §2.6: 1px border, radius 6, flat 3px spread ring on
 * focus. */
export const FIELD =
  'w-full rounded-md border border-strong bg-surface-card px-2.5 py-1.5 text-base text-default placeholder:text-muted ' +
  'transition-shadow duration-base focus:border-focus focus:outline-none focus:shadow-focus-field'
