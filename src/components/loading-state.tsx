import { Loader2 } from "lucide-react";

export interface LoadingStateProps {
  fullScreen?: boolean;
  message?: string;
}

export function LoadingState({ fullScreen, message = "Loading..." }: LoadingStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
} 