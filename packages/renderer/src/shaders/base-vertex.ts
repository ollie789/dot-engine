export const BASE_VERTEX = `
varying float vFieldValue;
varying float vDistance;

uniform float uTime;
uniform vec3 uResolution;
uniform vec3 uBounds;

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
  float d = {{SDF_ROOT}}(gridPos);
  float edgeSoftness = 0.05;
  float field = 1.0 - smoothstep(-edgeSoftness, edgeSoftness, d);
  vec3 scaledPos = position * field * 0.02;
  vec3 worldPos = gridPos + scaledPos;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
  vFieldValue = field;
  vDistance = d;
}
`;
