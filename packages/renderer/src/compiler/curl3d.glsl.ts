// Divergence-free 3D curl noise using finite differences of snoise.
// Requires snoise (float snoise(vec3 v)) to be defined before this in the shader.

export const CURL3D_GLSL = `
vec3 curlNoise(vec3 p, float time) {
  const float eps = 0.0001;
  const vec3 offset = vec3(31.4, 17.3, 23.9);

  // Sample two independent noise fields
  vec3 p1 = p + time * 0.1;
  vec3 p2 = p + offset + time * 0.1;

  // Finite differences to approximate gradient of each field
  float dx1 = snoise(p1 + vec3(eps, 0.0, 0.0)) - snoise(p1 - vec3(eps, 0.0, 0.0));
  float dy1 = snoise(p1 + vec3(0.0, eps, 0.0)) - snoise(p1 - vec3(0.0, eps, 0.0));
  float dz1 = snoise(p1 + vec3(0.0, 0.0, eps)) - snoise(p1 - vec3(0.0, 0.0, eps));

  float dx2 = snoise(p2 + vec3(eps, 0.0, 0.0)) - snoise(p2 - vec3(eps, 0.0, 0.0));
  float dy2 = snoise(p2 + vec3(0.0, eps, 0.0)) - snoise(p2 - vec3(0.0, eps, 0.0));
  float dz2 = snoise(p2 + vec3(0.0, 0.0, eps)) - snoise(p2 - vec3(0.0, 0.0, eps));

  vec3 grad1 = vec3(dx1, dy1, dz1) / (2.0 * eps);
  vec3 grad2 = vec3(dx2, dy2, dz2) / (2.0 * eps);

  // Curl = cross product of the two gradients (divergence-free by construction)
  return cross(grad1, grad2);
}
`;
