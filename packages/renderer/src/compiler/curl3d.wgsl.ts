// Divergence-free 3D curl noise using finite differences of snoise.
// Requires snoise (fn snoise(v: vec3f) -> f32) to be defined before this in the shader.

export const CURL3D_WGSL = `
fn curlNoise(p: vec3f, time: f32) -> vec3f {
  let eps = 0.0001;
  let offset = vec3f(31.4, 17.3, 23.9);

  // Sample two independent noise fields
  let p1 = p + time * 0.1;
  let p2 = p + offset + time * 0.1;

  // Finite differences to approximate gradient of each field
  let dx1 = snoise(p1 + vec3f(eps, 0.0, 0.0)) - snoise(p1 - vec3f(eps, 0.0, 0.0));
  let dy1 = snoise(p1 + vec3f(0.0, eps, 0.0)) - snoise(p1 - vec3f(0.0, eps, 0.0));
  let dz1 = snoise(p1 + vec3f(0.0, 0.0, eps)) - snoise(p1 - vec3f(0.0, 0.0, eps));

  let dx2 = snoise(p2 + vec3f(eps, 0.0, 0.0)) - snoise(p2 - vec3f(eps, 0.0, 0.0));
  let dy2 = snoise(p2 + vec3f(0.0, eps, 0.0)) - snoise(p2 - vec3f(0.0, eps, 0.0));
  let dz2 = snoise(p2 + vec3f(0.0, 0.0, eps)) - snoise(p2 - vec3f(0.0, 0.0, eps));

  let grad1 = vec3f(dx1, dy1, dz1) / (2.0 * eps);
  let grad2 = vec3f(dx2, dy2, dz2) / (2.0 * eps);

  // Curl = cross product of the two gradients (divergence-free by construction)
  return cross(grad1, grad2);
}
`;
