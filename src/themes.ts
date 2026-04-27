export interface Theme {
  id: string;
  name: string;
  /** Primary neon color as hex */
  primary: string;
  /** Primary as RGB floats for GLSL uniform */
  primaryVec3: [number, number, number];
  /** Secondary accent for UI highlights */
  secondary: string;
  /** Background tint — slight color wash over black */
  bgTint: string;
  /** Background tint as RGB floats for GLSL */
  bgTintVec3: [number, number, number];
  /** Glow intensity multiplier sent to GPU */
  glowIntensity: number;
}

export const THEMES: Theme[] = [
  {
    id: 'MATRIX',
    name: 'MATRIX',
    primary: '#00FF41',
    primaryVec3: [0.0, 1.0, 0.255],
    secondary: '#00FF41',
    bgTint: '#021a06',
    bgTintVec3: [0.008, 0.102, 0.024],
    glowIntensity: 1.0,
  },
  {
    id: 'CYBERPUNK',
    name: 'CYBERPUNK',
    primary: '#FF2079',
    primaryVec3: [1.0, 0.125, 0.475],
    secondary: '#FFE600',
    bgTint: '#1a0510',
    bgTintVec3: [0.102, 0.02, 0.063],
    glowIntensity: 1.3,
  },
  {
    id: 'ARCTIC',
    name: 'ARCTIC',
    primary: '#00F5FF',
    primaryVec3: [0.0, 0.961, 1.0],
    secondary: '#00F5FF',
    bgTint: '#001215',
    bgTintVec3: [0.0, 0.071, 0.082],
    glowIntensity: 1.1,
  },
  {
    id: 'VOID',
    name: 'VOID',
    primary: '#FFFFFF',
    primaryVec3: [1.0, 1.0, 1.0],
    secondary: '#888888',
    bgTint: '#000000',
    bgTintVec3: [0.0, 0.0, 0.0],
    glowIntensity: 0.7,
  },
  {
    id: 'BLOOD',
    name: 'BLOOD',
    primary: '#FF3030',
    primaryVec3: [1.0, 0.188, 0.188],
    secondary: '#FF3030',
    bgTint: '#1a0505',
    bgTintVec3: [0.102, 0.02, 0.02],
    glowIntensity: 1.4,
  },
  {
    id: 'GOLD',
    name: 'GOLD',
    primary: '#FFD700',
    primaryVec3: [1.0, 0.843, 0.0],
    secondary: '#FFD700',
    bgTint: '#1a1200',
    bgTintVec3: [0.102, 0.071, 0.0],
    glowIntensity: 1.2,
  },
  {
    id: 'ULTRAVIOLET',
    name: 'ULTRAVIOLET',
    primary: '#BF00FF',
    primaryVec3: [0.749, 0.0, 1.0],
    secondary: '#BF00FF',
    bgTint: '#0d001a',
    bgTintVec3: [0.051, 0.0, 0.102],
    glowIntensity: 1.1,
  },
  {
    id: 'GHOST',
    name: 'GHOST',
    primary: '#AAFFEE',
    primaryVec3: [0.667, 1.0, 0.933],
    secondary: '#AAFFEE',
    bgTint: '#051510',
    bgTintVec3: [0.02, 0.082, 0.063],
    glowIntensity: 0.8,
  },
];

export const DEFAULT_THEME_ID = 'MATRIX';

export function getThemeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
