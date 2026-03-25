export const BASE_VERTEX = `
varying float vFieldValue;
varying float vDistance;
varying vec3 vPosition;
varying vec2 vImgUv;

uniform float uTime;
uniform vec3 uResolution;
uniform vec3 uBounds;
uniform vec2 uPointer;
uniform float uPointerStrength;
{{EXTRA_UNIFORMS}}

{{NOISE_FUNCTIONS}}

{{SDF_FUNCTIONS}}

vec3 indexToGrid(int idx, vec3 res, vec3 bounds) {
  int sliceSize = int(res.x) * int(res.y);
  int iz = idx / sliceSize;
  int rem = idx - iz * sliceSize;
  int iy = rem / int(res.x);
  int ix = rem - iy * int(res.x);
  vec3 n = vec3(float(ix), float(iy), float(iz)) / max(res - 1.0, 1.0);
  return (n - 0.5) * bounds;
}

void main() {
  vec3 gridPos = indexToGrid(gl_InstanceID, uResolution, uBounds);
  // Coarse SDF check before displacement (skip expensive noise for distant dots)
  float dCoarse = {{SDF_ROOT}}(gridPos);
  if (dCoarse > 0.5) {
    gl_Position = vec4(0.0, 0.0, -999.0, 1.0);
    vFieldValue = 0.0;
    vDistance = dCoarse;
    return;
  }
  vec3 displaced = gridPos;
{{DISPLACEMENT}}
  // Pointer influence (optional)
  if (uPointerStrength > 0.0) {
    vec3 pointerWorld = vec3(uPointer.x, uPointer.y, 0.0) * uBounds * 0.5;
    vec3 toPointer = displaced - pointerWorld;
    float dist = length(toPointer);
    if (dist > 0.01) {
      displaced += normalize(toPointer) * uPointerStrength * 0.1 / max(dist * dist, 0.1);
    }
  }
  // Image field (optional)
  float imgScale = 1.0;
  vImgUv = vec2(0.0);
{{IMAGE_FIELD}}
  float d = {{SDF_ROOT}}(displaced);
  float edgeSoftness = {{EDGE_SOFTNESS}};
  float field = 1.0 - smoothstep(-edgeSoftness, edgeSoftness, d);
  float dotScale = {{SIZE_EXPR}} * imgScale;
  vec3 scaledPos = position * field * dotScale;
  vec3 worldPos = displaced + scaledPos;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
  vFieldValue = field;
  vDistance = d;
  vPosition = (displaced / uBounds) + 0.5;
}
`;
