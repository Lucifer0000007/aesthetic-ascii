import { useMemo, useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface VideoShaderProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  gridSize: number;
  mode: number; // 0 = MATRIX, 1 = CYBERPUNK, 2 = ANIME
}

export function VideoShader({ videoRef, gridSize, mode }: VideoShaderProps) {
  const { size } = useThree();
  const [videoSize, setVideoSize] = useState({ w: 1, h: 1 });
  const [videoReady, setVideoReady] = useState(false);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  /* ═══ Grid size transition (300ms linear lerp) ═══ */
  const gridCurrent = useRef(gridSize);
  const gridStart = useRef(gridSize);
  const gridTarget = useRef(gridSize);
  const gridTransStart = useRef<number | null>(null);

  useEffect(() => {
    if (gridTarget.current !== gridSize) {
      gridStart.current = gridCurrent.current;
      gridTarget.current = gridSize;
      gridTransStart.current = performance.now();
    }
  }, [gridSize]);

  /* ═══ Mode crossfade (600ms blend via uBlend) ═══ */
  const prevModeRef = useRef(mode);
  const blendTransStart = useRef<number | null>(null);

  useEffect(() => {
    if (prevModeRef.current !== mode && materialRef.current) {
      materialRef.current.uniforms.uPrevMode.value = prevModeRef.current;
      materialRef.current.uniforms.uMode.value = mode;
      materialRef.current.uniforms.uBlend.value = 0.0;
      blendTransStart.current = performance.now();
      prevModeRef.current = mode;
    }
  }, [mode]);

  /* ═══ Video metadata ═══ */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onMeta = () => {
      setVideoSize({ w: video.videoWidth, h: video.videoHeight });
      setVideoReady(true);
    };
    if (video.readyState >= 1) onMeta();
    else video.addEventListener('loadedmetadata', onMeta);
    return () => video.removeEventListener('loadedmetadata', onMeta);
  }, [videoRef]);

  /* ═══ Video texture (with proper cleanup) ═══ */
  const texture = useMemo(() => {
    if (!videoRef.current || !videoReady) return null;
    const tex = new THREE.VideoTexture(videoRef.current);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, [videoRef, videoReady]);

  // Dispose GPU texture on unmount or when texture changes
  useEffect(() => {
    return () => {
      if (texture) texture.dispose();
    };
  }, [texture]);

  /* ═══ Uniforms (stable ref, mutated via materialRef) ═══ */
  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uMediaRes: { value: new THREE.Vector2(videoSize.w, videoSize.h) },
      uTime: { value: 0.0 },
      uMode: { value: mode },
      uPrevMode: { value: mode },
      uBlend: { value: 1.0 },
      uGridSize: { value: gridSize },
    }),
    // mode & gridSize intentionally excluded — updated via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [texture, size, videoSize],
  );

  /* ═══ Sync resolution on resize ═══ */
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uResolution.value.set(size.width, size.height);
    }
  }, [size]);

  /* ═══ Animation loop ═══ */
  useFrame((_, delta) => {
    const m = materialRef.current;
    if (!m) return;

    // Always tick time (capped to prevent spiral lag on dropped frames)
    m.uniforms.uTime.value += Math.min(delta, 0.05);

    // Grid size lerp (300ms)
    if (gridTransStart.current !== null) {
      const elapsed = performance.now() - gridTransStart.current;
      const t = Math.min(elapsed / 300, 1.0);
      gridCurrent.current =
        gridStart.current + (gridTarget.current - gridStart.current) * t;
      m.uniforms.uGridSize.value = gridCurrent.current;
      if (t >= 1.0) gridTransStart.current = null;
    }

    // Mode blend lerp (600ms)
    if (blendTransStart.current !== null) {
      const elapsed = performance.now() - blendTransStart.current;
      const t = Math.min(elapsed / 600, 1.0);
      m.uniforms.uBlend.value = t;
      if (t >= 1.0) {
        m.uniforms.uPrevMode.value = m.uniforms.uMode.value;
        blendTransStart.current = null;
      }
    }
  });

  if (!texture) return null;

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}

/* ═══════════════════════════════════════════
   GLSL — Vertex
   ═══════════════════════════════════════════ */
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

/* ═══════════════════════════════════════════
   GLSL — Fragment
   Three aesthetic modes with crossfade
   ═══════════════════════════════════════════ */
const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform vec2  uResolution;
  uniform vec2  uMediaRes;
  uniform float uTime;
  uniform float uMode;      // 0.0 MATRIX, 1.0 CYBERPUNK, 2.0 ANIME
  uniform float uPrevMode;  // previous mode for crossfade
  uniform float uBlend;     // 0→1 crossfade progress
  uniform float uGridSize;  // quality density

  varying vec2 vUv;

  /* ─── helpers ─── */
  float getLum(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
  }

  /* ═══════════════════════════════════
     MODE 0 — MATRIX
     Neon green rain · face silhouette
     Rain is multiplicative with face lum
     ═══════════════════════════════════ */
  vec4 renderMatrix(vec2 uv, float gs, float t) {
    /* grid snap & sample */
    vec2 grid = floor(uv * gs) / gs;
    vec4 tex  = texture2D(uTexture, grid);
    float lum = getLum(tex.rgb);
    vec2 c    = fract(uv * gs);

    /* ── brightness boost so face reads clearly ── */
    float matrixLum = pow(lum, 0.55);

    /* ── rain streak per column (multiplicative with face) ── */
    float col     = floor(uv.x * gs);
    float colHash = fract(sin(col * 127.1 + 43.0) * 43758.5);
    float speed   = 0.4 + colHash * 0.5;
    float offset  = fract(colHash * 7.3 + t * speed);
    float row     = fract(uv.y * gs / 8.0);
    float distFromHead = fract(row - offset);
    float streak  = distFromHead < 0.15 ? 1.0 : max(0.0, 1.0 - distFromHead * 5.0);
    float rainBrightness = clamp(streak * matrixLum * 1.6, 0.0, 1.0);

    /* ── character shapes keyed to rainBrightness ── */
    float sh = 0.0;
    if      (rainBrightness > 0.75) { sh = step(0.1,c.x)*step(c.x,0.9)*step(0.1,c.y)*step(c.y,0.9); }
    else if (rainBrightness > 0.45) { sh = max(step(0.4,c.x)*step(c.x,0.6)*step(0.1,c.y)*step(c.y,0.9),
                                               step(0.1,c.x)*step(c.x,0.9)*step(0.4,c.y)*step(c.y,0.6)); }
    else if (rainBrightness > 0.2)  { sh = step(0.2,c.x)*step(c.x,0.8)*step(0.45,c.y)*step(c.y,0.55); }
    else if (rainBrightness > 0.07) { sh = step(0.4,c.x)*step(c.x,0.6)*step(0.4,c.y)*step(c.y,0.6); }

    /* ── streak head gets near-white-green, tail gets standard green ── */
    vec3 neon = vec3(0.0, 1.0, 0.255);
    vec3 headColor = vec3(0.7, 1.0, 0.8);
    vec3 color = distFromHead < 0.05 ? headColor : neon;

    /* ── final: green glowing figure on pure black ── */
    return vec4(color * rainBrightness * sh, 1.0);
  }

  /* ═══════════════════════════════════
     MODE 1 — CYBERPUNK
     Chromatic aberration · CRT scanlines
     Glitch tears · tri-color neon · grain
     ═══════════════════════════════════ */
  vec4 renderCyberpunk(vec2 uv, float gs, float t) {
    /* ── frequent glitch tears — 20-cell rows, faster clock ── */
    float gRow = floor(uv.y * 20.0);
    float gn   = fract(sin(gRow + floor(t * 14.0)) * 9301.0);
    if (gn > 0.91) uv.x += gn * 0.055 - 0.0275;

    /* ── CRT scanline darkening — every other half-cell row ── */
    float scanline = 1.0 - 0.18 * step(0.5, fract(uv.y * gs * 2.0));

    /* grid snap */
    vec2 grid = floor(uv * gs) / gs;

    /* ── chromatic aberration — stronger 0.006 offset ── */
    float r = texture2D(uTexture, vec2(grid.x - 0.006, grid.y)).r;
    float g = texture2D(uTexture, grid).g;
    float b = texture2D(uTexture, vec2(grid.x + 0.006, grid.y)).b;
    float lum = getLum(vec3(r, g, b));

    /* ── digital noise grain — subtle ±2% luminance jitter ── */
    float grain = fract(sin(dot(grid + fract(t), vec2(12.9898, 78.233))) * 43758.5);
    lum = clamp(lum + (grain - 0.5) * 0.04, 0.0, 1.0);

    vec2 c = fract(uv * gs);

    /* ── tri-color neon split with smooth blends ── */
    vec3 pink   = vec3(1.0,  0.094, 0.424); // hot pink
    vec3 yellow = vec3(1.0,  0.93,  0.0);   // electric yellow
    vec3 cyan   = vec3(0.0,  0.97,  1.0);   // deep cyan
    float hi  = smoothstep(0.46, 0.70, lum);
    float mid = smoothstep(0.18, 0.42, lum);
    vec3 tc = mix(cyan, yellow, mid);
    tc = mix(tc, pink, hi);

    /* ── character shapes (thicker borders for impact) ── */
    float sh = 0.0;
    if      (lum > 0.60) { sh = step(0.08,c.x)*step(c.x,0.92)*step(0.08,c.y)*step(c.y,0.92); }
    else if (lum > 0.30) { sh = max(step(0.38,c.x)*step(c.x,0.62)*step(0.08,c.y)*step(c.y,0.92),
                                     step(0.08,c.x)*step(c.x,0.92)*step(0.38,c.y)*step(c.y,0.62)); }
    else if (lum > 0.10) { sh = step(0.18,c.x)*step(c.x,0.82)*step(0.44,c.y)*step(c.y,0.56); }
    else if (lum > 0.04) { sh = step(0.42,c.x)*step(c.x,0.58)*step(0.42,c.y)*step(c.y,0.58); }

    /* ── neon bloom 1.6× with scanline overlay ── */
    vec3 out_ = clamp(tc * lum * sh * 1.6, 0.0, 1.0) * scanline;
    return vec4(out_, 1.0);
  }

  /* ═══════════════════════════════════
     MODE 2 — ANIME
     Ultra-boosted cel · 6-band tonal
     Manga ink outlines · sparkle glints
     Warm sakura + violet shadow palette
     ═══════════════════════════════════ */
  vec4 renderAnime(vec2 uv, float gs) {
    /* grid snap & sample */
    vec2 grid = floor(uv * gs) / gs;
    vec4 tex  = texture2D(uTexture, grid);
    float lum = getLum(tex.rgb);

    /* ── ULTRA-aggressive gamma lift (0.42) — face is NEVER invisible ── */
    float boostedLum = pow(lum, 0.42);
    /* 6 flat tonal bands — richer manga tonal separation */
    float celLum = floor(boostedLum * 6.0) / 6.0;

    vec2 c = fract(uv * gs);

    /* ── per-cell hash for occasional sparkle glints ── */
    float cellHash = fract(sin(dot(grid, vec2(127.1, 311.7))) * 43758.5);

    /* ── ink outline — 4-neighbor lum delta (skip at ULTRA density) ── */
    bool doNeighborSample = gs < 140.0;
    float edge = 0.0;
    if (doNeighborSample) {
      float off = 1.0 / gs;
      float lL = getLum(texture2D(uTexture, grid + vec2(-off, 0.0)).rgb);
      float lR = getLum(texture2D(uTexture, grid + vec2( off, 0.0)).rgb);
      float lU = getLum(texture2D(uTexture, grid + vec2(0.0,  off)).rgb);
      float lD = getLum(texture2D(uTexture, grid + vec2(0.0, -off)).rgb);
      edge = max(max(abs(lum - lL), abs(lum - lR)),
                 max(abs(lum - lU), abs(lum - lD)));
    }

    /* ── Anime palette ── */
    vec3 bg         = vec3(0.07, 0.05, 0.13); // visible dark indigo (not pure black)
    vec3 shadowCol  = vec3(0.22, 0.16, 0.36); // muted violet — hair, deep shadow
    vec3 lavender   = vec3(0.65, 0.50, 0.82); // soft violet — shadow-mid screentone
    vec3 sakura     = vec3(0.97, 0.74, 0.81); // sakura pink — skin midtone
    vec3 blush      = vec3(1.0,  0.91, 0.94); // near-white blush — bright skin
    vec3 whiteCol   = vec3(1.0,  1.0,  1.0);  // specular highlight / ink edge

    vec3 col = bg;
    float sh = 0.0;

    if (edge > 0.26) {
      /* ── INK OUTLINE — crisp manga contour line ── */
      col = whiteCol;
      sh  = step(0.06, c.x) * step(c.x, 0.94) * step(0.06, c.y) * step(c.y, 0.94);

    } else if (celLum >= 5.0/6.0) {
      /* ── SPECULAR: pure white solid block ── */
      /* occasional sparkle cross glint on 15% of highlight cells */
      col = whiteCol;
      if (cellHash > 0.85) {
        sh = max(step(0.42,c.x)*step(c.x,0.58)*step(0.08,c.y)*step(c.y,0.92),
                 step(0.08,c.x)*step(c.x,0.92)*step(0.42,c.y)*step(c.y,0.58));
      } else {
        sh = step(0.12, c.x) * step(c.x, 0.88) * step(0.12, c.y) * step(c.y, 0.88);
      }

    } else if (celLum >= 4.0/6.0) {
      /* ── BRIGHT SKIN: blush pink — large diamond ── */
      col = blush;
      sh  = 1.0 - step(0.35, abs(c.x - 0.5) + abs(c.y - 0.5));

    } else if (celLum >= 3.0/6.0) {
      /* ── MIDTONE SKIN: sakura — medium diamond ── */
      col = sakura;
      sh  = 1.0 - step(0.26, abs(c.x - 0.5) + abs(c.y - 0.5));

    } else if (celLum >= 2.0/6.0) {
      /* ── SHADOW-MID: manga screentone cross in lavender ── */
      col = lavender;
      sh  = max(step(0.44,c.x)*step(c.x,0.56)*step(0.18,c.y)*step(c.y,0.82),
                step(0.18,c.x)*step(c.x,0.82)*step(0.44,c.y)*step(c.y,0.56));

    } else if (celLum >= 1.0/6.0) {
      /* ── DEEP SHADOW: small dot in muted violet — hair, eyes ── */
      col = shadowCol;
      sh  = step(0.36, c.x) * step(c.x, 0.64) * step(0.36, c.y) * step(c.y, 0.64);
    }
    /* celLum < 1/6 → truest ink shadow — only indigo bg shows */

    /* ── composite: always show bg so dark regions are visible ── */
    vec3 final = mix(bg, col, sh);
    return vec4(final, 1.0);
  }

  /* ─── mode dispatcher ─── */
  vec4 renderMode(float m, vec2 uv, float gs, float t) {
    vec4 result;
    if      (m < 0.5) result = renderMatrix(uv, gs, t);
    else if (m < 1.5) result = renderCyberpunk(uv, gs, t);
    else              result = renderAnime(uv, gs);
    return result;
  }

  void main() {
    /* ─── aspect ratio correction ─── */
    vec2 ratio = vec2(
      min((uResolution.x / uResolution.y) / (uMediaRes.x / uMediaRes.y), 1.0),
      min((uResolution.y / uResolution.x) / (uMediaRes.y / uMediaRes.x), 1.0)
    );
    vec2 uv = vec2(
      vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );

    /* ─── mirror X ─── */
    uv.x = 1.0 - uv.x;

    /* ─── render & crossfade ─── */
    if (uBlend >= 1.0) {
      gl_FragColor = renderMode(uMode, uv, uGridSize, uTime);
    } else {
      vec4 prev = renderMode(uPrevMode, uv, uGridSize, uTime);
      vec4 curr = renderMode(uMode, uv, uGridSize, uTime);
      gl_FragColor = mix(prev, curr, uBlend);
    }
  }
`;