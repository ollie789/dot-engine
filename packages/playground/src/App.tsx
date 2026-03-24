import { useState } from 'react';
import { presets } from '@dot-engine/core';
import { DotFieldCanvas } from '@dot-engine/renderer';

const presetNames = Object.keys(presets) as (keyof typeof presets)[];

export function App() {
  const [active, setActive] = useState<keyof typeof presets>('organic');

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '12px 16px',
        display: 'flex',
        gap: '8px',
        background: '#111',
        borderBottom: '1px solid #222',
      }}>
        <span style={{ color: '#666', fontSize: '13px', alignSelf: 'center', marginRight: '8px' }}>
          Preset:
        </span>
        {presetNames.map(name => (
          <button
            key={name}
            onClick={() => setActive(name)}
            style={{
              padding: '6px 16px',
              border: name === active ? '1px solid #4a9eff' : '1px solid #333',
              background: name === active ? '#1a3a5c' : '#222',
              color: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              textTransform: 'capitalize',
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <div style={{ flex: 1 }}>
        <DotFieldCanvas field={presets[active]} lod="auto" />
      </div>
    </div>
  );
}
