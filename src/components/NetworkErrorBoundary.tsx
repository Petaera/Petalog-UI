import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isNetworkError: boolean;
}

class NetworkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isNetworkError: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a network-related error
    const isNetworkError = 
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('suspended') ||
      error.message.includes('fetch') ||
      error.message.includes('ERR_NETWORK') ||
      error.message.includes('ERR_NETWORK_IO_SUSPENDED');

    return {
      hasError: true,
      error,
      isNetworkError,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Error logging removed for production
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      isNetworkError: false,
    });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.state.isNetworkError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <WifiOff className="w-8 h-8 text-red-600" />
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Network Connection Error
              </h2>
              
              <p className="text-gray-600 mb-6">
                We're having trouble connecting to our servers. This might be a temporary network issue.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                
                <button
                  onClick={this.handleRefresh}
                  className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
              
              <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">
                  Error: {this.state.error?.message || 'Unknown network error'}
                </p>
              </div>
            </div>
          </div>
        );
      }

      // For non-network errors, show the custom fallback or default error UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wifi className="w-8 h-8 text-red-600" />
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            
            <p className="text-gray-600 mb-6">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            
            <button
              onClick={this.handleRefresh}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default NetworkErrorBoundary;
