import React from 'react';
import { ErrorState } from '@shiftos/ui';

/**
 * Catches a render error inside the routed page. Without this, React 18
 * unmounts the whole tree when a page throws and the app simply goes blank —
 * with nothing on screen to say what happened, which is exactly when a user
 * most needs to be told. The message is shown so it can be reported; the
 * stack goes to the console.
 */
interface State {
  error: Error | null;
}

export class RouteErrorBoundary extends React.Component<{ children: React.ReactNode; onReset?: () => void }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console -- the stack is the only way to place the failure
    console.error('ShiftOS: this page failed to render', error, info.componentStack);
  }

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="px-7 py-8 max-[859px]:px-3.5">
        <ErrorState
          title="This page didn't load"
          description={`${error.message || 'Something went wrong rendering this page.'} — the details are in your browser console.`}
          onRetry={() => {
            this.setState({ error: null });
            this.props.onReset?.();
          }}
        />
      </div>
    );
  }
}
