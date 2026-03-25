// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { DotFieldErrorBoundary } from '../src/components/DotFieldErrorBoundary.js';

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test render error');
  return <div data-testid="child">OK</div>;
}

describe('DotFieldErrorBoundary', () => {
  it('renders children when no error', () => {
    const { getByTestId } = render(
      <DotFieldErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </DotFieldErrorBoundary>,
    );
    expect(getByTestId('child')).toBeTruthy();
  });

  it('renders fallback div on error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <DotFieldErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </DotFieldErrorBoundary>,
    );
    expect(container.querySelector('[data-testid="child"]')).toBeNull();
    expect(container.firstElementChild?.style.background).toBe('transparent');
    spy.mockRestore();
  });

  it('calls onError callback with the error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();
    render(
      <DotFieldErrorBoundary onError={onError}>
        <ThrowingChild shouldThrow={true} />
      </DotFieldErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe('Test render error');
    spy.mockRestore();
  });

  it('resets error state when resetKey changes', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container, rerender } = render(
      <DotFieldErrorBoundary resetKey="a">
        <ThrowingChild shouldThrow={true} />
      </DotFieldErrorBoundary>,
    );
    // Should be in fallback state
    expect(container.querySelector('[data-testid="child"]')).toBeNull();

    // Rerender with new key and non-throwing child
    rerender(
      <DotFieldErrorBoundary resetKey="b">
        <ThrowingChild shouldThrow={false} />
      </DotFieldErrorBoundary>,
    );
    expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
    spy.mockRestore();
  });
});
