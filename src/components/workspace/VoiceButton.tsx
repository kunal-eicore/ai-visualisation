import { useEffect, useRef } from 'react'
import { Mic } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * The composer's mic. Idle it is the same 36px ghost square as the clip;
 * listening, it widens into a primary block, square-cornered like the rest of
 * the row, with white bars that rise and fall with the voice. Clicking it
 * stops.
 */
export function VoiceButton({
  listening,
  analyser,
  disabled,
  error,
  onClick,
}: {
  listening: boolean
  analyser: AnalyserNode | null
  disabled: boolean
  error: string | null
  onClick: () => void
}) {
  const label = listening ? 'Stop dictation' : 'Dictate'
  return (
    <button
      type="button"
      disabled={disabled && !listening}
      aria-label={label}
      aria-pressed={listening}
      title={error ?? label}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center justify-center overflow-hidden transition-[width,background-color,color] duration-base',
        'focus-visible:outline-none focus-visible:shadow-focus',
        listening
          ? 'w-[112px] rounded-md bg-btn-primary px-3 text-inverse hover:bg-btn-primary-hover'
          : cn(
              'w-9 rounded-md hover:bg-neutral-100 hover:text-default disabled:cursor-not-allowed disabled:text-disabled disabled:hover:bg-transparent',
              error ? 'text-danger' : 'text-muted',
            ),
      )}
    >
      {listening ? <Bars analyser={analyser} /> : <Mic aria-hidden className="h-[18px] w-[18px]" />}
    </button>
  )
}

const BARS = 15
const BAR_W = 3
const GAP = 3
const H = 22
const MIN = 3
const W = BARS * BAR_W + (BARS - 1) * GAP

/**
 * Bars in fixed places, each rising and falling with the voice: tallest in
 * the middle, tapering to the edges. The voice band of the spectrum is
 * spread across the bars mirrored from the centre, so speech moves the
 * middle bars most. Heights are written straight onto the bars each frame;
 * a re-render per frame would redraw the whole composer.
 */
function Bars({ analyser }: { analyser: AnalyserNode | null }) {
  const bars = useRef<(SVGRectElement | null)[]>([])

  useEffect(() => {
    const bins = new Uint8Array(analyser?.frequencyBinCount ?? 0)
    const heights = new Array(BARS).fill(MIN)
    const mid = (BARS - 1) / 2
    let raf = 0

    const frame = () => {
      analyser?.getByteFrequencyData(bins)
      for (let i = 0; i < BARS; i++) {
        const fromMid = Math.abs(i - mid) / mid
        // Roughly 90 Hz to 3 kHz at a 48 kHz rate and 256 bins: where speech
        // carries its energy.
        const bin = 1 + Math.round(fromMid * 15)
        const energy = bins.length ? bins[bin] / 255 : 0
        const shape = 1 - 0.55 * fromMid
        const target = MIN + Math.min(1, energy * 1.3) * shape * (H - MIN)
        // Fast up, slower down, so syllables read without jitter.
        heights[i] += (target - heights[i]) * (target > heights[i] ? 0.5 : 0.18)
        const el = bars.current[i]
        if (el) {
          el.setAttribute('height', heights[i].toFixed(2))
          el.setAttribute('y', ((H - heights[i]) / 2).toFixed(2))
        }
      }
      raf = requestAnimationFrame(frame)
    }
    frame()
    return () => cancelAnimationFrame(raf)
  }, [analyser])

  return (
    <svg aria-hidden width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0 text-inverse">
      {Array.from({ length: BARS }, (_, i) => (
        <rect
          key={i}
          ref={(el) => (bars.current[i] = el)}
          x={i * (BAR_W + GAP)}
          y={(H - MIN) / 2}
          width={BAR_W}
          height={MIN}
          rx={BAR_W / 2}
          fill="currentColor"
        />
      ))}
    </svg>
  )
}
