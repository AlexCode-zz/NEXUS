/**
 * POINTER GLSL — Fragmento GLSL compartido para que el cursor interactúe
 * con el universo en tiempo real (todo en GPU, sin recalcular buffers).
 *
 * Incluye:
 *  - Declaración de uniforms del puntero.
 *  - applyPointer(): devuelve la posición perturbada según el modo activo.
 *
 * Modos (uPointerMode):
 *   0 = ATTRACTION  (las partículas se acercan al cursor)
 *   1 = REPULSION   (las partículas huyen del cursor)
 *   2 = TURBULENCE  (ruido procedural alrededor del cursor)
 *   3 = GRAVITY     (atracción hacia el núcleo del universo)
 *   4 = ORBIT       (rotación orbital alrededor del cursor)
 */
export const POINTER_UNIFORMS = /* glsl */ `
  uniform vec3 uPointer;
  uniform float uPointerActive;
  uniform float uPointerRadius;
  uniform float uPointerStrength;
  uniform float uPointerMode;
`;

export const POINTER_FUNCTION = /* glsl */ `
  vec3 applyPointer(vec3 pos, float time, float extra) {
    if (uPointerActive < 0.5) return pos;

    vec3 delta = pos - uPointer;
    float d = length(delta);
    if (d > uPointerRadius) return pos;

    // Influencia 1 en el centro del puntero, 0 en el borde
    float infl = 1.0 - d / uPointerRadius;
    infl = infl * infl;
    float s = uPointerStrength * infl * extra;
    if (s < 0.0001) return pos;

    vec3 dir = delta / max(d, 0.0001);

    if (uPointerMode < 0.5) {
      pos -= dir * s;                                    // ATTRACTION
    } else if (uPointerMode < 1.5) {
      pos += dir * s;                                    // REPULSION
    } else if (uPointerMode < 2.5) {
      float n = sin(pos.x * 1.7 + time * 3.1) * cos(pos.z * 1.3 - time * 2.3) * sin(pos.y * 1.9 + time * 1.7);
      vec3 noise = vec3(n, sin(time * 2.0 + pos.y * 2.4), cos(time * 1.6 + pos.z * 2.2));
      pos += noise * s * 1.7;                            // TURBULENCE
    } else if (uPointerMode < 3.5) {
      pos -= (pos / max(length(pos), 0.0001)) * s * 1.5; // GRAVITY (núcleo)
    } else {
      vec3 rel = pos - uPointer;                         // ORBIT
      float a = s * 0.85;
      float ca = cos(a);
      float sa = sin(a);
      pos = uPointer + vec3(rel.x * ca - rel.z * sa, rel.y, rel.x * sa + rel.z * ca);
    }

    return pos;
  }
`;

export default { POINTER_UNIFORMS, POINTER_FUNCTION };
