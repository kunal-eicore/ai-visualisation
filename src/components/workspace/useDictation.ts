import { useEffect, useRef, useState } from 'react'

/* The Web Speech API is not in TypeScript's DOM lib; this is the slice of it
   dictation uses. Chrome and Safari ship it prefixed. */
type Recognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type RecognitionCtor = new () => Recognition

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * Browser dictation, plus a live read of the microphone for the wave.
 *
 * Two consumers of one microphone: the recogniser turns speech into text, and
 * an analyser on a separate stream gives the level the wave is drawn from —
 * the recogniser does not expose one. `onText` gets everything heard since
 * `start`, interim words included, so the box fills as the person speaks.
 */
export function useDictation(onText: (heard: string) => void) {
  const [listening, setListening] = useState(false)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const rec = useRef<Recognition | null>(null)
  // Set across the permission prompt, so a second click cannot start a
  // second recogniser before the first exists.
  const starting = useRef(false)
  const audio = useRef<{ ctx: AudioContext; stream: MediaStream } | null>(null)
  const textRef = useRef(onText)
  textRef.current = onText

  const supported = typeof window !== 'undefined' && recognitionCtor() !== null

  const release = () => {
    rec.current = null
    audio.current?.stream.getTracks().forEach((t) => t.stop())
    void audio.current?.ctx.close()
    audio.current = null
    setAnalyser(null)
    setListening(false)
  }

  const stop = () => {
    // `onend` follows and releases; release now as well so the pill closes
    // on the click rather than when the recogniser gets round to it.
    rec.current?.stop()
    release()
  }

  const start = async () => {
    const Ctor = recognitionCtor()
    if (!Ctor || rec.current || starting.current) return
    starting.current = true
    setError(null)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Microphone access is blocked')
      return
    } finally {
      starting.current = false
    }
    const ctx = new AudioContext()
    const node = ctx.createAnalyser()
    node.fftSize = 512
    ctx.createMediaStreamSource(stream).connect(node)
    audio.current = { ctx, stream }

    const r = new Ctor()
    r.continuous = true
    r.interimResults = true
    r.lang = navigator.language || 'en-IN'
    r.onresult = (e) => {
      let heard = ''
      for (let i = 0; i < e.results.length; i++) heard += e.results[i][0].transcript
      textRef.current(heard.trim())
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setError('Microphone access is blocked')
      else if (e.error !== 'aborted' && e.error !== 'no-speech') setError('Dictation stopped')
    }
    r.onend = () => {
      if (rec.current === r) release()
    }
    rec.current = r
    setAnalyser(node)
    setListening(true)
    r.start()
  }

  useEffect(
    () => () => {
      rec.current?.abort()
      audio.current?.stream.getTracks().forEach((t) => t.stop())
      void audio.current?.ctx.close()
    },
    [],
  )

  return { supported, listening, analyser, error, start, stop }
}
