import { Component, ErrorInfo, ReactNode } from 'react';
import { resolveHttpErrorUserMessage } from '@/types/http-error';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
          <h1 className="mb-4 text-3xl font-semibold">Something went wrong</h1>
          <p className="mb-8 text-muted-foreground">
            {this.state.error
              ? resolveHttpErrorUserMessage(this.state.error, 'An unexpected error occurred')
              : 'An unexpected error occurred'}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.reload();
            }}
            className="cursor-pointer rounded-md bg-primary px-6 py-3 text-base text-primary-foreground hover:bg-primary/90"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

