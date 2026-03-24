import { FieldChildNode, FieldRoot } from './types.js';

export function field(...children: FieldChildNode[]): FieldRoot {
  return {
    type: 'field',
    children,
  };
}
