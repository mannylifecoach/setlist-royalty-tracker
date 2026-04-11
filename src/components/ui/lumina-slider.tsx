"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { MorphingText } from "./morphing-text"

declare global {
  interface Window {
    THREE: any
    gsap: any
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
    title: "$2.5 billion in music royalties go uncollected every year. we fix that.",
    description:
      "every time a song is performed live at a concert, the songwriter earns a royalty — but only if someone reports it. the organizations responsible for collecting that money only auto-track about 300 major tours. the other millions of performances? no one is filing those claims. we use ai to find the missing performances and help songwriters get paid.",
    stats: [
      { value: "$2.5b+", label: "left on the table annually" },
      { value: "9.9m", label: "concerts in our database" },
      { value: "0", label: "competitors" },
    ],
  },
  {
    title: "the music industry has a blind spot",
    description:
      "songwriters are owed royalties for every live performance of their music. organizations called performing rights organizations (bmi, ascap) are supposed to collect this money — but they only auto-track the biggest 200-300 tours each quarter. every other performance requires the songwriter to manually report it. most don't know, don't have time, or miss the 9-month filing deadline.",
    stats: [
      { value: "$2.5b+", label: "uncollected annually" },
      { value: "9 mo", label: "filing deadline" },
      { value: "~300", label: "tours auto-tracked" },
    ],
  },
  {
    title: "the data finally exists",
    description:
      "fans have crowdsourced 9.9 million concert setlists on setlist.fm — every song played at every show. at the same time, royalty collection agencies moved their submission forms online. ai matching has matured. the three pieces needed to solve this problem finally exist — no one has connected them until now.",
    stats: [
      { value: "9.9m+", label: "concert setlists" },
      { value: "online", label: "submission portals" },
      { value: "0", label: "tools connecting them" },
    ],
  },
  {
    title: "scan. match. review. submit.",
    description:
      "setlist royalty tracker connects to the world's largest concert database, matches setlists against a songwriter's catalog using ai, and surfaces unreported performances — then helps file the claim with a browser extension that auto-fills royalty submission forms in seconds.",
    bullets: [
      "songwriter registers their songs and the artists who perform them",
      "ai scans millions of concert setlists for matches",
      "songwriter reviews and confirms discovered performances",
      "one-click export or auto-fill directly into the submission portal",
    ],
  },
  {
    title: "compound ai — not a wrapper",
    description:
      "three resilience layers work together so the system keeps functioning even when external websites change. this isn't a single api call — it's an intelligent pipeline that adapts.",
    bullets: [
      "layer 1: smart matching — catches alternate titles, remixes, live versions, and misspellings using fuzzy text analysis",
      "layer 2: adaptive form filling — auto-fills submission forms using techniques that survive website redesigns",
      "layer 3: ai vision fallback — when form layouts change unexpectedly, ai reads the screen visually and fills fields anyway (~$0.01 per use)",
    ],
  },
  {
    title: "2.4 million potential users in the us alone",
    description:
      "every songwriter registered with a performing rights organization is a potential customer. 2.4 million in the us alone — and the market extends globally across dozens of international organizations. we start with the 50k indie artists who actively tour and file their own claims, then expand into publishers managing hundreds of catalogs.",
    stats: [
      { value: "$800m+", label: "tam — all us pro members × subscription" },
      { value: "$54m", label: "sam — 500k active touring songwriters" },
      { value: "$5.4m", label: "som — 50k indie artists (year 1-2)" },
    ],
  },
  {
    title: "second market: dj-producers ($120m/year gap)",
    description:
      "electronic music is a $12.9 billion industry but live performance royalties for dj sets are almost completely unreported. the association for electronic music estimates $120m/year in unclaimed dj royalties. setlist.fm has near-zero dj coverage. no end-to-end consumer tool exists. we extend the same engine to dj-producers via serato history import, resident advisor venue matching, and 1001tracklists data.",
    stats: [
      { value: "$120m", label: "annual unclaimed dj royalties (afem)" },
      { value: "$12.9b", label: "global electronic music industry (ims 2025)" },
      { value: "2.5m", label: "active serato dj users" },
    ],
  },
  {
    title: "the two-sided network: producers get paid even when they're not at the show",
    description:
      "this is the unfair-advantage feature. when a dj uploads their serato set, we don't just match against their own catalog — we scan against every registered song on the platform. producer a writes a track. dj b plays it at a club. producer a gets notified and files for royalties. neither needed to know the other. as more djs upload sets, every registered songwriter becomes a beneficiary of the entire network.",
    bullets: [
      "every dj upload generates royalty notifications for the songs they played",
      "every registered song benefits from every dj on the platform",
      "scales nonlinearly: 100 djs × 50 sets/year × 20 tracks = 100k matching opportunities",
      "the more users join, the more value every existing user gets — true network effect",
    ],
  },
  {
    title: "the technical moat: musicbrainz work-relationship matching",
    description:
      "every dj plays remixes, edits, and renamed versions. fuzzy string matching breaks on these — \"midnight bass (skrillex remix)\" doesn't look like \"midnight bass.\" we use musicbrainz work entities (the same id system that powers wikipedia and last.fm) to match recordings to their underlying composition. every version of a song — radio edit, extended mix, third-party remix, cover — links back to the same work id. the songwriter gets credited correctly every time. competitors built on string matching cannot retrofit this without rebuilding their core engine.",
    bullets: [
      "musicbrainz: free, open-source, ~25 years old, used by last.fm and setlist.fm",
      "work entity = the abstract composition; recording entity = a specific version",
      "matching by work id is structurally correct, not heuristic",
      "songview integration auto-fills bmi and ascap work ids from iswc",
      "no $500/month gracenote dependency — bootstrap-friendly",
    ],
  },
  {
    title: "the product pays for itself",
    description:
      "a single recovered live performance royalty averages $15-75 per show — one match can cover a full year of subscription. when the product literally makes users more money than it costs, churn approaches zero. at 1,000 subscribers, we hit $108k arr. at 10,000, we cross $1m. the math scales because the scanning cost per user is near zero.",
    stats: [
      { value: "$9/mo", label: "pro subscription" },
      { value: "$15-75", label: "avg royalty per show recovered" },
      { value: "$108k", label: "arr at 1,000 subscribers" },
    ],
  },
  {
    title: "mvp shipped. beta in progress.",
    description:
      "built and deployed in weeks using ai-assisted development. the speed of iteration is itself a competitive advantage — we ship features faster than incumbents ship meeting agendas.",
    stats: [
      { value: "96+", label: "automated tests" },
      { value: "live", label: "production app" },
      { value: "weeks", label: "idea to deployed mvp" },
    ],
    bullets: [
      "full-stack web app — accounts, scanning, dashboard, export",
      "browser extension auto-fills royalty submission forms",
      "automated email alerts before filing deadlines expire",
      "ai-powered song matching with comprehensive test coverage",
    ],
  },
  {
    title: "competitive landscape",
    description:
      "the closest direct competitor is muzooka (founded 2011, $9m raised, ~12 employees, ~$8m arr). they ship setlist reporting to bmi only — no ascap, no sesac, no gmr after 5+ years of trying. they require manual setlist entry. they have no audio fingerprinting, no mobile app, no dj market. they're a recording academy partner for artist asset management, not royalty automation. audoo (uk) does audio fingerprinting but is europe-only. no us competitor combines automated discovery + multi-pro support + dj market.",
    bullets: [
      "muzooka — manual entry, bmi-only, no asacp, b2b/major-label focus, stalled since 2020",
      "audoo (uk) — audio fingerprinting, prs/ppl partnership, no us presence",
      "songtrust, cd baby, tunecore — streaming and mechanical royalties only, not live",
      "bmi live, ascap onstage — pro-owned manual portals, no discovery layer",
      "srt — automated discovery + chrome extension auto-fill + multi-pro + dj market + work-id matching",
    ],
  },
  {
    title: "seed round",
    description:
      "we're raising to build direct integrations with royalty organizations, acquire our first 1,000 paying users, secure a commercial data license, and make one key hire to accelerate growth.",
    bullets: [
      "direct api integrations with major royalty organizations",
      "first 1,000 paying subscribers",
      "commercial concert data license",
      "one hire: growth or senior engineer",
    ],
  },
]

const NAV_LABELS = [
  "intro",
  "the problem",
  "why now",
  "the solution",
  "ai architecture",
  "market",
  "dj market",
  "network effect",
  "technical moat",
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
  const progressStartRef = useRef(Date.now())
  const [progressPct, setProgressPct] = useState(0)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const pausedAtRef = useRef(0) // elapsed ms when paused
  const sceneRef = useRef<{
    renderer: any; scene: any; camera: any; uniforms: any; animationId: number | null
  }>({ renderer: null, scene: null, camera: null, uniforms: null, animationId: null })

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
        <a href="/" className="flex flex-col items-start hover:opacity-70 transition-opacity">
          <MorphingText className="text-[24px] md:text-[28px]" />
          <span className="text-[12px] md:text-[13px] tracking-[-0.3px] text-white" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>setlist royalty tracker</span>
        </a>
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
