export const BASE_FRAGMENT = `
varying float vFieldValue;
varying float vDistance;
varying vec3 vPosition;
varying vec2 vImgUv;

uniform vec3 uColorPrimary;
uniform vec3 uColorAccent;
uniform float uTime;

{{FRAGMENT_FUNCTIONS}}

void main() {
  if (vFieldValue < 0.01) discard;

  {{COLOR_LOGIC}}

  float alpha = {{OPACITY_EXPR}};
  gl_FragColor = vec4(color, alpha);
}
`;
