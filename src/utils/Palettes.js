/**
 * PALETTES — Paletas de color del universo.
 *
 * Todas las paletas son puramente locales/procedurales: se definen como
 * valores numéricos hex que se inyectan en los uniforms de los shaders.
 * No se cargan imágenes ni recursos externos.
 */
export const PALETTES = [
  {
    name: 'Nebulosa',
    core: 0xffffff,
    inner: 0x00e5ff,
    mid: 0x8b5cf6,
    outer: 0xe044ff,
    nebula: [0x00e5ff, 0x8b5cf6, 0xe044ff],
    dust: 0x5b7cff,
    rock: 0x9aa7c7,
    orbit: 0x4cc9ff,
    accent: 0x00e5ff
  },
  {
    name: 'Aurora',
    core: 0xf0fff8,
    inner: 0x38f9a7,
    mid: 0x22d3ee,
    outer: 0x0ea5e9,
    nebula: [0x38f9a7, 0x0ea5e9, 0x6366f1],
    dust: 0x4ee6b8,
    rock: 0x8fb3a8,
    orbit: 0x38f9a7,
    accent: 0x38f9a7
  },
  {
    name: 'Ígnea',
    core: 0xfff6e5,
    inner: 0xffb347,
    mid: 0xff6a2b,
    outer: 0xe044ff,
    nebula: [0xff7a18, 0xff3d68, 0xe044ff],
    dust: 0xffa45c,
    rock: 0xa8765c,
    orbit: 0xff9f5a,
    accent: 0xff7a18
  },
  {
    name: 'Hielo',
    core: 0xffffff,
    inner: 0x7dd3fc,
    mid: 0x60a5fa,
    outer: 0xe0f2fe,
    nebula: [0x7dd3fc, 0x818cf8, 0xe0f2fe],
    dust: 0x9ec5fe,
    rock: 0xaebfd6,
    orbit: 0x7dd3fc,
    accent: 0x7dd3fc
  },
  {
    name: 'Amatista',
    core: 0xfdf4ff,
    inner: 0xc084fc,
    mid: 0xa855f7,
    outer: 0xf472b6,
    nebula: [0xc084fc, 0xf472b6, 0x7c3aed],
    dust: 0xd8b4fe,
    rock: 0x9f8fc0,
    orbit: 0xc084fc,
    accent: 0xc084fc
  },
  {
    name: 'Oro',
    core: 0xfffbeb,
    inner: 0xfcd34d,
    mid: 0xf59e0b,
    outer: 0xfb923c,
    nebula: [0xfcd34d, 0xfb923c, 0xb45309],
    dust: 0xfde68a,
    rock: 0xb39a72,
    orbit: 0xfcd34d,
    accent: 0xfcd34d
  }
];

/**
 * Devuelve el color mezclado del degradado core → inner → mid → outer
 * según la posición radial normalizada t (0 = núcleo, 1 = borde).
 * Devuelve un array [r, g, b] en rango 0..1, sin necesidad de Three.js.
 */
export function paletteGradient(palette, t) {
  const hexToRgb = (hex) => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
  const stops = [palette.core, palette.inner, palette.mid, palette.outer].map(hexToRgb);
  const clamped = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(clamped));
  const f = clamped - i;
  return [
    stops[i][0] + (stops[i + 1][0] - stops[i][0]) * f,
    stops[i][1] + (stops[i + 1][1] - stops[i][1]) * f,
    stops[i][2] + (stops[i + 1][2] - stops[i][2]) * f
  ];
}

export default PALETTES;
