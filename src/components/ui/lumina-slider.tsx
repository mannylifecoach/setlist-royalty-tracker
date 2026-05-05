"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import { MorphingText } from "./morphing-text"

declare global {
  interface Window {
    // Three.js + GSAP are loaded as global script tags at runtime; their
    // own type packages are heavy and not worth the build cost for this
    // single component. Casting to `any` is the pragmatic call.
    /* eslint-disable @typescript-eslint/no-explicit-any */
    THREE: any
    gsap: any
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }
}

interface Slide {
  title: string
  description: string
  stats?: { value: string; label: string }[]
  bullets?: string[]
}

const SLIDES: Slide[] = [
  {
    title: "every live performance is worth money. most creators never collect it.",
    description:
      "if you created the music — wrote it, produced it, composed it — and it gets performed live at a concert, a festival, or a club, you're owed a royalty. it doesn't matter if you're on stage or not. a songwriter whose song gets covered, a producer whose beat gets played in a dj set, an artist performing their own music at a bar — all owed money. but the system to collect it is broken, and most creators don't even know these royalties exist.",
    stats: [
      { value: "9.9m+", label: "live performances we scan" },
      { value: "3-6 mo", label: "deadline before money is gone" },
      { value: "billions", label: "unclaimed every year" },
    ],
  },
  {
    title: "the system only works for the biggest artists.",
    description:
      "performing rights organizations like bmi and ascap collect royalties from venues and distribute them to creators. but they only auto-track the highest-grossing tours using pollstar data. everyone else — indie artists, touring bands, dj-producers — must manually report every single show through online portals like bmi live or ascap onstage. most don't know these portals exist. those who do face 5+ minutes of data entry per show. miss bmi's biannual filing deadline (typically 3-6 months from the show) and the money is gone forever.",
    stats: [
      { value: "top tours", label: "only ones auto-tracked" },
      { value: "5+ min", label: "manual entry per show" },
      { value: "biannual", label: "miss the deadline, lose it" },
    ],
  },
  {
    title: "we automate what the industry won't.",
    description:
      "setlist royalty tracker scans 9.9 million crowdsourced concert setlists, matches them against a creator's registered songs, and surfaces performances they didn't know about. then our chrome extension auto-fills the submission form in seconds — replacing the manual work that stops most creators from ever filing.",
    bullets: [
      "register your songs and the artists who perform them",
      "we scan 9.9m+ setlists and surface your matches",
      "you review and confirm — nothing submits without your approval",
      "chrome extension auto-fills the pro form in ~30 seconds per show",
    ],
  },
  {
    title: "$120m/year in dj royalties goes uncollected.",
    description:
      "two groups lose money here. dj-producers who perform their own music at clubs and festivals don't file because they don't know performance royalties exist for them. and producers who never dj have their tracks played by other djs worldwide with no way to find out. both are owed money. srt lets dj-producers upload their serato set history — we match every track, including remixes and edits, and surface the performances they can claim. as more djs upload sets, every producer on the platform benefits.",
    stats: [
      { value: "$120m/yr", label: "uncollected (afem estimate)" },
      { value: "2 gaps", label: "dj-producers + producers whose tracks get played" },
      { value: "remixes", label: "matched by composition, not title" },
    ],
  },
  {
    title: "why now: three things finally converged.",
    description:
      "fans crowdsourced 9.9 million concert setlists on setlist.fm — the raw data to find missing performances. pros moved their submission forms online, making automation possible. and open music databases now map every remix, edit, and cover back to the original composition — so matching actually works. bmi was acquired by private equity in 2023 for $1.7 billion. the industry is digitizing fast. the pieces exist. no one has connected them.",
    stats: [
      { value: "9.9m+", label: "crowdsourced setlists" },
      { value: "$1.7b", label: "bmi acquired by pe (2023)" },
      { value: "0", label: "tools connecting the pieces" },
    ],
  },
  {
    title: "millions of potential users worldwide.",
    description:
      "every creator registered with a pro is a potential user — millions in the u.s. alone across bmi, ascap, sesac, and gmr. internationally, organizations in 100+ countries (prs, socan, gema, sacem) serve millions more. we start with indie creators who actively tour and file their own claims, then expand into dj-producers and music publishers.",
    stats: [
      { value: "$54m", label: "sam — active touring creators" },
      { value: "$5.4m", label: "som — 50k indie creators (year 1-2)" },
      { value: "global", label: "pros in 100+ countries" },
    ],
  },
  {
    title: "the product pays for itself on the first match.",
    description:
      "a single recovered performance royalty can cover a full year of subscription. when the product makes users more money than it costs, the value proposition is immediate and churn is low. free tier drives adoption, pro tier ($9/mo) unlocks batch scanning and priority support. publisher tier planned after validating multi-catalog workflows.",
    stats: [
      { value: "free", label: "to start" },
      { value: "$9/mo", label: "pro tier" },
      { value: "$108k", label: "arr at 1,000 subscribers" },
    ],
  },
  {
    title: "product is live. currently in beta.",
    description:
      "the full product is built and deployed at setlistroyalty.com. not a prototype — a working application with real users testing the complete flow from account creation through royalty submission.",
    bullets: [
      "web app — scanning, matching, performance dashboard, csv export",
      "chrome extension — auto-fills bmi live forms in ~30 seconds",
      "serato import — dj set matching with remix detection",
      "deadline alerts — email warnings at 30, 14, and 7 days before expiry",
      "161 automated tests passing, sentry monitoring, daily health checks",
    ],
  },
  {
    title: "the closest competitor validates our market at $8m arr.",
    description:
      "muzooka (founded 2012, raised $9m, ~$8m arr) proves demand for live royalty tools. but their live performance product supports bmi only — no ascap after 6 years. still requires manual setlist entry. no discovery, no automation, no dj market. their recent focus has shifted to radio chart analytics. meanwhile, bmi has three separate systems (pollstar, bmi live, muzooka) that don't talk to each other. none automate the creator's actual work of finding and reporting performances.",
    bullets: [
      "muzooka — bmi only, manual entry, no ascap, shifting to radio analytics",
      "bmi live / ascap onstage — pro-owned portals, pure manual entry, no discovery",
      "songtrust, cd baby, tunecore — streaming and mechanical royalties only, not live",
      "srt — automated discovery + auto-fill + bmi and ascap + dj market",
    ],
  },
  {
    title: "raising $250k–$350k to reach 500 active users.",
    description:
      "the product is built. this capital funds the go-to-market: reaching creators, validating willingness to pay, and securing the data license needed to scale. milestone: 500 active users with validated paid conversion within 12 months, positioning for a seed round.",
    bullets: [
      "12–18 months runway",
      "first hire: growth / community",
      "creator outreach — songwriter forums, producer communities, pro events",
      "commercial setlist.fm data license",
      "target: 500 active users → validated paid conversion → seed round",
    ],
  },
]

const NAV_LABELS = [
  "the opportunity",
  "the problem",
  "the solution",
  "dj-producers",
  "why now",
  "market",
  "business model",
  "traction",
  "competition",
  "the ask",
]

const AUTO_ADVANCE_MS = 12000

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

// ethereal shadow — dark smoky turbulence with glass bubble transition
const FRAGMENT_SHADER = `
  precision highp float;

  uniform float time;
  uniform float progress;
  uniform vec2 resolution;
  uniform int slideIndex;
  uniform int prevSlideIndex;

  varying vec2 vUv;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // hash for film grain
  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  vec3 getSceneColor(vec2 p, float t, int idx) {
    float offset = float(idx) * 3.7;

    // large diagonal warp — makes folds organic
    float warpX = snoise(vec3(p * 0.25 + offset, t * 0.035)) * 2.0;
    float warpY = snoise(vec3(p * 0.25 + offset + 77.0, t * 0.03)) * 2.0;
    float diag = (p.x + warpX) * 0.7 + (p.y + warpY) * 0.5;
    float cross = (p.y + warpY) * 0.7 - (p.x + warpX) * 0.3;

    // surface height — 3-4 big bold folds across screen
    float h = 0.0;
    h += sin(diag * 1.2 + t * 0.12) * 0.7;
    h += sin(cross * 1.5 - t * 0.08) * 0.4;
    h += snoise(vec3(p * 0.4, t * 0.04 + offset)) * 0.5;

    // compute gradient for lighting via finite differences
    float eps = 0.015;
    float wx2 = snoise(vec3(vec2(p.x+eps,p.y) * 0.25 + offset, t * 0.035)) * 2.0;
    float wy2 = snoise(vec3(vec2(p.x+eps,p.y) * 0.25 + offset + 77.0, t * 0.03)) * 2.0;
    float d2 = (p.x+eps+wx2)*0.7 + (p.y+wy2)*0.5;
    float c2 = (p.y+wy2)*0.7 - (p.x+eps+wx2)*0.3;
    float hx = sin(d2*1.2+t*0.12)*0.7 + sin(c2*1.5-t*0.08)*0.4
             + snoise(vec3(vec2(p.x+eps,p.y)*0.4, t*0.04+offset))*0.5;

    float wx3 = snoise(vec3(vec2(p.x,p.y+eps) * 0.25 + offset, t * 0.035)) * 2.0;
    float wy3 = snoise(vec3(vec2(p.x,p.y+eps) * 0.25 + offset + 77.0, t * 0.03)) * 2.0;
    float d3 = (p.x+wx3)*0.7 + (p.y+eps+wy3)*0.5;
    float c3 = (p.y+eps+wy3)*0.7 - (p.x+wx3)*0.3;
    float hy = sin(d3*1.2+t*0.12)*0.7 + sin(c3*1.5-t*0.08)*0.4
             + snoise(vec3(vec2(p.x,p.y+eps)*0.4, t*0.04+offset))*0.5;

    float dx = (hx - h) / eps;
    float dy = (hy - h) / eps;

    // strong directional light from upper-right
    vec3 normal = normalize(vec3(-dx * 1.5, -dy * 1.5, 1.0));
    vec3 lightDir = normalize(vec3(0.5, 0.6, 0.7));
    float diffuse = max(dot(normal, lightDir), 0.0);

    // boost contrast: crush shadows, lift highlights
    diffuse = smoothstep(0.1, 0.8, diffuse);
    diffuse = pow(diffuse, 1.3);

    // deep black to visible grey
    float brightness = mix(0.01, 0.5, diffuse);

    vec3 color = vec3(brightness);

    // film grain
    float grain = hash(p * 900.0 + t * 137.0) * 0.06 - 0.03;
    color += grain;

    return color;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    float aspect = resolution.x / resolution.y;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

    // two scene colors
    vec3 colorA = getSceneColor(p, time, prevSlideIndex);
    vec3 colorB = getSceneColor(p, time, slideIndex);

    // expanding glass bubble from center
    float dist = length(p);
    float bubbleRadius = progress * 1.8;
    float edgeWidth = 0.2 + 0.1 * sin(time * 1.5);

    // refraction at bubble edge
    float edgeDist = abs(dist - bubbleRadius);
    float inBubble = smoothstep(bubbleRadius + 0.02, bubbleRadius - 0.02, dist);

    // chromatic aberration at the edge
    float aberration = smoothstep(edgeWidth, 0.0, edgeDist) * 0.04;
    vec2 offset = normalize(p + 0.001) * aberration;

    vec3 colorAr = getSceneColor(p + offset, time, prevSlideIndex);
    vec3 colorAb = getSceneColor(p - offset, time, prevSlideIndex);
    vec3 distortedA = vec3(colorAr.r, colorA.g, colorAb.b);

    vec3 colorBr = getSceneColor(p + offset * 0.5, time, slideIndex);
    vec3 colorBb = getSceneColor(p - offset * 0.5, time, slideIndex);
    vec3 distortedB = vec3(colorBr.r, colorB.g, colorBb.b);

    // mix based on bubble expansion
    vec3 color = mix(distortedA, distortedB, inBubble);

    // soft ghostly ring at bubble edge
    float ring = smoothstep(edgeWidth, 0.0, edgeDist) * (1.0 - smoothstep(0.0, 0.03, edgeDist));
    color += vec3(0.04, 0.05, 0.1) * ring * progress * (1.0 - progress) * 4.0;

    // smoky distortion inside bubble edge
    float smokeNoise = snoise(vec3(p * 6.0, time * 0.3)) * 0.5 + 0.5;
    float smokeMask = smoothstep(edgeWidth * 1.5, 0.0, edgeDist) * 0.03;
    color += vec3(smokeNoise * smokeMask * 0.5, smokeNoise * smokeMask * 0.3, smokeNoise * smokeMask) * progress * (1.0 - progress) * 4.0;

    gl_FragColor = vec4(color, 1.0);
  }
`

export function LuminaSlider() {
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [scriptsLoaded, setScriptsLoaded] = useState(false)
  const isTransitioning = useRef(false)
  const currentSlideRef = useRef(0)
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // initialized to 0; the real start time is set in resetAutoTimer when
  // the auto-timer first fires. Avoids calling Date.now() during render.
  const progressStartRef = useRef(0)
  const [progressPct, setProgressPct] = useState(0)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const pausedAtRef = useRef(0) // elapsed ms when paused
  // Three.js objects — proper types would require the @types/three package
  // which is heavy. Pragmatic cast for this single visual component.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sceneRef = useRef<{ renderer: any; scene: any; camera: any; uniforms: any; animationId: number | null }>(
    { renderer: null, scene: null, camera: null, uniforms: null, animationId: null }
  )

  // load scripts
  useEffect(() => {
    let mounted = true
    const scripts: HTMLScriptElement[] = []
    const loadScript = (src: string): Promise<void> =>
      new Promise((resolve, reject) => {
        const s = document.createElement("script")
        s.src = src
        s.onload = () => resolve()
        s.onerror = reject
        document.head.appendChild(s)
        scripts.push(s)
      })

    Promise.all([
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"),
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"),
    ]).then(() => { if (mounted) setScriptsLoaded(true) })

    return () => { mounted = false; scripts.forEach((s) => s.parentNode?.removeChild(s)) }
  }, [])

  // init three.js
  useEffect(() => {
    if (!scriptsLoaded || !canvasContainerRef.current || !window.THREE) return
    const THREE = window.THREE
    const container = canvasContainerRef.current
    container.innerHTML = ""

    const camera = new THREE.Camera()
    camera.position.z = 1
    const scene = new THREE.Scene()
    const geometry = new THREE.PlaneBufferGeometry(2, 2)

    const uniforms = {
      time: { value: 0.0 },
      progress: { value: 0.0 },
      resolution: { value: new THREE.Vector2() },
      slideIndex: { value: 0 },
      prevSlideIndex: { value: 0 },
    }

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
    })

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 1)
    container.appendChild(renderer.domElement)

    sceneRef.current = { renderer, scene, camera, uniforms, animationId: null }

    const onResize = () => {
      const rect = container.getBoundingClientRect()
      renderer.setSize(rect.width, rect.height)
      uniforms.resolution.value.set(rect.width * window.devicePixelRatio, rect.height * window.devicePixelRatio)
    }
    onResize()
    window.addEventListener("resize", onResize)

    let running = true
    const animate = () => {
      if (!running) return
      sceneRef.current.animationId = requestAnimationFrame(animate)
      uniforms.time.value += 0.016
      renderer.render(scene, camera)
    }
    animate()

    const handleVisibility = () => {
      if (document.hidden) {
        running = false
        if (sceneRef.current.animationId) {
          cancelAnimationFrame(sceneRef.current.animationId)
          sceneRef.current.animationId = null
        }
      } else {
        running = true
        animate()
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      running = false
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("resize", onResize)
      if (sceneRef.current.animationId) cancelAnimationFrame(sceneRef.current.animationId)
      renderer.dispose()
    }
  }, [scriptsLoaded])

  // split title into individual character spans for animation
  const splitTextIntoChars = useCallback((el: HTMLElement) => {
    if (el.dataset.split === "true") return
    const text = el.textContent || ""
    el.innerHTML = ""
    for (const char of text) {
      const span = document.createElement("span")
      span.textContent = char
      span.style.display = "inline-block"
      span.style.whiteSpace = char === " " ? "pre" : "normal"
      span.className = "char"
      el.appendChild(span)
    }
    el.dataset.split = "true"
  }, [])

  const animateTextIn = useCallback((slideIdx: number) => {
    if (!window.gsap) return
    const gsap = window.gsap
    const slideEl = document.getElementById(`slide-${slideIdx}`)
    if (!slideEl) return

    // character-level title animation
    const titleEl = slideEl.querySelector("[data-title]") as HTMLElement
    if (titleEl) {
      splitTextIntoChars(titleEl)
      const chars = titleEl.querySelectorAll(".char")
      gsap.fromTo(chars,
        { opacity: 0, y: 40, rotationX: -90, scale: 0.8 },
        {
          opacity: 1, y: 0, rotationX: 0, scale: 1,
          duration: 0.6, stagger: 0.02, ease: "power3.out",
        }
      )
    }

    // description blur-in
    const descEl = slideEl.querySelector("[data-desc]")
    if (descEl) {
      gsap.fromTo(descEl,
        { opacity: 0, y: 20, filter: "blur(10px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.8, delay: 0.3, ease: "power2.out" }
      )
    }

    // stats/bullets stagger in
    const details = slideEl.querySelectorAll("[data-detail]")
    if (details.length) {
      gsap.fromTo(details,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, delay: 0.5, ease: "power2.out" }
      )
    }
  }, [splitTextIntoChars])

  const animateTextOut = useCallback((): Promise<void> => {
    if (!window.gsap) return Promise.resolve()
    const gsap = window.gsap
    const slideEl = document.getElementById(`slide-${currentSlideRef.current}`)
    if (!slideEl) return Promise.resolve()

    const titleEl = slideEl.querySelector("[data-title]") as HTMLElement
    const chars = titleEl?.querySelectorAll(".char") || []
    const descEl = slideEl.querySelector("[data-desc]")
    const details = slideEl.querySelectorAll("[data-detail]")

    return new Promise((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve })
      if (details.length) {
        tl.to(details, { opacity: 0, y: -10, duration: 0.25, stagger: 0.03, ease: "power2.in" }, 0)
      }
      if (descEl) {
        tl.to(descEl, { opacity: 0, filter: "blur(8px)", duration: 0.3, ease: "power2.in" }, 0)
      }
      if (chars.length) {
        tl.to(chars, { opacity: 0, y: -30, duration: 0.3, stagger: 0.01, ease: "power2.in" }, 0.05)
      }
    })
  }, [])

  const resetAutoTimer = useCallback(() => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current)
    pausedAtRef.current = 0
    progressStartRef.current = Date.now()
    setProgressPct(0)
    if (pausedRef.current) return
    autoTimerRef.current = setInterval(() => {
      if (pausedRef.current) return
      const elapsed = Date.now() - progressStartRef.current
      const pct = Math.min(elapsed / AUTO_ADVANCE_MS, 1)
      setProgressPct(pct)
      if (pct >= 1) {
        const next = currentSlideRef.current + 1
        if (next < SLIDES.length) {
          // navigateToSlide is declared below; intentional circular reference
          // resolved at runtime — see the long-standing pattern note above.
          // eslint-disable-next-line react-hooks/immutability
          navigateToSlide(next)
        } else {
          if (autoTimerRef.current) clearInterval(autoTimerRef.current)
        }
      }
    }, 50)
  }, []) // navigateToSlide added below via ref

  const togglePause = useCallback(() => {
    const wasPaused = pausedRef.current
    pausedRef.current = !wasPaused
    setPaused(!wasPaused)
    if (wasPaused) {
      // resuming — adjust start time so progress continues from where it was
      const remaining = AUTO_ADVANCE_MS - pausedAtRef.current
      progressStartRef.current = Date.now() - pausedAtRef.current
      if (!autoTimerRef.current) {
        autoTimerRef.current = setInterval(() => {
          if (pausedRef.current) return
          const elapsed = Date.now() - progressStartRef.current
          const pct = Math.min(elapsed / AUTO_ADVANCE_MS, 1)
          setProgressPct(pct)
          if (pct >= 1) {
            const next = currentSlideRef.current + 1
            if (next < SLIDES.length) {
              navigateToSlide(next)
            } else {
              if (autoTimerRef.current) clearInterval(autoTimerRef.current)
              autoTimerRef.current = null
            }
          }
        }, 50)
      }
    } else {
      // pausing — record how far we were
      pausedAtRef.current = Date.now() - progressStartRef.current
    }
  }, [])

  const navigateToSlide = useCallback(
    async (targetIdx: number) => {
      if (isTransitioning.current || targetIdx === currentSlideRef.current) return
      if (targetIdx < 0 || targetIdx >= SLIDES.length) return
      isTransitioning.current = true

      await animateTextOut()

      // glass bubble shader transition
      if (window.gsap && sceneRef.current.uniforms) {
        const uniforms = sceneRef.current.uniforms
        const gsap = window.gsap
        uniforms.prevSlideIndex.value = currentSlideRef.current
        uniforms.slideIndex.value = targetIdx

        gsap.fromTo(uniforms.progress,
          { value: 0 },
          { value: 1, duration: 2.0, ease: "power2.inOut" }
        )
      }

      setTimeout(() => {
        currentSlideRef.current = targetIdx
        setCurrentSlide(targetIdx)
        animateTextIn(targetIdx)
        // reset progress bar
        progressStartRef.current = Date.now()
        setProgressPct(0)
        setTimeout(() => { isTransitioning.current = false }, 400)
      }, 800)
    },
    [animateTextIn, animateTextOut]
  )

  // keyboard nav
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault()
        navigateToSlide(currentSlideRef.current + 1)
        resetAutoTimer()
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault()
        navigateToSlide(currentSlideRef.current - 1)
        resetAutoTimer()
      } else if (e.key === " ") {
        e.preventDefault()
        togglePause()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [navigateToSlide, resetAutoTimer, togglePause])

  // animate first slide + start auto-advance
  useEffect(() => {
    if (scriptsLoaded) {
      setTimeout(() => animateTextIn(0), 400)
      resetAutoTimer()
    }
    return () => { if (autoTimerRef.current) clearInterval(autoTimerRef.current) }
  }, [scriptsLoaded, animateTextIn, resetAutoTimer])

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#000" }}>
      {/* webgl background */}
      <div ref={canvasContainerRef} className="absolute inset-0 z-0" />

      {/* content layer */}
      <div className="absolute inset-0 z-10 flex flex-col md:flex-row">
        {/* mobile: horizontal dot nav at top */}
        <div className="flex md:hidden items-center justify-between px-6 pt-16 pb-4">
          <div className="flex gap-[6px]">
            {NAV_LABELS.map((_, i) => (
              <button
                key={i}
                onClick={() => { navigateToSlide(i); resetAutoTimer() }}
                className="relative w-[20px] h-[3px] overflow-hidden"
                style={{ background: "#1a1a1a" }}
              >
                <div
                  className="h-full transition-none"
                  style={{
                    background: i === currentSlide ? "#fff" : i < currentSlide ? "rgba(255,255,255,0.2)" : "transparent",
                    width: i === currentSlide ? `${progressPct * 100}%` : i < currentSlide ? "100%" : "0%",
                  }}
                />
              </button>
            ))}
          </div>
          <span className="text-[10px] tracking-[1px]" style={{ color: "#444" }}>
            {String(currentSlide + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
          </span>
        </div>

        {/* desktop: vertical navigation list (left side) */}
        <div
          className="hidden md:flex w-[280px] lg:w-[320px] flex-col justify-center pl-8 lg:pl-14 py-12 shrink-0"
          style={{ background: "linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)" }}
        >
          <div className="space-y-1">
            {NAV_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => { navigateToSlide(i); resetAutoTimer() }}
                className="group w-full text-left py-[7px] transition-all duration-300 flex items-center gap-3"
              >
                <span
                  className="text-[11px] font-light tracking-[1px] transition-all duration-300 shrink-0"
                  style={{
                    color: i === currentSlide ? "#fff" : "#aaa",
                    width: "20px",
                    textShadow: "0 1px 6px rgba(0,0,0,0.8)",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <span
                    className="text-[12px] tracking-[0.3px] transition-all duration-300 block truncate"
                    style={{
                      color: i === currentSlide ? "#fff" : "#aaa",
                      textShadow: "0 1px 6px rgba(0,0,0,0.8)",
                    }}
                  >
                    {label}
                  </span>
                  {/* progress bar */}
                  <div className="h-[1px] mt-[4px] overflow-hidden" style={{ background: "#333" }}>
                    <div
                      className="h-full transition-none"
                      style={{
                        background: i === currentSlide ? "#fff" : "transparent",
                        width: i === currentSlide ? `${progressPct * 100}%` : i < currentSlide ? "100%" : "0%",
                        opacity: i < currentSlide ? 0.3 : 1,
                      }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* content area — vertically centered, aligned with nav */}
        <div className="flex-1 flex items-center justify-center px-6 md:px-8 lg:px-16 relative pt-24 md:pt-0">
          {SLIDES.map((s, i) => (
            <div
              key={i}
              id={`slide-${i}`}
              className="absolute max-w-[600px] w-full px-2 md:-translate-y-[10%]"
              style={{ display: i === currentSlide ? "block" : "none" }}
            >
              <h1
                data-title
                className="text-[28px] md:text-[34px] lg:text-[46px] font-light tracking-[-1.5px] leading-[1.1] mb-4 md:mb-6 text-white"
                style={{ opacity: 0, perspective: "600px", textShadow: "0 2px 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.5)" }}
              >
                {s.title}
              </h1>
              <p
                data-desc
                className="text-[13px] md:text-[14px] lg:text-[15px] leading-[1.7] max-w-[500px] mb-6 md:mb-8"
                style={{ opacity: 0, color: "#e0e0e0", textShadow: "0 1px 12px rgba(0,0,0,1), 0 0 30px rgba(0,0,0,0.7)" }}
              >
                {s.description}
              </p>

              {s.stats && (
                <div className="flex gap-6 md:gap-8 lg:gap-12 mb-6 md:mb-8 flex-wrap">
                  {s.stats.map((stat, j) => (
                    <div key={j} data-detail style={{ opacity: 0 }}>
                      <div
                        className="text-[22px] md:text-[26px] lg:text-[34px] font-light tracking-[-1px] text-white"
                        style={{ textShadow: "0 2px 15px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.6)" }}
                      >
                        {stat.value}
                      </div>
                      <div className="text-[10px] tracking-[0.5px] mt-1" style={{ color: "#ccc", textShadow: "0 1px 8px rgba(0,0,0,1)" }}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {s.bullets && (
                <div className="space-y-2 md:space-y-3">
                  {s.bullets.map((b, j) => (
                    <div key={j} data-detail className="flex items-start gap-3" style={{ opacity: 0 }}>
                      <span className="text-[10px] mt-[5px]" style={{ color: "#888" }}>&#9646;</span>
                      <span
                        className="text-[11px] md:text-[12px] lg:text-[13px] leading-[1.6]"
                        style={{ color: "#e0e0e0", textShadow: "0 1px 12px rgba(0,0,0,1), 0 0 25px rgba(0,0,0,0.7)" }}
                      >{b}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* slide counter — bottom right (desktop only) */}
          <div className="hidden md:block absolute bottom-8 right-8 lg:bottom-12 lg:right-16">
            <span className="text-[11px] tracking-[1px]" style={{ color: "#bbb", textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>
              {String(currentSlide + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* mobile: swipe hint + nav label at bottom */}
        <div className="flex md:hidden items-center justify-between px-6 pb-6 pt-2">
          <button
            onClick={() => { navigateToSlide(currentSlide - 1); resetAutoTimer() }}
            disabled={currentSlide === 0}
            className="text-[11px] tracking-[0.5px] disabled:opacity-20"
            style={{ color: "#999" }}
          >
            ← prev
          </button>
          <span className="text-[11px] tracking-[0.3px]" style={{ color: "#999" }}>
            {NAV_LABELS[currentSlide]}
          </span>
          <button
            onClick={() => { navigateToSlide(currentSlide + 1); resetAutoTimer() }}
            disabled={currentSlide === SLIDES.length - 1}
            className="text-[11px] tracking-[0.5px] disabled:opacity-20"
            style={{ color: "#999" }}
          >
            next →
          </button>
        </div>
      </div>

      {/* branding — top left */}
      <div className="absolute top-4 left-6 md:top-8 md:left-8 lg:top-12 lg:left-14 z-20">
        <Link href="/" className="flex flex-col items-start hover:opacity-70 transition-opacity">
          <MorphingText className="text-[24px] md:text-[28px]" />
          <span className="text-[12px] md:text-[13px] tracking-[-0.3px] text-white" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>setlist royalty tracker</span>
        </Link>
        <div className="text-[9px] md:text-[10px] tracking-[0.5px] mt-[2px]" style={{ color: "#aaa", textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>investor preview</div>
      </div>

      {/* pause/play — top right */}
      <button
        onClick={togglePause}
        className="absolute top-4 right-6 md:top-8 md:right-8 lg:top-12 lg:right-14 z-20 flex items-center gap-2 transition-opacity hover:opacity-70"
      >
        {paused ? (
          <svg width="10" height="12" viewBox="0 0 10 12" fill="#ccc">
            <polygon points="0,0 10,6 0,12" />
          </svg>
        ) : (
          <svg width="10" height="12" viewBox="0 0 10 12" fill="#ccc">
            <rect x="0" y="0" width="3" height="12" />
            <rect x="7" y="0" width="3" height="12" />
          </svg>
        )}
        <span className="text-[10px] tracking-[0.5px] hidden md:inline" style={{ color: "#ccc", textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>
          {paused ? "play" : "pause"}
        </span>
      </button>
    </div>
  )
}
