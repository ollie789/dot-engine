import { evaluateSdf } from '@dot-engine/core';
import type {
  FieldRoot,
  ShapeNode,
  GridNode,
  ColorNode,
  SizeNode,
  OpacityNode,
} from '@dot-engine/core';

export interface ExportSVGOptions {
  width: number;
  height: number;
  camera?: {
    position?: [number, number, number];
    fov?: number;
  };
  background?: string;
  dotRadius?: number;
}

export interface SVGResult {
  svg: string;
  dotCount: number;
}

// ---------------------------------------------------------------------------
// Perspective projection (lookAt-style pinhole camera)
// The camera always looks toward the world origin.
// ---------------------------------------------------------------------------

type Vec3 = [number, number, number];

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len < 1e-10) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Build a view-space basis for a camera at `cameraPos` looking at the origin.
 * Returns { forward, right, up } as orthonormal axes.
 */
function buildCameraBasis(cameraPos: Vec3): {
  forward: Vec3;
  right: Vec3;
  up: Vec3;
} {
  // Forward: from camera toward origin
  const forward = normalize([
    -cameraPos[0],
    -cameraPos[1],
    -cameraPos[2],
  ]);

  // Choose a world-up reference; avoid degenerate case when looking straight up/down
  const worldUp: Vec3 =
    Math.abs(forward[1]) > 0.99 ? [0, 0, 1] : [0, 1, 0];

  const right = normalize(cross(forward, worldUp));
  const up = normalize(cross(right, forward));

  return { forward, right, up };
}

function project(
  point: [number, number, number],
  cameraPos: [number, number, number],
  fov: number,
  width: number,
  height: number,
): { x: number; y: number; depth: number; scale: number } | null {
  const { forward, right, up } = buildCameraBasis(cameraPos);

  // Vector from camera to point
  const toPoint: Vec3 = [
    point[0] - cameraPos[0],
    point[1] - cameraPos[1],
    point[2] - cameraPos[2],
  ];

  // Project onto camera axes
  const depth = dot(toPoint, forward); // how far in front of camera
  if (depth <= 0.1) return null; // behind or too close

  const camX = dot(toPoint, right);
  const camY = dot(toPoint, up);

  const fovScale = 1 / Math.tan(fov * 0.5 * (Math.PI / 180));
  const aspect = width / height;

  const ndcX = (camX / depth) * fovScale / aspect;
  const ndcY = (camY / depth) * fovScale;

  // Convert from [-1,1] NDC to pixel coords
  const px = (ndcX + 1) * 0.5 * width;
  const py = (1 - ndcY) * 0.5 * height; // flip Y

  const scale = fovScale / depth;

  return { x: px, y: py, depth, scale };
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function mixColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bb = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bb})`;
}

// ---------------------------------------------------------------------------
// Node extraction helpers
// ---------------------------------------------------------------------------

function findShape(root: FieldRoot): ShapeNode | undefined {
  return root.children.find((c): c is ShapeNode => c.type === 'shape');
}

function findGrid(root: FieldRoot): GridNode | undefined {
  return root.children.find((c): c is GridNode => c.type === 'grid');
}

function findColor(root: FieldRoot): ColorNode | undefined {
  return root.children.find((c): c is ColorNode => c.type === 'color');
}

function findSize(root: FieldRoot): SizeNode | undefined {
  return root.children.find((c): c is SizeNode => c.type === 'size');
}

function findOpacity(root: FieldRoot): OpacityNode | undefined {
  return root.children.find((c): c is OpacityNode => c.type === 'opacity');
}

// ---------------------------------------------------------------------------
// Grid position generation
// ---------------------------------------------------------------------------

function generateGridPositions(gridNode: GridNode): [number, number, number][] {
  const [rx, ry, rz] = gridNode.resolution;
  const bounds = gridNode.bounds ?? [1, 1, 1];
  const [bx, by, bz] = bounds;

  const positions: [number, number, number][] = [];

  for (let iz = 0; iz < rz; iz++) {
    for (let iy = 0; iy < ry; iy++) {
      for (let ix = 0; ix < rx; ix++) {
        // Map from [0, res-1] to [-bound, +bound]
        const x = rx > 1 ? ((ix / (rx - 1)) * 2 - 1) * bx : 0;
        const y = ry > 1 ? ((iy / (ry - 1)) * 2 - 1) * by : 0;
        const z = rz > 1 ? ((iz / (rz - 1)) * 2 - 1) * bz : 0;
        positions.push([x, y, z]);
      }
    }
  }

  return positions;
}

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------

export function exportSVG(fieldRoot: FieldRoot, options: ExportSVGOptions): SVGResult {
  const { width, height } = options;
  const background = options.background;
  const dotRadius = options.dotRadius ?? 3;

  // Camera defaults: position at [0, 0, 3], fov 60°
  const cameraPos: [number, number, number] =
    options.camera?.position ?? [0, 0, 3];
  const fov = options.camera?.fov ?? 60;

  // Extract nodes
  const shapeNode = findShape(fieldRoot);
  const gridNode = findGrid(fieldRoot);
  const colorNode = findColor(fieldRoot);
  const sizeNode = findSize(fieldRoot);
  const opacityNode = findOpacity(fieldRoot);

  if (!shapeNode || !gridNode) {
    // Nothing to render
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`;
    return { svg, dotCount: 0 };
  }

  // Color config
  const primaryHex = colorNode?.primary ?? '#ffffff';
  const accentHex = colorNode?.accent ?? '#ffffff';
  const primaryRgb = hexToRgb(primaryHex);
  const accentRgb = hexToRgb(accentHex);

  // Generate grid positions and evaluate SDF
  const positions = generateGridPositions(gridNode);

  interface DotInfo {
    x: number;
    y: number;
    depth: number;
    radius: number;
    color: string;
    opacity: number;
  }

  const dots: DotInfo[] = [];

  for (const pos of positions) {
    const sdfValue = evaluateSdf(shapeNode.sdf, pos);

    // Only emit dots inside the shape (SDF < 0)
    if (sdfValue >= 0) continue;

    // Project to 2D
    const projected = project(pos, cameraPos, fov, width, height);
    if (!projected) continue;

    // Skip dots outside the viewport
    if (
      projected.x < 0 ||
      projected.x > width ||
      projected.y < 0 ||
      projected.y > height
    ) {
      continue;
    }

    // Compute color: mix primary/accent based on normalized depth
    // Use the absolute SDF value (clamped) as mixing factor
    const t = Math.min(1, Math.max(0, Math.abs(sdfValue)));
    const fillColor = mixColor(primaryRgb, accentRgb, t);

    // Compute radius from size node or defaults
    let radius = dotRadius * projected.scale;
    if (sizeNode) {
      if (sizeNode.mode === 'uniform') {
        radius = sizeNode.min * projected.scale;
      } else {
        // depth mode: interpolate between min and max based on projected depth
        const depthT = Math.min(1, Math.max(0, (projected.depth - 0.5) / 5));
        radius = (sizeNode.min + (sizeNode.max - sizeNode.min) * (1 - depthT)) * projected.scale;
      }
    }
    radius = Math.max(0.5, radius);

    // Compute opacity
    let opacity = 1;
    if (opacityNode) {
      if (opacityNode.mode === 'uniform') {
        opacity = opacityNode.max;
      } else if (opacityNode.mode === 'edgeGlow') {
        // Brighter near the surface edge (sdfValue near 0)
        const edgeT = Math.min(1, Math.abs(sdfValue) * 5);
        opacity = opacityNode.min + (opacityNode.max - opacityNode.min) * (1 - edgeT);
      } else {
        // depth
        const depthT = Math.min(1, Math.max(0, (projected.depth - 0.5) / 5));
        opacity = opacityNode.min + (opacityNode.max - opacityNode.min) * (1 - depthT);
      }
    }

    dots.push({
      x: projected.x,
      y: projected.y,
      depth: projected.depth,
      radius,
      color: fillColor,
      opacity,
    });
  }

  // Sort back-to-front (painter's algorithm: largest depth first)
  dots.sort((a, b) => b.depth - a.depth);

  // Build SVG string
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
  );

  // Optional background rect
  if (background) {
    parts.push(`  <rect width="${width}" height="${height}" fill="${background}"/>`);
  }

  // Emit circles
  for (const dot of dots) {
    const cx = dot.x.toFixed(2);
    const cy = dot.y.toFixed(2);
    const r = dot.radius.toFixed(2);
    if (dot.opacity < 1) {
      parts.push(
        `  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${dot.color}" opacity="${dot.opacity.toFixed(3)}"/>`,
      );
    } else {
      parts.push(`  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${dot.color}"/>`);
    }
  }

  parts.push('</svg>');

  const svg = parts.join('\n');
  return { svg, dotCount: dots.length };
}
