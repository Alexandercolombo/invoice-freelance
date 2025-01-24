import { Loader2 } from "lucide-react";

export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export function LoadingState({ message = "Loading...", size = 'md', fullScreen = false }: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const containerClasses = fullScreen 
    ? "fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    : "flex items-center justify-center h-[60vh]";

  return (
    <div className={containerClasses}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="flex flex-col items-center justify-center gap-4">
          <Loader2 className={`${sizeClasses[size]} animate-spin`} />
          {message && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
} 