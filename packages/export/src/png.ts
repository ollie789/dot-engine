import * as THREE from 'three';
import type { FieldRoot } from '@bigpuddle/dot-engine-core';
import { compileField } from '@bigpuddle/dot-engine-renderer';

export interface ExportPNGOptions {
  width: number;
  height: number;
  background?: string;
  colorPrimary?: string;
  colorAccent?: string;
}

export async function exportPNG(
  fieldRoot: FieldRoot,
  options: ExportPNGOptions,
): Promise<Blob> {
  const { width, height, background = '#000000' } = options;

  // Create offscreen renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(width, height);
  renderer.setClearColor(new THREE.Color(background), 1);

  // Create scene
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  camera.position.set(0, 0, 3);
  camera.lookAt(0, 0, 0);

  // Compile and create instanced mesh
  const compiled = compileField(fieldRoot);
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  const material = new THREE.ShaderMaterial({
    vertexShader: compiled.vertexShader,
    fragmentShader: compiled.fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector3(...compiled.resolution) },
      uBounds: { value: new THREE.Vector3(...compiled.bounds) },
      uColorPrimary: { value: new THREE.Color(options.colorPrimary ?? '#4a9eff') },
      uColorAccent: { value: new THREE.Color(options.colorAccent ?? '#ff6b4a') },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uPointerStrength: { value: 0 },
    },
    transparent: true,
    depthWrite: true,
    depthTest: true,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, compiled.totalDots);
  mesh.frustumCulled = false;
  scene.add(mesh);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  // Render one frame
  renderer.render(scene, camera);

  // Extract pixels
  const canvas = renderer.domElement;
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
  });

  // Cleanup
  scene.remove(mesh);
  renderer.dispose();
  geometry.dispose();
  material.dispose();

  return blob;
}
