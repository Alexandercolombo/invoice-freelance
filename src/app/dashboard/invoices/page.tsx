import { Suspense } from "react";
import { InvoicesContent } from "./invoices-content";
import { LoadingState } from "@/components/loading-state";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, Component, ReactNode } from "react";

interface PageProps {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class InvoicesErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Invoice page error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
            We encountered an error while loading your invoices:
          </p>
          <p className="text-red-600 dark:text-red-400 text-center mb-8 font-mono text-sm">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

"use client";
function InvoicesPage({ searchParams }: PageProps) {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/sign-in");
    }
  }, [isLoaded, userId, router]);

  if (!isLoaded) {
    return <LoadingState fullScreen={true} />;
  }

  if (!userId) {
    return null;
  }

  return (
    <InvoicesErrorBoundary>
      <InvoicesContent searchParams={searchParams} />
    </InvoicesErrorBoundary>
  );
}

export default function Page({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<LoadingState fullScreen={true} />}>
      <InvoicesPage searchParams={searchParams} />
    </Suspense>
  );
} 