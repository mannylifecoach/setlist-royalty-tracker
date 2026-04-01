"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import React from "react"

export function CircuitCTA() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
    }

    resize()
    window.addEventListener("resize", resize)

    const startTime = performance.now()

    const animate = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      const time = (performance.now() - startTime) / 1000

      ctx.clearRect(0, 0, w, h)

      const ribbonCount = 3
      const ribbonColors = [
        { r: 230, g: 230, b: 235 },
        { r: 210, g: 215, b: 220 },
        { r: 240, g: 240, b: 245 },
      ]

      const centerIdx = (ribbonCount - 1) / 2

      for (let r = 0; r < ribbonCount; r++) {
        const phase = time * 0.8 + r * 0.6
        // offset from center ribbon — used for spread
        const offsetFromCenter = (r - centerIdx) * 20

        ctx.beginPath()

        // top edge of ribbon
        for (let x = 0; x <= w; x += 2) {
          const t = x / w
          // ribbons stay merged from left to center, fan out from center to right
          const spread = t <= 0.5 ? 0 : ((t - 0.5) * 2) * ((t - 0.5) * 2)
          const baseY = h * 0.5 + offsetFromCenter * spread

          const amplitude = (50 + r * 10) * (0.3 + t * 0.7)
          const wave1 = Math.sin(t * Math.PI * 3 + phase) * amplitude
          const wave2 = Math.sin(t * Math.PI * 5 - phase * 1.3) * (amplitude * 0.4)
          const wave3 = Math.sin(t * Math.PI * 1.5 + phase * 0.5) * (amplitude * 0.6)
          const y = baseY + wave1 + wave2 + wave3

          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }

        // bottom edge of ribbon
        for (let x = w; x >= 0; x -= 2) {
          const t = x / w
          const spread = t * t
          const baseY = h * 0.5 + offsetFromCenter * spread

          const amplitude = (50 + r * 10) * (0.3 + t * 0.7)
          const wave1 = Math.sin(t * Math.PI * 3 + phase) * amplitude
          const wave2 = Math.sin(t * Math.PI * 5 - phase * 1.3) * (amplitude * 0.4)
          const wave3 = Math.sin(t * Math.PI * 1.5 + phase * 0.5) * (amplitude * 0.6)
          const ribbonWidth = 8 + Math.sin(t * Math.PI * 2 + phase) * 3
          const y = baseY + wave1 + wave2 + wave3 + ribbonWidth

          ctx.lineTo(x, y)
        }

        ctx.closePath()

        const c = ribbonColors[r]
        const grad = ctx.createLinearGradient(0, 0, w, 0)
        grad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`)
        grad.addColorStop(0.1, `rgba(${c.r}, ${c.g}, ${c.b}, 0.7)`)
        grad.addColorStop(0.3, `rgba(${c.r}, ${c.g}, ${c.b}, 0.9)`)
        grad.addColorStop(0.7, `rgba(${c.r}, ${c.g}, ${c.b}, 0.9)`)
        grad.addColorStop(0.9, `rgba(${c.r}, ${c.g}, ${c.b}, 0.7)`)
        grad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`)

        ctx.fillStyle = grad
        ctx.fill()

        // glow layer
        ctx.save()
        ctx.filter = "blur(8px)"
        ctx.globalAlpha = 0.4
        ctx.fillStyle = grad
        ctx.fill()
        ctx.restore()
      }


      animRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <div className="relative w-full py-10">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      <div className="relative z-10 flex flex-col items-center gap-3 max-w-[640px] mx-auto px-4">
        <p className="text-[11px] text-text-muted leading-[1.6] text-center">
          supports both{' '}
          <span className="text-text-secondary">bmi live</span> and{' '}
          <span className="text-text-secondary">ascap onstage</span> ·
          chrome extension auto-fill · csv export · 9 month expiration
          tracking · email notifications
        </p>
        <p className="text-[11px] text-text-disabled">
          <Link href="/about" className="underline hover:text-text-muted transition-colors">
            learn how it works & why you can trust us
          </Link>
        </p>
      </div>
    </div>
  )
}
