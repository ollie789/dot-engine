export const SMIN_GLSL = `
float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - (h * h * h * k) / 6.0;
}
`;
