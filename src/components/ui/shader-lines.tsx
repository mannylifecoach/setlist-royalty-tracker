"use client"

import { useEffect, useRef } from "react"

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    THREE: any
  }
}

export function ShaderLines() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    camera: unknown
    scene: unknown
    renderer: unknown
    uniforms: Record<string, unknown>
    animationId: number | null
  }>({
    camera: null,
    scene: null,
    renderer: null,
    uniforms: {},
    animationId: null,
  })

  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/89/three.min.js"
    script.onload = () => {
      if (containerRef.current && window.THREE) {
        initThreeJS()
      }
    }
    document.head.appendChild(script)

    return () => {
      if (sceneRef.current.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId)
      }
      if (sceneRef.current.renderer) {
        (sceneRef.current.renderer as { dispose: () => void }).dispose()
      }
      if (script.parentNode) {
        document.head.removeChild(script)
      }
    }
  }, [])

  const initThreeJS = () => {
    if (!containerRef.current || !window.THREE) return

    const THREE = window.THREE as Record<string, unknown>
    const container = containerRef.current

    container.innerHTML = ""

    const CameraClass = THREE.Camera as new () => unknown
    const SceneClass = THREE.Scene as new () => { add: (mesh: unknown) => void }
    const PlaneBufferGeometryClass = THREE.PlaneBufferGeometry as new (w: number, h: number) => unknown
    const Vector2Class = THREE.Vector2 as new () => unknown
    const ShaderMaterialClass = THREE.ShaderMaterial as new (opts: Record<string, unknown>) => unknown
    const MeshClass = THREE.Mesh as new (geo: unknown, mat: unknown) => unknown
    const WebGLRendererClass = THREE.WebGLRenderer as new () => {
      setPixelRatio: (r: number) => void
      setSize: (w: number, h: number) => void
      render: (scene: unknown, camera: unknown) => void
      dispose: () => void
      domElement: HTMLCanvasElement
    }

    const camera = new CameraClass()
    ;(camera as { position: { z: number } }).position.z = 1

    const scene = new SceneClass()
    const geometry = new PlaneBufferGeometryClass(2, 2)

    const uniforms = {
      time: { type: "f", value: 1.0 },
      resolution: { type: "v2", value: new Vector2Class() },
    }

    const vertexShader = `
      void main() {
        gl_Position = vec4( position, 1.0 );
      }
    `

    const fragmentShader = `
      #define TWO_PI 6.2831853072
      #define PI 3.14159265359

      precision highp float;
      uniform vec2 resolution;
      uniform float time;

      float random (in float x) {
          return fract(sin(x)*1e4);
      }
      float random (vec2 st) {
          return fract(sin(dot(st.xy,
                               vec2(12.9898,78.233)))*
              43758.5453123);
      }

      varying vec2 vUv;

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);

        vec2 fMosaicScal = vec2(4.0, 2.0);
        vec2 vScreenSize = vec2(256,256);
        uv.x = floor(uv.x * vScreenSize.x / fMosaicScal.x) / (vScreenSize.x / fMosaicScal.x);
        uv.y = floor(uv.y * vScreenSize.y / fMosaicScal.y) / (vScreenSize.y / fMosaicScal.y);

        float t = time*0.06+random(uv.x)*0.4;
        float lineWidth = 0.0008;

        vec3 color = vec3(0.0);
        for(int j = 0; j < 3; j++){
          for(int i=0; i < 5; i++){
            color[j] += lineWidth*float(i*i) / abs(fract(t - 0.01*float(j)+float(i)*0.01)*1.0 - length(uv));
          }
        }

        gl_FragColor = vec4(color[2],color[1],color[0],1.0);
      }
    `

    const material = new ShaderMaterialClass({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    })

    const mesh = new MeshClass(geometry, material)
    scene.add(mesh)

    const renderer = new WebGLRendererClass()
    renderer.setPixelRatio(window.devicePixelRatio)
    ;(renderer as unknown as { setClearColor: (color: number, alpha: number) => void }).setClearColor(0x000000, 1)
    container.appendChild(renderer.domElement)

    sceneRef.current = {
      camera,
      scene,
      renderer,
      uniforms,
      animationId: null,
    }

    const onWindowResize = () => {
      const rect = container.getBoundingClientRect()
      renderer.setSize(rect.width, rect.height)
      const res = uniforms.resolution.value as { x: number; y: number }
      res.x = renderer.domElement.width
      res.y = renderer.domElement.height
    }

    onWindowResize()
    window.addEventListener("resize", onWindowResize, false)

    const animate = () => {
      sceneRef.current.animationId = requestAnimationFrame(animate)
      ;(uniforms.time.value as number) += 0.05
      uniforms.time.value = (uniforms.time.value as number) + 0
      renderer.render(scene, camera)
    }

    animate()

    return () => {
      window.removeEventListener("resize", onWindowResize)
    }
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full absolute inset-0"
    />
  )
}
