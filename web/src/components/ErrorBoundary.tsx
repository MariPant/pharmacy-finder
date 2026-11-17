import { Component, type ErrorInfo, type ReactNode } from 'react';
import { FatalErrorView } from './FatalErrorView';

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Last line of defence against render errors (e.g. a map library failure). */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack);
  }

  render() {
    return this.state.hasError ? <FatalErrorView /> : this.props.children;
  }
}
