import { nodeId, FieldRoot, SdfNode, FieldChildNode } from './nodes/types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Any node or root that can be serialized: the full FieldRoot or any SdfNode /
 * FieldChildNode subtree.
 */
export type Serializable = FieldRoot | SdfNode | FieldChildNode;

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

export function fromJSON<T>(json: string): T {
  const parsed = JSON.parse(json) as unknown;
  return reassignIds(parsed) as T;
}
