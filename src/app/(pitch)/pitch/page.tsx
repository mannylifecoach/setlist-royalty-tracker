"use client"

import { useState, useEffect, FormEvent } from "react"
import { LuminaSlider } from "@/components/ui/lumina-slider"
import { MorphingText } from "@/components/ui/morphing-text"

export default function PitchPage() {
  const [verified, setVerified] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const stored = sessionStorage.getItem("pitch_verified")
    if (stored === "true") setVerified(true)
    setChecking(false)
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(false)

    try {
      const res = await fetch("/api/pitch/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        sessionStorage.setItem("pitch_verified", "true")
        setVerified(true)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (checking) return null

  if (!verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <form onSubmit={handleSubmit} className="w-full max-w-[320px] px-6 space-y-6">
          <div className="space-y-1">
            <div className="flex flex-col items-center">
              <MorphingText className="text-[32px]" />
              <span className="text-[14px] tracking-[-0.3px]">setlist royalty tracker</span>
            </div>
            <div className="text-[11px] text-[#555]">investor preview</div>
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(false)
              }}
              placeholder="enter access code"
              autoFocus
              className="input"
            />
            {error && (
              <p className="text-[11px] text-[#ef4444] mt-2">invalid access code</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !password}
            className="btn-primary w-full py-3 text-[12px] disabled:opacity-30"
          >
            {loading ? "..." : "continue"}
          </button>
        </form>
      </div>
    )
  }

  return <LuminaSlider />
}
