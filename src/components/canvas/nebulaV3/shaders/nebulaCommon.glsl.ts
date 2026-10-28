/** GLSL helpers shared by the Nebulosas v3 field and collision shaders. */
export const NEBULA_COMMON_GLSL = /* glsl */ `
bool sameId(float a, float b) { return abs(a - b) < 0.5; }

// Rodrigues rotation of v around unit axis k
vec3 rotateAround(vec3 v, vec3 k, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
}
`;
