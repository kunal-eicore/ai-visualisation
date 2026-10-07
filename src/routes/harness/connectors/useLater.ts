import { useEffect, useRef } from 'react'
import { TEST_MS } from './data'

/** A delayed, cancellable step — the stand-in for a network round trip. A
 *  new call replaces the pending one, and unmounting cancels it. */
export function useLater() {
  const timer = useRef<number>()
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (fn: () => void) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(fn, TEST_MS)
  }
}
