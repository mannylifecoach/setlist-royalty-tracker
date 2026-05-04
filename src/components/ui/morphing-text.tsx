"use client"

import { useEffect, useRef, useState } from "react"

const WORDS = ["setlist", "royalty", "tracker", "srt"]
const MORPH_TIME = 1.5
const COOLDOWN_TIME = 0.5

export function MorphingText({ className = "" }: { className?: string }) {
  const text1Ref = useRef<HTMLSpanElement>(null)
  const text2Ref = useRef<HTMLSpanElement>(null)
  const stateRef = useRef({ morph: 0, cooldown: COOLDOWN_TIME, idx: 0 })
  const rafRef = useRef<number>(0)
  const prevTimeRef = useRef(0)
  const [filterId, setFilterId] = useState("")

  // generate filter ID on client only to avoid hydration mismatch.
  // setState-in-effect is the correct pattern here — we explicitly need
  // a different ID value than what was rendered on the server.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilterId(`liquid-${Math.random().toString(36).slice(2, 8)}`)
  }, [])

  useEffect(() => {
    if (!filterId) return
    const t1 = text1Ref.current
    const t2 = text2Ref.current
    if (!t1 || !t2) return

    t2.textContent = WORDS[0]
    t1.textContent = WORDS[1]

    const animate = (now: number) => {
      const dt = prevTimeRef.current ? (now - prevTimeRef.current) / 1000 : 0
      prevTimeRef.current = now
      const s = stateRef.current
      s.morph += dt

      if (s.cooldown > 0) {
        // pausing between words — show current word solid
        s.cooldown -= dt
        t2.style.filter = ""
        t2.style.opacity = "100%"
        t1.style.filter = ""
        t1.style.opacity = "0%"

        if (s.cooldown <= 0) {
          s.morph = 0
        }
      } else {
        // morphing
        let frac = s.morph / MORPH_TIME

        if (frac > 1) {
          frac = 1
          s.cooldown = COOLDOWN_TIME
          const prev = s.idx
          s.idx = (s.idx + 1) % WORDS.length
          t2.textContent = WORDS[s.idx]
          t1.textContent = WORDS[(s.idx + 1) % WORDS.length]
        }

        // outgoing (t2 → old word fading out when frac starts, but we want crossfade)
        // Actually: t2 = current visible word, t1 = next word fading in
        // So t2 fades out and t1 fades in
        const inv = 1 - frac
        t2.style.filter = `blur(${Math.min(8 / Math.max(inv, 0.01) - 8, 100)}px)`
        t2.style.opacity = `${Math.pow(Math.max(inv, 0), 0.4) * 100}%`
        t1.style.filter = `blur(${Math.min(8 / Math.max(frac, 0.01) - 8, 100)}px)`
        t1.style.opacity = `${Math.pow(frac, 0.4) * 100}%`
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [filterId])

  if (!filterId) {
    // SSR / first render: show static text
    return (
      <span className={`inline-block relative ${className}`}>
        <span
          className="lowercase tracking-[-2px]"
          style={{ fontFamily: "var(--font-marker), 'Sora', sans-serif", fontWeight: 800 }}
        >
          {WORDS[0]}
        </span>
      </span>
    )
  }

  return (
    <span className={`inline-block relative ${className}`}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id={filterId}>
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>
      <span
        className="inline-block relative"
        style={{ filter: `url(#${filterId}) blur(0.6px)` }}
      >
        <span
          ref={text2Ref}
          className="inline-block lowercase tracking-[-2px]"
          style={{ fontFamily: "var(--font-marker), 'Sora', sans-serif", fontWeight: 800 }}
        >
          {WORDS[0]}
        </span>
        <span
          ref={text1Ref}
          className="inline-block lowercase tracking-[-2px] absolute left-0 top-0"
          style={{
            fontFamily: "var(--font-marker), 'Sora', sans-serif", fontWeight: 800,
            opacity: "0%",
          }}
        >
          {WORDS[1]}
        </span>
      </span>
    </span>
  )
}
