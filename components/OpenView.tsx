'use client'

import React, {
  useRef, useState, useEffect, useCallback, useLayoutEffect
} from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

type AspectRatio = '16:9' | '2.39:1' | '1.85:1' | '4:3' | '1:1'
type LensPreset = '24mm' | '35mm' | '50mm' | '85mm' | '135mm'
type AnglePreset =
  | 'none' | 'eye_level' | 'high_angle' | 'low_angle'
  | 'dutch_tilt' | 'birds_eye' | 'worms_eye'

interface Overlays {
  thirds: boolean
  crosshair: boolean
  goldenSpiral: boolean
}

interface DirectorMark {
  id: string
  x: number // percent
  y: number // percent
  label: string
  color: string
}

interface RefShot {
  id: string
  dataURL: string
  lens: LensPreset
  aspect: AspectRatio
  angle: AnglePreset
  ts: number
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ASPECT_RATIOS: { label: AspectRatio; ratio: number }[] = [
  { label: '16:9', ratio: 16 / 9 },
  { label: '2.39:1', ratio: 2.39 },
  { label: '1.85:1', ratio: 1.85 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '1:1', ratio: 1 },
]

const LENSES: { label: LensPreset; scale: number; equiv: string }[] = [
  { label: '24mm', scale: 0.72, equiv: '×0.5 Wide' },
  { label: '35mm', scale: 0.88, equiv: '×0.7 Semi-Wide' },
  { label: '50mm', scale: 1.0, equiv: '×1.0 Normal' },
  { label: '85mm', scale: 1.35, equiv: '×1.7 Portrait' },
  { label: '135mm', scale: 1.9, equiv: '×2.7 Tele' },
]

const ANGLES: { label: AnglePreset; display: string }[] = [
  { label: 'none', display: 'None' },
  { label: 'eye_level', display: 'Eye Level' },
  { label: 'high_angle', display: 'High Angle' },
  { label: 'low_angle', display: 'Low Angle' },
  { label: 'dutch_tilt', display: 'Dutch Tilt' },
  { label: 'birds_eye', display: "Bird's Eye" },
  { label: 'worms_eye', display: "Worm's Eye" },
]

const MARK_COLORS = ['#FF3D5A', '#FFB800', '#00CFFF', '#7EFF9B', '#FF8C42', '#C77DFF']

const DB_NAME = 'openview_library'
const DB_STORE = 'shots'

// ─── IndexedDB helpers ───────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DB_STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function dbSave(shot: RefShot) {
  const db = await openDB()
  return new Promise<void>((res, rej) => {
    const tx = db.transaction(DB_STORE, 'readwrite')
    tx.objectStore(DB_STORE).put(shot)
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  })
}

async function dbLoad(): Promise<RefShot[]> {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(DB_STORE, 'readonly')
    const req = tx.objectStore(DB_STORE).getAll()
    req.onsuccess = () => res(req.result as RefShot[])
    req.onerror = () => rej(req.error)
  })
}

async function dbDelete(id: string) {
  const db = await openDB()
  return new Promise<void>((res, rej) => {
    const tx = db.transaction(DB_STORE, 'readwrite')
    tx.objectStore(DB_STORE).delete(id)
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  })
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const Icons = {
  aperture: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="3" x2="12" y2="9" />
      <line x1="3" y1="12" x2="9" y2="12" />
      <line x1="21" y1="12" x2="15" y2="12" />
      <line x1="12" y1="21" x2="12" y2="15" />
      <line x1="5.64" y1="5.64" x2="9.17" y2="9.17" />
      <line x1="18.36" y1="18.36" x2="14.83" y2="14.83" />
      <line x1="18.36" y1="5.64" x2="14.83" y2="9.17" />
      <line x1="5.64" y1="18.36" x2="9.17" y2="14.83" />
    </svg>
  ),
  lens: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v2M12 18v2M4 12h2M18 12h2" />
    </svg>
  ),
  angle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 20L12 4l9 16H3z" />
      <line x1="12" y1="4" x2="12" y2="20" strokeDasharray="2 2" />
    </svg>
  ),
  aspect: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="6" width="18" height="12" rx="1" />
      <path d="M7 6v12M17 6v12" strokeDasharray="2 2" />
    </svg>
  ),
  library: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="8" height="6" rx="1" />
      <rect x="13" y="3" width="8" height="6" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
    </svg>
  ),
  settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  mark: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  ),
  close: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  compare: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="4" width="20" height="16" rx="1" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <path d="M7 10l-2 2 2 2M17 10l2 2-2 2" />
    </svg>
  ),
  reset: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),
}

// ─── Overlay Canvas ───────────────────────────────────────────────────────────

function drawOverlays(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  overlays: Overlays,
  activeAR: AspectRatio
) {
  ctx.clearRect(0, 0, w, h)

  // Compute active viewport (crop area for aspect ratio)
  const ar = ASPECT_RATIOS.find(a => a.label === activeAR)!
  const viewW = Math.min(w, h * ar.ratio)
  const viewH = Math.min(h, w / ar.ratio)
  const vx = (w - viewW) / 2
  const vy = (h - viewH) / 2

  const blue = 'rgba(0,207,255,0.55)'
  const blueDim = 'rgba(0,207,255,0.25)'

  if (overlays.thirds) {
    ctx.strokeStyle = blue
    ctx.lineWidth = 1
    ctx.setLineDash([])
    for (let i = 1; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo(vx + (viewW * i) / 3, vy)
      ctx.lineTo(vx + (viewW * i) / 3, vy + viewH)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(vx, vy + (viewH * i) / 3)
      ctx.lineTo(vx + viewW, vy + (viewH * i) / 3)
      ctx.stroke()
    }
    // intersections
    ctx.fillStyle = blue
    for (let i = 1; i < 3; i++) {
      for (let j = 1; j < 3; j++) {
        ctx.beginPath()
        ctx.arc(vx + (viewW * i) / 3, vy + (viewH * j) / 3, 4, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  if (overlays.crosshair) {
    const cx = vx + viewW / 2
    const cy = vy + viewH / 2
    ctx.strokeStyle = blueDim
    ctx.lineWidth = 1
    ctx.setLineDash([4, 6])

    ctx.beginPath()
    ctx.moveTo(cx, vy)
    ctx.lineTo(cx, vy + viewH)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(vx, cy)
    ctx.lineTo(vx + viewW, cy)
    ctx.stroke()

    // Center mark
    ctx.setLineDash([])
    ctx.strokeStyle = blue
    ctx.lineWidth = 1.5
    ctx.strokeRect(cx - 15, cy - 15, 30, 30)

    ctx.beginPath()
    ctx.arc(cx, cy, 4, 0, Math.PI * 2)
    ctx.fillStyle = blue
    ctx.fill()
  }

  if (overlays.goldenSpiral) {
    // Fibonacci-based golden spiral approximation
    ctx.strokeStyle = 'rgba(255,184,0,0.45)'
    ctx.lineWidth = 1.2
    ctx.setLineDash([])
    const cx = vx + viewW / 2
    const cy = vy + viewH / 2
    const maxR = Math.min(viewW, viewH) * 0.42

    ctx.beginPath()
    let angle = 0
    for (let i = 0; i < 720; i++) {
      angle = (i * Math.PI) / 180
      const r = maxR * Math.pow(1.0055, i)
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  ctx.setLineDash([])
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OpenView() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const uiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const brightnessRef = useRef<number>(0.6)
  const brightnessCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const brightnessCtxRef = useRef<CanvasRenderingContext2D | null>(null)

  const [camState, setCamState] = useState<'loading' | 'active' | 'denied' | 'mock'>('loading')
  const [lens, setLens] = useState<LensPreset>('50mm')
  const [aspect, setAspect] = useState<AspectRatio>('16:9')
  const [angle, setAngle] = useState<AnglePreset>('none')
  const [overlays, setOverlays] = useState<Overlays>({ thirds: true, crosshair: false, goldenSpiral: false })
  const [marks, setMarks] = useState<DirectorMark[]>([])
  const [library, setLibrary] = useState<RefShot[]>([])
  const [showLibrary, setShowLibrary] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [activeDrawer, setActiveDrawer] = useState<'lens' | 'angle' | 'aspect' | null>(null)
  const [markMode, setMarkMode] = useState(false)
  const [compareShot, setCompareShot] = useState<RefShot | null>(null)
  const [uiVisible, setUiVisible] = useState(true)
  const [flash, setFlash] = useState(false)
  const [exposure, setExposure] = useState(0.6)
  const [lensLabelVisible, setLensLabelVisible] = useState(false)
  const lensLabelTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentLens = LENSES.find(l => l.label === lens)!

  // ── Camera init ─────────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    setCamState('loading')
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setCamState('active')
      }
    } catch {
      // Try front camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
          setCamState('active')
        }
      } catch {
        setCamState('denied')
      }
    }
  }, [])

  useEffect(() => {
    // On mount, request on first user gesture (iOS requirement)
    startCamera()
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      cancelAnimationFrame(rafRef.current)
    }
  }, [startCamera])

  // ── Load library from IndexedDB ─────────────────────────────────────────────

  useEffect(() => {
    dbLoad().then(setLibrary).catch(() => {})
  }, [])

  // ── Overlay rendering loop ──────────────────────────────────────────────────

  useLayoutEffect(() => {
    let animId: number

    const tick = () => {
      const canvas = canvasRef.current
      const wrap = wrapRef.current
      if (!canvas || !wrap) { animId = requestAnimationFrame(tick); return }

      const { width, height } = wrap.getBoundingClientRect()
      if (canvas.width !== Math.round(width) || canvas.height !== Math.round(height)) {
        canvas.width = Math.round(width)
        canvas.height = Math.round(height)
      }

      const ctx = canvas.getContext('2d')
      if (ctx) drawOverlays(ctx, canvas.width, canvas.height, overlays, aspect)

      // Brightness sampling
      if (camState === 'active' && videoRef.current?.readyState === 4) {
        if (!brightnessCanvasRef.current) {
          brightnessCanvasRef.current = document.createElement('canvas')
          brightnessCanvasRef.current.width = 32
          brightnessCanvasRef.current.height = 18
          brightnessCtxRef.current = brightnessCanvasRef.current.getContext('2d', { willReadFrequently: true })
        }
        const bc = brightnessCtxRef.current
        if (bc) {
          bc.drawImage(videoRef.current, 0, 0, 32, 18)
          const d = bc.getImageData(0, 0, 32, 18).data
          let sum = 0
          for (let i = 0; i < d.length; i += 4) {
            sum += (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255
          }
          const avg = sum / (d.length / 4)
          // Smooth
          brightnessRef.current = brightnessRef.current * 0.93 + avg * 0.07
          setExposure(brightnessRef.current)
        }
      }

      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [overlays, aspect, camState])

  // ── Auto-hide UI ────────────────────────────────────────────────────────────

  const resetUiTimer = useCallback(() => {
    setUiVisible(true)
    if (uiTimerRef.current) clearTimeout(uiTimerRef.current)
    uiTimerRef.current = setTimeout(() => {
      if (!activeDrawer && !showLibrary && !showSettings) setUiVisible(false)
    }, 3500)
  }, [activeDrawer, showLibrary, showSettings])

  useEffect(() => {
    resetUiTimer()
    return () => { if (uiTimerRef.current) clearTimeout(uiTimerRef.current) }
  }, [resetUiTimer])

  useEffect(() => {
    // Reshow UI when drawer/modal changes
    if (activeDrawer || showLibrary || showSettings) setUiVisible(true)
  }, [activeDrawer, showLibrary, showSettings])

  // ── Lens scale ──────────────────────────────────────────────────────────────

  const lensScale = currentLens.scale

  // ── Aspect ratio letterbox ──────────────────────────────────────────────────

  function getLetterboxBars(containerW: number, containerH: number, arLabel: AspectRatio) {
    if (!containerW || !containerH) return { top: 0, bottom: 0 }
    const ar = ASPECT_RATIOS.find(a => a.label === arLabel)!.ratio
    const containerAR = containerW / containerH
    if (containerAR <= ar) {
      // Black bars top/bottom
      const contentH = containerW / ar
      const bar = (containerH - contentH) / 2
      return { top: bar, bottom: bar }
    }
    return { top: 0, bottom: 0 }
  }

  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const e = entries[0]
      setContainerSize({ w: e.contentRect.width, h: e.contentRect.height })
    })
    if (wrapRef.current) obs.observe(wrapRef.current)
    return () => obs.disconnect()
  }, [])

  const bars = getLetterboxBars(containerSize.w, containerSize.h, aspect)

  // ── Director's mark tap ─────────────────────────────────────────────────────

  const handleViewTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    resetUiTimer()
    if (activeDrawer) { setActiveDrawer(null); return }
    if (showSettings) { setShowSettings(false); return }

    if (!markMode) return

    const rect = wrapRef.current!.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100

    const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const nextLabel = labels[marks.length % labels.length]
    const color = MARK_COLORS[marks.length % MARK_COLORS.length]

    setMarks(prev => [...prev, {
      id: crypto.randomUUID(),
      x, y,
      label: nextLabel,
      color,
    }])

    // Haptic
    if ('vibrate' in navigator) navigator.vibrate(20)
  }, [markMode, marks, activeDrawer, showSettings, resetUiTimer])

  // ── Capture ─────────────────────────────────────────────────────────────────

  const capture = useCallback(async () => {
    setFlash(true)
    setTimeout(() => setFlash(false), 250)

    // Shutter sound
    try {
      const ctx = new AudioContext()
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate)
      const ch = buf.getChannelData(0)
      for (let i = 0; i < ch.length; i++) {
        ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length) * 0.15
      }
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      src.start()
    } catch { /* silent mode */ }

    // Compose frame
    const video = videoRef.current
    const overlayCanvas = canvasRef.current
    if (!video || !overlayCanvas) return

    const cc = captureCanvasRef.current!
    cc.width = video.videoWidth || 1920
    cc.height = video.videoHeight || 1080
    const ctx = cc.getContext('2d')!

    ctx.drawImage(video, 0, 0, cc.width, cc.height)

    // Draw overlays scaled to video
    const scaleX = cc.width / overlayCanvas.width
    const scaleY = cc.height / overlayCanvas.height
    ctx.save()
    ctx.scale(scaleX, scaleY)
    ctx.drawImage(overlayCanvas, 0, 0)
    ctx.restore()

    const dataURL = cc.toDataURL('image/png')

    // Download
    const a = document.createElement('a')
    a.href = dataURL
    a.download = `openview_${Date.now()}.png`
    a.click()

    // Save to library
    const shot: RefShot = {
      id: crypto.randomUUID(),
      dataURL,
      lens,
      aspect,
      angle,
      ts: Date.now(),
    }
    setLibrary(prev => [shot, ...prev])
    await dbSave(shot).catch(() => {})
  }, [lens, aspect, angle])

  // ── Recall shot settings ────────────────────────────────────────────────────

  const recallShot = (shot: RefShot) => {
    setLens(shot.lens)
    setAspect(shot.aspect)
    setAngle(shot.angle)
    setCompareShot(shot)
    setShowLibrary(false)
  }

  const deleteShot = async (id: string) => {
    setLibrary(prev => prev.filter(s => s.id !== id))
    await dbDelete(id).catch(() => {})
  }

  // ── Reset ───────────────────────────────────────────────────────────────────

  const reset = () => {
    setLens('50mm')
    setAspect('16:9')
    setAngle('none')
    setMarks([])
    setCompareShot(null)
    setOverlays({ thirds: true, crosshair: false, goldenSpiral: false })
  }

  // ── Lens change with label flash ─────────────────────────────────────────────

  const changeLens = (l: LensPreset) => {
    setLens(l)
    setLensLabelVisible(true)
    if (lensLabelTimer.current) clearTimeout(lensLabelTimer.current)
    lensLabelTimer.current = setTimeout(() => setLensLabelVisible(false), 2000)
  }

  // ── Angle guide rendering ────────────────────────────────────────────────────

  function AngleGuide() {
    if (angle === 'none') return null
    const guides: Record<AnglePreset, React.ReactNode> = {
      none: null,
      eye_level: (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', height: '1px', background: 'rgba(0,207,255,0.4)', boxShadow: '0 0 6px rgba(0,207,255,0.3)' }} />
          <div className="angle-guide-text" style={{ top: 'calc(50% + 16px)', left: '50%', transform: 'translateX(-50%)', position: 'absolute', fontSize: 11 }}>EYE LEVEL</div>
        </div>
      ),
      high_angle: (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 80 }}>
          <svg width="40" height="40" viewBox="0 0 40 40" style={{ opacity: 0.6 }}>
            <path d="M20 36 L20 8 M12 16 L20 8 L28 16" stroke="#00CFFF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="angle-guide-text" style={{ position: 'static', marginTop: 6, fontSize: 11 }}>HIGH ANGLE</div>
        </div>
      ),
      low_angle: (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 100 }}>
          <div className="angle-guide-text" style={{ position: 'static', marginBottom: 6, fontSize: 11 }}>LOW ANGLE</div>
          <svg width="40" height="40" viewBox="0 0 40 40" style={{ opacity: 0.6 }}>
            <path d="M20 4 L20 32 M12 24 L20 32 L28 24" stroke="#00CFFF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ),
      dutch_tilt: (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div className="dutch-tilt-line" />
          <div className="dutch-tilt-line" style={{ top: '33%' }} />
          <div className="dutch-tilt-line" style={{ top: '67%' }} />
          <div className="angle-guide-text" style={{ position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)', fontSize: 11 }}>DUTCH TILT −12°</div>
        </div>
      ),
      birds_eye: (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '50%', aspectRatio: '1', borderRadius: '50%', border: '1px solid rgba(0,207,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '20%', aspectRatio: '1', borderRadius: '50%', background: 'rgba(0,207,255,0.3)' }} />
          </div>
          <div className="angle-guide-text" style={{ position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)', fontSize: 11 }}>BIRD'S EYE</div>
        </div>
      ),
      worms_eye: (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 100 }}>
          <div>
            <div className="angle-guide-text" style={{ position: 'static', fontSize: 11, textAlign: 'center' }}>WORM'S EYE</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ width: 2, height: 40 + i * 12, background: 'rgba(0,207,255,0.4)' }} />
              ))}
            </div>
          </div>
        </div>
      ),
    }
    return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 16 }}>{guides[angle]}</div>
  }

  // ── DOF blur ─────────────────────────────────────────────────────────────────

  const dofActive = lens === '85mm' || lens === '135mm'

  // ── Exposure classification ──────────────────────────────────────────────────

  const expClass = exposure < 0.25 ? 'underexposed' : exposure > 0.75 ? 'overexposed' : ''

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      ref={wrapRef}
      className="viewfinder-wrap"
      onClick={resetUiTimer}
      onTouchStart={resetUiTimer}
    >
      {/* Camera video */}
      <video
        ref={videoRef}
        className="camera-stream"
        playsInline
        muted
        autoPlay
        style={{
          transform: `scale(${lensScale})`,
          filter: camState === 'mock' ? 'hue-rotate(10deg)' : undefined,
        }}
      />

      {/* Aspect ratio letterbox */}
      <div className="aspect-mask">
        <div className="bar bar-top" style={{ height: bars.top }} />
        <div className="bar bar-bottom" style={{ height: bars.bottom }} />
      </div>

      {/* Overlay canvas */}
      <canvas ref={canvasRef} className="overlay-canvas" />

      {/* Hidden capture canvas */}
      <canvas ref={captureCanvasRef} style={{ display: 'none' }} />

      {/* DOF edge blur */}
      <div className={`dof-blur${dofActive ? ' active' : ''}`} />

      {/* Angle guide */}
      <AngleGuide />

      {/* Director's marks */}
      {marks.map(m => (
        <div
          key={m.id}
          className="director-mark"
          style={{ left: `${m.x}%`, top: `${m.y}%` }}
        >
          <div className="mark-label">{m.label}</div>
          <div
            className="mark-dot"
            style={{ background: m.color }}
            onClick={e => {
              e.stopPropagation()
              setMarks(prev => prev.filter(x => x.id !== m.id))
            }}
          >
            {m.label}
          </div>
        </div>
      ))}

      {/* Compare overlay */}
      {compareShot && (
        <div className="compare-overlay">
          <img src={compareShot.dataURL} alt="Reference" />
        </div>
      )}

      {/* Shutter flash */}
      {flash && <div className="shutter-flash" />}

      {/* Lens label */}
      <div className={`lens-label ui-chrome${lensLabelVisible ? '' : ' hidden'}`}>
        {lens} · {currentLens.equiv}
      </div>

      {/* ── TOP HUD ── */}
      <div className={`hud-bar ui-chrome${uiVisible ? '' : ' hidden'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="hud-logo">OPEN<span>VIEW</span></div>
          <span style={{ fontSize: 9, color: 'var(--film-muted)', letterSpacing: '0.12em' }}>OPENSLATE</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="hud-tag">{lens}</span>
          <span className="hud-tag">{aspect}</span>

          {/* Light meter */}
          <div className="exposure-meter">
            <span style={{ fontSize: 9, color: 'var(--film-muted)', letterSpacing: '0.06em' }}>EXP</span>
            <div className="meter-bar">
              <div
                className={`meter-fill ${expClass}`}
                style={{ width: `${Math.min(100, exposure * 100)}%` }}
              />
            </div>
          </div>

          {/* Settings */}
          <button
            className={`tool-btn${showSettings ? ' active' : ''}`}
            style={{ padding: 4 }}
            onClick={e => { e.stopPropagation(); setShowSettings(s => !s); setActiveDrawer(null) }}
          >
            <Icons.settings />
          </button>
        </div>
      </div>

      {/* ── SETTINGS PANEL ── */}
      {showSettings && (
        <div className="settings-panel ui-chrome" onClick={e => e.stopPropagation()}>
          <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 14, letterSpacing: '0.1em', color: '#fff', marginBottom: 8 }}>OVERLAYS</div>
          {[
            { key: 'thirds' as keyof Overlays, label: 'Rule of Thirds' },
            { key: 'crosshair' as keyof Overlays, label: 'Crosshair' },
            { key: 'goldenSpiral' as keyof Overlays, label: 'Golden Spiral' },
          ].map(({ key, label }) => (
            <div
              key={key}
              className="toggle-row"
              onClick={() => setOverlays(o => ({ ...o, [key]: !o[key] }))}
            >
              <span>{label}</span>
              <div className={`toggle-switch${overlays[key] ? ' on' : ''}`}>
                <div className="toggle-thumb" />
              </div>
            </div>
          ))}
          <div className="toggle-row" onClick={() => setMarkMode(m => !m)}>
            <span>Mark Mode</span>
            <div className={`toggle-switch${markMode ? ' on' : ''}`}>
              <div className="toggle-thumb" />
            </div>
          </div>
          {compareShot && (
            <div className="toggle-row" onClick={() => setCompareShot(null)}>
              <span>Clear Compare</span>
              <span style={{ color: 'var(--film-red)', fontSize: 10 }}>✕</span>
            </div>
          )}
          <div
            className="toggle-row"
            style={{ color: 'var(--film-red)', cursor: 'pointer' }}
            onClick={() => { reset(); setShowSettings(false) }}
          >
            <span>Reset All</span>
            <Icons.reset />
          </div>
        </div>
      )}

      {/* ── BOTTOM TOOLBAR ── */}
      <div className={`bottom-toolbar ui-chrome${uiVisible ? '' : ' hidden'}`}>
        <div className="toolbar-row">
          {/* Lens */}
          <button
            className={`tool-btn${activeDrawer === 'lens' ? ' active' : ''}`}
            onClick={e => { e.stopPropagation(); setActiveDrawer(d => d === 'lens' ? null : 'lens'); setShowSettings(false) }}
          >
            <Icons.lens />
            LENS
          </button>

          {/* Angle */}
          <button
            className={`tool-btn${activeDrawer === 'angle' ? ' active' : ''}`}
            onClick={e => { e.stopPropagation(); setActiveDrawer(d => d === 'angle' ? null : 'angle'); setShowSettings(false) }}
          >
            <Icons.angle />
            ANGLE
          </button>

          {/* Capture */}
          <div className="capture-btn-wrap" onClick={e => e.stopPropagation()}>
            <div className="capture-ring" />
            <button
              className="capture-btn"
              onPointerDown={capture}
            >
              <div className="capture-btn-inner" />
            </button>
          </div>

          {/* Aspect */}
          <button
            className={`tool-btn${activeDrawer === 'aspect' ? ' active' : ''}`}
            onClick={e => { e.stopPropagation(); setActiveDrawer(d => d === 'aspect' ? null : 'aspect'); setShowSettings(false) }}
          >
            <Icons.aspect />
            RATIO
          </button>

          {/* Library */}
          <button
            className="tool-btn"
            onClick={e => { e.stopPropagation(); setShowLibrary(true); setActiveDrawer(null) }}
          >
            <Icons.library />
            LIB
          </button>
        </div>

        {/* Mark mode active indicator */}
        {markMode && (
          <div style={{
            textAlign: 'center',
            fontSize: 10,
            color: 'var(--film-amber)',
            letterSpacing: '0.12em',
            paddingBottom: 4,
            marginTop: -8,
          }}>
            ● TAP TO DROP MARK · TAP MARK TO REMOVE
          </div>
        )}
      </div>

      {/* Viewfinder tap for marks */}
      <div
        style={{ position: 'absolute', inset: 0, zIndex: markMode ? 25 : 5 }}
        onClick={handleViewTap}
      />

      {/* ── LENS DRAWER ── */}
      {activeDrawer === 'lens' && (
        <div className="drawer" onClick={e => e.stopPropagation()}>
          <div className="drawer-handle" />
          <div className="drawer-title">◎ LENS SIMULATION</div>
          <div className="drawer-grid">
            {LENSES.map(l => (
              <div
                key={l.label}
                className={`drawer-item${lens === l.label ? ' selected' : ''}`}
                onClick={() => { changeLens(l.label); setActiveDrawer(null) }}
              >
                <div className="di-main">{l.label}</div>
                <div style={{ fontSize: 9, color: 'var(--film-muted)', letterSpacing: '0.04em' }}>{l.equiv}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ANGLE DRAWER ── */}
      {activeDrawer === 'angle' && (
        <div className="drawer" onClick={e => e.stopPropagation()}>
          <div className="drawer-handle" />
          <div className="drawer-title">↕ ANGLE PRESET</div>
          <div className="drawer-grid">
            {ANGLES.map(a => (
              <div
                key={a.label}
                className={`drawer-item${angle === a.label ? ' selected' : ''}`}
                onClick={() => { setAngle(a.label); setActiveDrawer(null) }}
              >
                <div style={{ fontSize: 12, fontFamily: "'Bebas Neue', cursive", letterSpacing: '0.05em' }}>{a.display}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ASPECT RATIO DRAWER ── */}
      {activeDrawer === 'aspect' && (
        <div className="drawer" onClick={e => e.stopPropagation()}>
          <div className="drawer-handle" />
          <div className="drawer-title">▭ ASPECT RATIO</div>
          <div className="drawer-grid">
            {ASPECT_RATIOS.map(ar => (
              <div
                key={ar.label}
                className={`drawer-item${aspect === ar.label ? ' selected' : ''}`}
                onClick={() => { setAspect(ar.label); setActiveDrawer(null) }}
              >
                <div className="di-main" style={{ fontSize: 16 }}>{ar.label}</div>
                <div
                  style={{
                    width: '100%',
                    height: 20,
                    marginTop: 6,
                    border: `1px solid ${aspect === ar.label ? 'var(--film-blue)' : 'var(--film-border)'}`,
                    borderRadius: 1,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: `${Math.min(100, (ar.ratio / 2.39) * 100)}%`,
                      background: aspect === ar.label ? 'var(--film-blue-glow)' : 'rgba(255,255,255,0.05)',
                      borderLeft: `1px solid ${aspect === ar.label ? 'var(--film-blue)' : 'var(--film-border)'}`,
                      borderRight: `1px solid ${aspect === ar.label ? 'var(--film-blue)' : 'var(--film-border)'}`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LIBRARY MODAL ── */}
      {showLibrary && (
        <div className="library-modal" onClick={e => e.stopPropagation()}>
          <div className="library-header">
            <div>
              <div className="hud-logo">REFERENCE <span>LIBRARY</span></div>
              <div style={{ fontSize: 10, color: 'var(--film-muted)', letterSpacing: '0.08em', marginTop: 2 }}>
                {library.length} SHOT{library.length !== 1 ? 'S' : ''}
              </div>
            </div>
            <button
              className="tool-btn"
              onClick={() => setShowLibrary(false)}
              style={{ color: 'var(--film-red)' }}
            >
              <Icons.close />
            </button>
          </div>

          {library.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--film-muted)' }}>
              <Icons.library />
              <div style={{ fontSize: 12, letterSpacing: '0.08em' }}>NO SHOTS YET</div>
              <div style={{ fontSize: 11, textAlign: 'center', maxWidth: 200, lineHeight: 1.6 }}>
                Capture a frame to build your reference library
              </div>
            </div>
          ) : (
            <div className="library-grid">
              {library.map(shot => (
                <div key={shot.id} className="library-item">
                  <img src={shot.dataURL} alt={`Shot ${shot.lens}`} />
                  <div className="library-item-info">
                    {shot.lens} · {shot.aspect}
                  </div>
                  <button
                    className="library-item-del"
                    onClick={e => { e.stopPropagation(); deleteShot(shot.id) }}
                  >✕</button>
                  <div
                    style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}
                    onClick={() => recallShot(shot)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Compare controls */}
          {compareShot && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--film-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Icons.compare />
              <div style={{ fontSize: 11, letterSpacing: '0.08em', flex: 1 }}>
                COMPARING: {compareShot.lens} · {compareShot.aspect}
              </div>
              <button
                className="tool-btn"
                style={{ color: 'var(--film-red)', padding: 4 }}
                onClick={() => setCompareShot(null)}
              >
                <Icons.close />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── LOADING SCREEN ── */}
      {camState === 'loading' && (
        <div className="loading-screen">
          <div className="hud-logo" style={{ fontSize: 32, marginBottom: 8 }}>OPEN<span style={{ color: 'var(--film-blue)' }}>VIEW</span></div>
          <div className="aperture-anim" />
          <div className="loading-text">INITIALISING CAMERA</div>
        </div>
      )}

      {/* ── ERROR / DENIED SCREEN ── */}
      {camState === 'denied' && (
        <div className="error-screen">
          <div className="error-icon">⊗</div>
          <div className="error-title">CAMERA ACCESS DENIED</div>
          <div className="error-text">
            OPENVIEW needs camera access to function as a viewfinder.
            <br /><br />
            <strong>On iOS:</strong> Go to Settings → Safari → Camera → Allow<br />
            <strong>On Android:</strong> Tap the lock icon in your browser address bar and enable Camera<br />
            <strong>On Desktop:</strong> Click the camera icon in your browser address bar
          </div>
          <button className="retry-btn" onClick={startCamera}>
            RETRY CAMERA
          </button>
          <button
            className="retry-btn"
            style={{ background: 'transparent', border: '1px solid var(--film-border)', color: 'var(--film-text)', marginTop: 12 }}
            onClick={() => setCamState('mock')}
          >
            CONTINUE WITHOUT CAMERA
          </button>
        </div>
      )}
    </div>
  )
}
