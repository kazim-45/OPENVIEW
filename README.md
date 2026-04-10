# OPENVIEW — Filmmaker's Digital Viewfinder

Part of the **OPENSLATE** suite · [openview.vercel.app](https://openview.vercel.app)

A professional, mobile-first viewfinder tool for filmmakers. Simulate lenses, frame with aspect ratio guides, drop director's marks, and capture reference shots — all in the browser with zero setup.

---

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and allow camera access.

> **iOS Note**: Camera access requires HTTPS. For local dev on iPhone, either use a tunneling service like `ngrok` or deploy to Vercel (it's free and instant).

## Feature Overview

| Feature | Details |
|---|---|
| **Lens Simulation** | 24mm → 135mm via digital zoom (transform: scale) |
| **Aspect Ratios** | 16:9, 2.39:1 (CinemaScope), 1.85:1, 4:3, 1:1 |
| **Framing Guides** | Rule of Thirds, Crosshair, Golden Spiral |
| **Angle Presets** | Eye Level, High, Low, Dutch Tilt, Bird's Eye, Worm's Eye |
| **Director's Marks** | Tap-to-drop coloured markers with labels (A, B, C…) |
| **Capture** | Saves frame + overlays as PNG, stores in reference library |
| **Reference Library** | Persists in IndexedDB across reloads |
| **Compare Mode** | Tap a library shot to overlay it on the live view |
| **Exposure Meter** | Real-time brightness sampled from camera feed (32×18 canvas) |
| **DOF Simulation** | Subtle edge blur on 85mm and 135mm lenses |
| **Auto-hide UI** | All chrome hides after 3.5s of inactivity |
| **Shutter Sound** | Synthesised noise burst via Web Audio API (respects silent mode) |
| **Haptics** | `navigator.vibrate(20)` on mark drop |

---

## Creative Decisions

- **Aperture-blade loading spinner** — uses a rotating border to echo the aperture iris opening. Signals "this is a camera tool" immediately.
- **Live brightness sampling** — every frame, a 32×18 downscaled canvas reads the average luminance of the video feed and smooths it into the exposure meter. No sensors needed.
- **Synthesised shutter sound** — short white noise burst with exponential decay via Web Audio API. No audio file dependency, respects silent mode.
- **Golden spiral via polar coordinates** — the spiral is drawn by stepping through 720° of angle and growing the radius exponentially (r = maxR × 1.0055^i), producing a true Fibonacci-flavoured golden spiral.
- **Lens scale mapped to real FOV** — 50mm is ×1.0 (reference). 24mm is ×0.72 (zoomed out), 135mm is ×1.9 (tight crop). These match approximate field-of-view ratios relative to 50mm on a full-frame sensor.

---

## Stack

- **Next.js 14** (App Router, static export)
- **TypeScript**
- **Tailwind CSS** + custom CSS variables
- **Canvas API** for overlay rendering & capture compositing
- **IndexedDB** for reference library persistence
- **Web Audio API** for shutter sound
- **getUserMedia** for camera (no third-party library)

---

## Folder Structure

```
openview/
├── app/
│   ├── layout.tsx       # Font loading, viewport meta
│   ├── page.tsx         # Dynamic import wrapper (disables SSR)
│   └── globals.css      # All styles (CSS variables, animations)
├── components/
│   └── OpenView.tsx     # Main viewfinder component (~500 lines)
├── public/
│   └── manifest.json    # PWA manifest
├── next.config.js
├── tailwind.config.js
└── README.md
```

---

## OPENSLATE Suite

| Tool | URL | Purpose |
|---|---|---|
| OPENWRITE | openwrite.vercel.app | Screenwriting |
| OPENFRAME | openframev1.vercel.app | Storyboarding & pre-production |
| OPENVIEW | openview.vercel.app | Digital viewfinder |
