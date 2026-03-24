import { FieldChildNode, FieldRoot, nodeId } from './types.js';

export function field(...children: FieldChildNode[]): FieldRoot {
  return {
    id: nodeId(),
    type: 'field',
    children,
  };
}
