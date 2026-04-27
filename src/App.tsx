import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useWebcam } from './hooks/useWebcam';
import { VideoShader } from './components/VideoShader';
import { Camera } from 'lucide-react';

/* ═══ Quality presets → uGridSize ═══ */
type Quality = 'POTATO' | 'LOW' | 'MID' | 'HIGH' | 'ULTRA';

const QUALITY_MAP: Record<Quality, number> = {
  POTATO: 50,
  LOW: 75,
  MID: 105,
  HIGH: 130,
  ULTRA: 150,
};

/* ═══ Aesthetic personality modes → uMode ═══ */
interface ModeEntry {
  name: string;
  index: number;
  color: string;
}

const MODES: ModeEntry[] = [
  { name: 'MATRIX', index: 0, color: '#00FF41' },
  { name: 'CYBERPUNK', index: 1, color: '#FF2079' },
  { name: 'ANIME', index: 2, color: '#FFB7C5' },
];

function App() {
  const { videoRef, error } = useWebcam();
  const [quality, setQuality] = useState<Quality>('MID');
  const [modeIndex, setModeIndex] = useState(0);

  return (
    <main className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden relative">
      {error && (
        <div className="text-red-500 font-mono z-10 absolute">{error}</div>
      )}

      {/* Invisible video element for WebGL texture */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute opacity-0 pointer-events-none w-[1px] h-[1px]"
      />

      {/* WebGL canvas */}
      <div className="absolute inset-0 w-full h-full z-0">
        <Canvas dpr={1}>
          <VideoShader
            videoRef={videoRef}
            gridSize={QUALITY_MAP[quality]}
            mode={modeIndex}
          />
        </Canvas>
      </div>

      {/* Top HUD */}
      <div className="absolute top-8 left-8 right-8 flex justify-between font-mono text-xs tracking-widest opacity-60 z-10">
        <span>REC // 60FPS</span>
        <span>GPU_ACTIVE</span>
      </div>

      {/* ═══ Bottom control stack ═══ */}
      <div className="absolute bottom-8 w-full flex flex-col items-center gap-3 z-10 pointer-events-none">

        {/* Layer 3 — Aesthetic personality mode */}
        <div className="pointer-events-auto flex gap-2">
          {MODES.map((m) => {
            const isActive = modeIndex === m.index;
            return (
              <button
                key={m.name}
                onClick={() => setModeIndex(m.index)}
                className="font-mono text-xs tracking-widest px-4 py-2 rounded-full border transition-all duration-200 cursor-pointer"
                style={{
                  borderColor: isActive ? m.color : 'rgba(255,255,255,0.4)',
                  backgroundColor: isActive ? m.color : 'transparent',
                  color: isActive ? '#000' : 'rgba(255,255,255,0.4)',
                }}
              >
                {m.name}
              </button>
            );
          })}
        </div>

        {/* Layer 2 — Quality preset */}
        <div className="pointer-events-auto flex gap-2">
          {(Object.keys(QUALITY_MAP) as Quality[]).map((q) => {
            const isActive = quality === q;
            return (
              <button
                key={q}
                onClick={() => setQuality(q)}
                className="font-mono text-xs tracking-widest px-4 py-2 rounded-full border transition-all duration-200 cursor-pointer"
                style={{
                  borderColor: isActive ? '#ffffff' : 'rgba(255,255,255,0.4)',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#000000' : 'rgba(255,255,255,0.4)',
                }}
              >
                {q}
              </button>
            );
          })}
        </div>

        {/* Layer 1 — Camera screenshot button */}
        <button className="pointer-events-auto flex items-center justify-center w-14 h-14 rounded-full border border-white/40 text-white/60 hover:bg-white/10 transition-all duration-200 cursor-pointer">
          <Camera size={22} />
        </button>
      </div>
    </main>
  );
}

export default App;
