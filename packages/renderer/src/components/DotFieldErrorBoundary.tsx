import React from 'react';

export interface DotFieldErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error) => void;
  /** Used to reset error state when the field changes */
  resetKey?: unknown;
}

interface State {
  hasError: boolean;
  prevResetKey?: unknown;
}

export class DotFieldErrorBoundary extends React.Component<DotFieldErrorBoundaryProps, State> {
  state: State = { hasError: false };

  static getDerivedStateFromProps(props: DotFieldErrorBoundaryProps, state: State): Partial<State> | null {
    if (props.resetKey !== state.prevResetKey) {
      return { hasError: false, prevResetKey: props.resetKey };
    }
    return null;
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return <div style={{ width: '100%', height: '100%', background: 'transparent' }} />;
    }
    return this.props.children;
  }
}
