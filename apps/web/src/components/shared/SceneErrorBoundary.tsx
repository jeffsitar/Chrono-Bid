'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * WebGL/Three.js can throw at runtime for reasons unrelated to app logic
 * (lost GPU context, unsupported device, driver quirks) — a React error
 * boundary here means a 3D failure degrades to a text fallback instead of
 * white-screening the whole game. Class component because error boundaries
 * are not expressible with hooks in React 18.
 */
export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('[chrono-bid] 3D scene crashed, falling back to text mode', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex h-full w-full items-center justify-center bg-[#05070d] text-center text-sm text-white/60"
          role="alert"
        >
          3D table view unavailable on this device. The game itself is unaffected — you can still play using the controls below.
        </div>
      );
    }
    return this.props.children;
  }
}
