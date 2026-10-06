/** @type {import('tailwindcss').Config} */

/*
 * Token layer — DESIGN.md §2, one-to-one with the DS semantic names so
 * Figma and code share a vocabulary (§2.2 "Tailwind mapping").
 *
 * The scales are split (textColor / backgroundColor / borderColor) on
 * purpose: it is what lets a class read exactly the way DESIGN.md §5
 * writes it — `text-default`, `bg-surface-card`, `border-strong` — even
 * though `text/default` (#111118) and `border/default` (#e4e4ec) are
 * different values that would collide in one flat `colors` map.
 *
 * LIGHT ONLY. DESIGN.md §2.2/§7: the status tone triples, brand/bg,
 * brand/text, primary, ring, input, destructive and border/focus carry
 * no Dark value, and patching them with inline `dark:` hex is called out
 * as a defect. Dark mode is explicitly deferred (§8 checklist) until
 * those tokens gain Dark values in Figma — see README.
 */

// §2.2 status tone triples. The whole status palette.
const tone = {
  brand:   { bg: '#ededfd', border: '#807aed', fg: '#5046e5' },
  neutral: { bg: '#f2f2f5', border: '#7878a0', fg: '#3a3a48' },
  success: { bg: '#edfaf4', border: '#a3ddc8', fg: '#065f46' },
  info:    { bg: '#eff6ff', border: '#93c5fd', fg: '#1e40af' },
  warning: { bg: '#fef6e7', border: '#fcd28a', fg: '#c97c10' },
  alert:   { bg: '#fff7ed', border: '#fed7aa', fg: '#c2410c' },
  danger:  { bg: '#fef2f2', border: '#f87878', fg: '#d63b3b' },
}
const toneBg = Object.fromEntries(Object.entries(tone).map(([k, v]) => [`${k}-bg`, v.bg]))
const toneFg = Object.fromEntries(Object.entries(tone).map(([k, v]) => [`${k}-fg`, v.fg]))
const toneBorder = Object.fromEntries(Object.entries(tone).map(([k, v]) => [k, v.border]))

// §2.1 primitive ramps. Referenced only by the semantic tokens above,
// plus chart accents and progress tracks (mode-invariant, so allowed).
const ramp = {
  brand:   { 50:'#f6f5fe',100:'#ededfd',200:'#dbd8fb',300:'#c4c1f9',400:'#a39df3',500:'#807aed',600:'#685fea',700:'#5046e5',800:'#4339c8',900:'#3730a3',950:'#1e1a5e' },
  neutral: { 0:'#ffffff',50:'#f9f9fb',100:'#f2f2f5',200:'#eaeaef',300:'#e4e4ec',400:'#d0d0de',500:'#b0b0c4',600:'#7878a0',700:'#3a3a48',800:'#1f1f29',900:'#111118',950:'#08080d' },
  success: { 50:'#edfaf4',100:'#d4f4e6',200:'#a3ddc8',300:'#6ec9aa',400:'#36b487',500:'#0d9966',600:'#0a7d54',700:'#065f46',800:'#04473a',900:'#033026',950:'#021a14' },
  danger:  { 50:'#fef2f2',100:'#fde0e0',200:'#fca5a5',300:'#f87878',400:'#e85050',500:'#d63b3b',600:'#b92929',700:'#991b1b',800:'#7d1414',900:'#5d0d0d',950:'#2e0606' },
  warning: { 50:'#fef6e7',100:'#fdebc6',200:'#fcd28a',300:'#faba5e',400:'#e89832',500:'#c97c10',600:'#a26308',700:'#7c4a00',800:'#5d3700',900:'#3e2500',950:'#221400' },
  info:    { 50:'#eff6ff',100:'#dbeafe',200:'#93c5fd',300:'#60a5fa',400:'#3b82f6',500:'#1d6fa4',600:'#185a87',700:'#1e40af',800:'#163275',900:'#102254',950:'#08112a' },
}
// Callout tones (§4.9) are -50 / -200 / -700 — a different recipe from the
// Badge triple, so the ramp steps are exposed under flat keys too.
const calloutSteps = {}
for (const [name, steps] of Object.entries(ramp)) {
  for (const step of [50, 200, 700]) calloutSteps[`${name}-${step}`] = steps[step]
}

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        // §2.3 — IDs, codes, numeric data. Badge labels are mono (§4.11).
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },

      // §2.3 type scale — anchored on a 14px body, denser than Tailwind's default.
      fontSize: {
        xs:    ['12px', { lineHeight: '1.4'  }],
        sm:    ['13px', { lineHeight: '1.5'  }],
        base:  ['14px', { lineHeight: '1.5'  }],
        md:    ['16px', { lineHeight: '1.5'  }],
        lg:    ['18px', { lineHeight: '1.5'  }],
        xl:    ['22px', { lineHeight: '1.35' }],
        '2xl': ['28px', { lineHeight: '1.25' }],
        '3xl': ['36px', { lineHeight: '1.2'  }],
        '4xl': ['56px', { lineHeight: '1.1'  }],
      },

      colors: { brand: ramp.brand, neutral: ramp.neutral, success: ramp.success,
                danger: ramp.danger, warning: ramp.warning, info: ramp.info },

      textColor: {
        default:  'rgb(var(--text-default) / <alpha-value>)',
        subtle:   'rgb(var(--text-subtle) / <alpha-value>)',
        muted:    'rgb(var(--text-muted) / <alpha-value>)',
        disabled: 'rgb(var(--text-disabled) / <alpha-value>)',
        inverse:  'rgb(var(--text-inverse) / <alpha-value>)',
        brand:    '#5046e5',
        danger:   '#991b1b',
        primary:  'rgb(var(--primary) / <alpha-value>)',
        // Chart gridlines/labels resolve through currentColor.
        gridline: '#e4e4ec',
        ...toneFg,
      },

      backgroundColor: {
        'surface-page':   'rgb(var(--surface-page) / <alpha-value>)',
        'surface-card':   'rgb(var(--surface-card) / <alpha-value>)',
        'surface-raised': 'rgb(var(--surface-raised) / <alpha-value>)',
        'surface-sunken': 'rgb(var(--surface-sunken) / <alpha-value>)',
        primary:          'rgb(var(--primary) / <alpha-value>)',
        ...toneBg,
        ...calloutSteps,
        // §2.2 button families — never rebuild a button from ramp steps.
        'btn-primary':          '#5046e5',
        'btn-primary-hover':    '#3730a3',
        'btn-primary-pressed':  '#1e1a5e',
        'btn-neutral':          '#ffffff',
        'btn-neutral-hover':    '#f9f9fb',
        'btn-neutral-pressed':  '#f2f2f5',
        'btn-text-hover':       '#f6f5fe',
      },

      borderColor: {
        DEFAULT: 'rgb(var(--border-default) / <alpha-value>)',
        default: 'rgb(var(--border-default) / <alpha-value>)',
        subtle:  'rgb(var(--border-subtle) / <alpha-value>)',
        strong:  'rgb(var(--border-strong) / <alpha-value>)',
        focus:   '#5046e5',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'focus-ring':  '#c4c1f9',
        'btn-neutral': '#d0d0de',
        'btn-neutral-hover': '#b0b0c4',
        ...toneBorder,
        ...calloutSteps,
        /* Chart marks only. A line or block that carries a reading has to
         * clear 3:1 against the card behind it (WCAG 1.4.11), and the
         * semantic border tokens top out at border/strong #d0d0de — 1.4:1,
         * which is right for a divider and unreadable as the edge of a
         * plotted region. Same licence as the chart accents in `colors`
         * above: ramp steps, mode-invariant, charts only. */
        'neutral-500': ramp.neutral[500],
        'neutral-600': ramp.neutral[600],
        'neutral-800': ramp.neutral[800],
        'brand-500':   ramp.brand[500],
      },

      // §2.5 — cards are 8, not 16. Badges 6. Empty state 12.
      borderRadius: { none: '0', sm: '4px', md: '6px', lg: '8px', xl: '12px', '2xl': '16px', full: '9999px' },

      // §2.6 — measured elevation; layered and soft, never one hard drop.
      boxShadow: {
        card:    '0 1px 3px rgba(0,0,0,0.06)',
        classic: '0 2px 8px rgba(0,0,0,0.10)',
        panel:   '0 12px 24px rgba(0,0,0,0.12)',
        popover: '0 8px 16px -4px rgba(0,0,0,0.12)',
        control: '0 1px 2px rgba(16,24,40,0.05)',
        // §4.1/§6 focus is a 2px focus-ring *border*. Drawn as a 0-blur inset
        // ring so it lands where a border would without shifting layout.
        focus:   'inset 0 0 0 2px #c4c1f9',
        // §2.6 flat spread rings for fields — 0 blur, 3 spread.
        'focus-field':   '0 0 0 3px #eff6ff',
        'invalid-field': '0 0 0 3px rgba(214,59,59,0.20)',
      },

      // §2.7
      transitionDuration: { fast: '120ms', base: '200ms', slow: '350ms' },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
        out: 'cubic-bezier(0, 0, 0.2, 1)',
        spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        /* The assistant tab arriving at the right edge once the step has
         * settled. It rests flush against the edge and comes a few pixels
         * INTO the page on hover, rather than hanging off the screen. */
        'tab-in': {
          '0%':   { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        /* A row whose values are being recomputed, and the settle once they
         * land. The only colour in this file that is not a token definition —
         * it is a token *use*, so it reads from the brand ramp above. */
        'row-pulse': {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%':      { backgroundColor: ramp.brand[100] },
        },
        'reveal': {
          '0%':   { opacity: '0', transform: 'translateY(3px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        /* The placeholder's own entrance — it fades up into the space the
         * value vacated rather than appearing on the next frame, so a row
         * going to skeleton reads as a state change and not as a repaint. */
        'skeleton-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        /* The band that travels across a placeholder. A transform, not a
         * background-position: at the 40-70px widths these run at, a
         * percentage offset barely moves and the pill reads as static. */
        shimmer: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 220ms cubic-bezier(0.4,0,0.2,1) both',
        'fade-in': 'fade-in 180ms cubic-bezier(0.4,0,0.2,1) both',
        /* `backwards`, not `both`: the fill must release at the end or it
         * pins the transform and the hover slide never happens. */
        'tab-in':  'tab-in 520ms cubic-bezier(0.22,1,0.36,1) 450ms backwards',
        shimmer:   'shimmer 1.2s cubic-bezier(0.4,0,0.2,1) infinite',
        'agent-orbit': 'agent-orbit 2.6s linear infinite',
        'agent-pulse': 'agent-pulse 1.15s cubic-bezier(0.4,0,0.2,1) infinite',
        sweep:      'sweep 1.5s linear infinite',
        /* The entrance only. The travelling band is a `shimmer` bar inside
         * the placeholder — animating a transform rather than a background
         * position is what actually reads as movement at this size. */
        skeleton:   'skeleton-in 450ms cubic-bezier(0,0,0.2,1) both',
        'row-pulse': 'row-pulse 2.1s cubic-bezier(0.4,0,0.2,1) infinite',
        reveal:     'reveal 550ms cubic-bezier(0.22,1,0.36,1) both',
      },
    },
  },
  plugins: [],
}
