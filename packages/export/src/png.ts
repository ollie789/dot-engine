export interface ExportPNGOptions {
  width: number;
  height: number;
  background?: string;
  dotCount?: number;
}

export async function exportPNG(
  _fieldRoot: any,
  _options: ExportPNGOptions,
): Promise<Blob> {
  throw new Error(
    '@dot-engine/export: exportPNG requires a browser environment with WebGL. ' +
    'This function is not yet implemented — coming in a future release.'
  );
}
