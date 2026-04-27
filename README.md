# Aesthetic ASCII

A GPU-native ASCII video shader that transforms your webcam feed into stunning real-time ASCII art with multiple aesthetic modes.

Built with React, Three.js, and custom GLSL shaders — runs entirely on the GPU at 60 FPS.

## ✨ Features

- **3 Aesthetic Modes** with smooth crossfade transitions:
  - **MATRIX** — Neon green rain cascading over your silhouette
  - **CYBERPUNK** — Chromatic aberration, CRT scanlines, glitch tears, tri-color neon
  - **ANIME** — Cel-shaded manga style with ink outlines, screentones, and sakura palette

- **5 Quality Presets** — From POTATO (50 cells) to ULTRA (150 cells) with animated transitions
- **Real-time webcam processing** — All rendering happens on the GPU via GLSL fragment shaders
- **Zero CPU overhead** — No per-pixel JavaScript; the entire ASCII grid is computed in a single shader pass

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A webcam
- A modern browser with WebGL support

### Install & Run

```bash
# Clone the repo
git clone https://github.com/<your-username>/aesthetic-ascii.git
cd aesthetic-ascii

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and allow camera access.

### Build for Production

```bash
npm run build
npm run preview
```

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| 3D / WebGL | Three.js r184 + React Three Fiber |
| Shaders | Custom GLSL (vertex + fragment) |
| Styling | Tailwind CSS v4 |
| Bundler | Vite 8 |
| Icons | Lucide React |

## 📁 Project Structure

```
src/
├── main.tsx                  # App entry point
├── App.tsx                   # UI controls + Canvas setup
├── index.css                 # Global styles
├── themes.ts                 # Theme color definitions
├── components/
│   └── VideoShader.tsx       # WebGL shader material + animation loop
└── hooks/
    └── useWebcam.ts          # Webcam stream hook with cleanup
```

## 🎮 Controls

| Control | Description |
|---|---|
| **MATRIX / CYBERPUNK / ANIME** | Switch aesthetic mode (600ms crossfade) |
| **POTATO → ULTRA** | Adjust ASCII grid density (300ms transition) |
| **📷 Button** | Screenshot (coming soon) |

## ⚡ Performance Notes

- Webcam captures at 720p @ 30fps — sufficient since the shader grid-snaps to 50-150 cells
- Canvas renders at 1× DPR — ASCII blocks don't benefit from retina resolution
- Video texture auto-updates via Three.js `VideoTexture` — no per-frame CPU touch
- Frame delta is capped at 50ms to prevent spiral lag from dropped frames

## 📝 License

MIT
