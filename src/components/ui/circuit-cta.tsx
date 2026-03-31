"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"

interface TraceLine {
  points: { x: number; y: number }[]
  length: number
  delay: number
  speed: number
  color: { r: number; g: number; b: number }
}

// bright silver / white
const PULSE_COLORS = [
  { r: 220, g: 220, b: 225 },
  { r: 200, g: 200, b: 210 },
  { r: 240, g: 240, b: 245 },
  { r: 210, g: 215, b: 220 },
  { r: 230, g: 230, b: 235 },
  { r: 195, g: 200, b: 210 },
]

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

    const generateTraces = (): TraceLine[] => {
      const parent = canvas.parentElement
      if (!parent) return []
      const rect = parent.getBoundingClientRect()
      const cx = rect.width / 2
      const cy = rect.height / 2
      const traces: TraceLine[] = []

      const directions = [
        { dx: 0, dy: -1 }, { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
        { dx: 0, dy: 1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 },
        { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
        { dx: -0.7, dy: -0.5 }, { dx: 0.7, dy: -0.5 },
        { dx: -0.7, dy: 0.5 }, { dx: 0.7, dy: 0.5 },
        { dx: -0.3, dy: -1 }, { dx: 0.3, dy: -1 },
        { dx: -0.3, dy: 1 }, { dx: 0.3, dy: 1 },
      ]

      for (let i = 0; i < directions.length; i++) {
        const dir = directions[i]
        // build points from outside inward — start far out, end near center
        const outerPoints: { x: number; y: number }[] = []
        const segmentCount = 3 + Math.floor(Math.random() * 3)
        // horizontal-heavy traces travel much further
        const isHorizontal = Math.abs(dir.dx) > Math.abs(dir.dy)
        const maxLen = isHorizontal
          ? 350 + Math.random() * 300
          : 60 + Math.random() * 120

        // start near center
        let x = cx + (Math.random() - 0.5) * 40
        let y = cy + (Math.random() - 0.5) * 20
        outerPoints.push({ x, y })

        for (let s = 0; s < segmentCount; s++) {
          const segLen = maxLen / segmentCount + (Math.random() - 0.5) * 20
          if (s % 2 === 0) {
            x += dir.dx * segLen
            outerPoints.push({ x, y })
          } else {
            y += dir.dy * segLen
            outerPoints.push({ x, y })
          }
        }

        // reverse so the path goes from outside → center
        const points = outerPoints.reverse()

        let totalLength = 0
        for (let p = 1; p < points.length; p++) {
          totalLength += Math.hypot(
            points[p].x - points[p - 1].x,
            points[p].y - points[p - 1].y
          )
        }

        traces.push({
          points,
          length: totalLength,
          delay: i * 0.4 + Math.random() * 2,
          speed: 0.3 + Math.random() * 0.4,
          color: PULSE_COLORS[i % PULSE_COLORS.length],
        })
      }

      return traces
    }

    let traces = generateTraces()

    const resizeObserver = new ResizeObserver(() => {
      resize()
      traces = generateTraces()
    })
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement)

    const drawNode = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      color: { r: number; g: number; b: number },
      alpha: number
    ) => {
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`
      ctx.fillRect(x - size / 2, y - size / 2, size, size)
    }

    const drawChip = (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      time: number
    ) => {
      const w = 160
      const h = 56
      const pulseAlpha = 0.15 + Math.sin(time * 0.8) * 0.05

      ctx.strokeStyle = `rgba(255, 255, 255, ${pulseAlpha})`
      ctx.lineWidth = 1
      ctx.strokeRect(cx - w / 2, cy - h / 2, w, h)

      const pinSize = 3
      const pinCount = 6
      const pinAlpha = 0.25 + Math.sin(time * 1.2) * 0.1

      for (let i = 0; i < pinCount; i++) {
        const px = cx - w / 2 + (w / (pinCount + 1)) * (i + 1)
        const c = PULSE_COLORS[i % PULSE_COLORS.length]
        drawNode(ctx, px, cy - h / 2 - 4, pinSize, c, pinAlpha)
        drawNode(ctx, px, cy + h / 2 + 4, pinSize, c, pinAlpha)
      }

      const sidePinCount = 2
      for (let i = 0; i < sidePinCount; i++) {
        const py = cy - h / 2 + (h / (sidePinCount + 1)) * (i + 1)
        const c = PULSE_COLORS[(i + 2) % PULSE_COLORS.length]
        drawNode(ctx, cx - w / 2 - 4, py, pinSize, c, pinAlpha)
        drawNode(ctx, cx + w / 2 + 4, py, pinSize, c, pinAlpha)
      }
    }

    const startTime = performance.now()

    const animate = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      const cx = w / 2
      const cy = h / 2
      const time = (performance.now() - startTime) / 1000

      ctx.clearRect(0, 0, w, h)

      for (const trace of traces) {
        const elapsed = time - trace.delay
        if (elapsed < 0) continue

        const { r, g, b } = trace.color
        const progress = Math.min((elapsed * trace.speed) / (trace.length / 100), 1)
        // pulse travels from 1 → 0 (outside → center)
        const rawPulse = (elapsed * trace.speed * 1.5) % 1.4
        const pulsePos = 1.2 - rawPulse

        // static trace line
        ctx.beginPath()
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.04 + progress * 0.03})`
        ctx.lineWidth = 1
        for (let i = 0; i < trace.points.length; i++) {
          if (i === 0) ctx.moveTo(trace.points[i].x, trace.points[i].y)
          else ctx.lineTo(trace.points[i].x, trace.points[i].y)
        }
        ctx.stroke()

        // animated colored pulse traveling inward along the trace
        if (progress >= 1) {
          let accum = 0
          for (let i = 1; i < trace.points.length; i++) {
            const segLen = Math.hypot(
              trace.points[i].x - trace.points[i - 1].x,
              trace.points[i].y - trace.points[i - 1].y
            )
            const segStart = accum / trace.length
            const segEnd = (accum + segLen) / trace.length
            accum += segLen

            const pulseWidth = 0.15
            const overlapStart = Math.max(segStart, pulsePos - pulseWidth)
            const overlapEnd = Math.min(segEnd, pulsePos + pulseWidth)

            if (overlapStart < overlapEnd) {
              const t1 = (overlapStart - segStart) / (segEnd - segStart)
              const t2 = (overlapEnd - segStart) / (segEnd - segStart)

              const x1 =
                trace.points[i - 1].x +
                (trace.points[i].x - trace.points[i - 1].x) * t1
              const y1 =
                trace.points[i - 1].y +
                (trace.points[i].y - trace.points[i - 1].y) * t1
              const x2 =
                trace.points[i - 1].x +
                (trace.points[i].x - trace.points[i - 1].x) * t2
              const y2 =
                trace.points[i - 1].y +
                (trace.points[i].y - trace.points[i - 1].y) * t2

              ctx.beginPath()
              ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 1.0)`
              ctx.lineWidth = 4
              ctx.moveTo(x1, y1)
              ctx.lineTo(x2, y2)
              ctx.stroke()
            }
          }
        }

        // outer endpoint node (start of path)
        if (progress >= 1) {
          const first = trace.points[0]
          const nodeAlpha = 0.3 + Math.sin(time * 1.5 + trace.delay) * 0.15
          drawNode(ctx, first.x, first.y, 4, trace.color, nodeAlpha)
        }
      }

      drawChip(ctx, cx, cy, time)

      animRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      window.removeEventListener("resize", resize)
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <div className="relative w-full py-16">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <Link
          href="/login"
          className="btn btn-primary inline-block px-10 py-3 text-[13px]"
        >
          get started
        </Link>
      </div>
    </div>
  )
}
