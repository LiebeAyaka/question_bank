import React from 'react';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>💥</div>
          <h1 className={styles.errorTitle}>页面出现错误</h1>
          <p className={styles.errorMessage}>{this.state.error?.message || '未知错误'}</p>
          <div className={styles.buttonGroup}>
            <button className={styles.resetButton} onClick={this.resetError}>
              恢复页面
            </button>
            <button className={styles.reloadButton} onClick={() => window.location.reload()}>
              重新加载
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}