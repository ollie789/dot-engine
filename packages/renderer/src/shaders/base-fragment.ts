export const BASE_FRAGMENT = `
varying float vFieldValue;
varying float vDistance;

uniform vec3 uColorPrimary;
uniform vec3 uColorAccent;

void main() {
  if (vFieldValue < 0.01) discard;
  vec3 color = mix(uColorPrimary, uColorAccent, vFieldValue);
  float alpha = vFieldValue * 0.9;
  gl_FragColor = vec4(color, alpha);
}
`;
