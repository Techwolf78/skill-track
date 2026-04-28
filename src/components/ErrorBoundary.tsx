import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  RefreshCw,
  Home,
  Bug,
  ChevronDown,
  ChevronRight,
  Terminal,
} from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false, // Collapsed by default
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    window.location.href = "/";
  };

  private handleReload = () => {
    window.location.reload();
  };

  private toggleDetails = () => {
    this.setState({ showDetails: !this.state.showDetails });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            {/* Error Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="p-6">
                {/* Icon & Title */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <h1 className="text-xl font-semibold text-gray-900 mb-2">
                    Something went wrong
                  </h1>
                  <p className="text-gray-500 text-sm">
                    {this.state.error?.message ||
                      "An unexpected error occurred"}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mb-4">
                  <Button onClick={this.handleReload} className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  <Button
                    onClick={this.handleReset}
                    variant="outline"
                    className="flex-1"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Home
                  </Button>
                </div>

                {/* Developer Section - Collapsed by default */}
                <div className="border-t border-gray-100 pt-4">
                  <button
                    onClick={this.toggleDetails}
                    className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      <Terminal className="w-3 h-3" />
                      <span>Developer Tools</span>
                    </span>
                    {this.state.showDetails ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>

                  {/* Hidden Developer Details - Only visible when toggled */}
                  {this.state.showDetails && (
                    <div className="mt-3 space-y-3">
                      {/* Error Stack */}
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Bug className="w-3 h-3 text-gray-400" />
                          <span className="text-xs font-medium text-gray-500">
                            Error Stack:
                          </span>
                        </div>
                        <pre className="text-xs text-gray-600 bg-gray-50 rounded-md p-3 overflow-auto max-h-48 font-mono">
                          {this.state.error?.stack ||
                            "No stack trace available"}
                        </pre>
                      </div>

                      {/* Component Stack */}
                      {this.state.errorInfo && (
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Terminal className="w-3 h-3 text-gray-400" />
                            <span className="text-xs font-medium text-gray-500">
                              Component Stack:
                            </span>
                          </div>
                          <pre className="text-xs text-gray-600 bg-gray-50 rounded-md p-3 overflow-auto max-h-32 font-mono">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
