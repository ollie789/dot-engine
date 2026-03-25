import { nodeId, FieldRoot, SdfNode, FieldChildNode } from './nodes/types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Any node or root that can be serialized: the full FieldRoot or any SdfNode /
 * FieldChildNode subtree.
 */
export type Serializable = FieldRoot | SdfNode | FieldChildNode;

export interface FromJSONOptions {
  /** Allow customSdf nodes (raw GLSL injection). Default: false */
  allowCustomSdf?: boolean;
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

export function toJSON(node: Serializable): string {
  return JSON.stringify(node, null, 2);
}

// ---------------------------------------------------------------------------
// Deserialization — reassign fresh IDs to avoid collisions
// ---------------------------------------------------------------------------

/**
 * Recursively walk a parsed object and replace every `id` key with a fresh
 * `nodeId()`. Recurse into:
 *  - any value that is an object with a `type` field (child nodes)
 *  - `children` arrays (FieldRoot children list)
 */
function reassignIds(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(reassignIds);
  }

  const record = obj as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(record)) {
    const value = record[key];

    if (key === 'id' && typeof value === 'string') {
      // Reassign with a fresh ID
      result[key] = nodeId();
    } else if (key === 'children' && Array.isArray(value)) {
      // Recurse into children array
      result[key] = value.map(reassignIds);
    } else if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      'type' in (value as object)
    ) {
      // Recurse into any object with a `type` field (child nodes)
      result[key] = reassignIds(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** All valid type values for SDF nodes. */
const SDF_TYPES = new Set([
  'sphere', 'box', 'torus', 'cylinder', 'capsule', 'cone', 'plane',
  'customSdf', 'fromField2D', 'textureSdf', 'metaball',
  'union', 'smoothUnion', 'subtract', 'smoothSubtract', 'intersect', 'smoothIntersect', 'onion',
  'translate', 'rotate', 'scale', 'twist', 'bend', 'repeat', 'mirror', 'elongate',
]);

/** All valid type values for field child nodes. */
const FIELD_CHILD_TYPES = new Set([
  'shape', 'grid', 'animate', 'displace', 'color', 'gradientColor', 'noiseColor',
  'size', 'opacity', 'particle', 'imageField',
]);

function validateNode(node: unknown, path: string, options: FromJSONOptions): void {
  if (node === null || typeof node !== 'object') {
    throw new Error(`fromJSON: expected object at ${path} but got ${node === null ? 'null' : typeof node}`);
  }

  const record = node as Record<string, unknown>;
  const type = record.type;

  if (typeof type !== 'string') {
    throw new Error(`fromJSON: missing or invalid "type" at ${path}`);
  }

  // FieldRoot
  if (type === 'field') {
    if (!Array.isArray(record.children)) {
      throw new Error(`fromJSON: expected "children" array at ${path}`);
    }
    for (let i = 0; i < record.children.length; i++) {
      validateFieldChild(record.children[i], `${path}.children[${i}]`, options);
    }
    return;
  }

  // SDF node
  if (SDF_TYPES.has(type)) {
    validateSdfNode(record, type, path, options);
    return;
  }

  // Field child node
  if (FIELD_CHILD_TYPES.has(type)) {
    validateFieldChild(record, path, options);
    return;
  }

  throw new Error(`fromJSON: unknown node type "${type}" at ${path}`);
}

function validateFieldChild(node: unknown, path: string, options: FromJSONOptions): void {
  if (node === null || typeof node !== 'object') {
    throw new Error(`fromJSON: expected object at ${path} but got ${node === null ? 'null' : typeof node}`);
  }
  const record = node as Record<string, unknown>;
  const type = record.type as string;

  if (!type || (!FIELD_CHILD_TYPES.has(type) && type !== 'field')) {
    throw new Error(`fromJSON: expected field child type at ${path} but got "${type}"`);
  }

  // Validate shape's nested SDF
  if (type === 'shape' && record.sdf != null) {
    validateSdfNode(record.sdf as Record<string, unknown>, (record.sdf as Record<string, unknown>).type as string, `${path}.sdf`, options);
  }
}

function validateSdfNode(record: Record<string, unknown>, type: string, path: string, options: FromJSONOptions): void {
  if (!SDF_TYPES.has(type)) {
    const valid = Array.from(SDF_TYPES).join(', ');
    throw new Error(`fromJSON: expected SDF type at ${path} but got "${type}" (valid: ${valid})`);
  }

  // Security: reject customSdf unless explicitly allowed
  if (type === 'customSdf' && !options.allowCustomSdf) {
    throw new Error(`fromJSON: customSdf nodes are rejected by default for security (raw GLSL injection). Pass { allowCustomSdf: true } to allow.`);
  }

  // Recurse into boolean children
  if ('a' in record && record.a != null) {
    const a = record.a as Record<string, unknown>;
    validateSdfNode(a, a.type as string, `${path}.a`, options);
  }
  if ('b' in record && record.b != null) {
    const b = record.b as Record<string, unknown>;
    validateSdfNode(b, b.type as string, `${path}.b`, options);
  }
  // Recurse into transform child
  if ('child' in record && record.child != null) {
    const child = record.child as Record<string, unknown>;
    validateSdfNode(child, child.type as string, `${path}.child`, options);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function fromJSON<T extends Serializable>(json: string, options?: FromJSONOptions): T {
  const parsed = JSON.parse(json) as unknown;
  const result = reassignIds(parsed);
  validateNode(result, 'root', options ?? {});
  return result as T;
}
