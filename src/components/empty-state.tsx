import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
  variant?: 'default' | 'compact';
}

export function EmptyState({ 
  title, 
  description, 
  action, 
  icon: Icon,
  variant = 'default' 
}: EmptyStateProps) {
  const containerClasses = variant === 'default' 
    ? 'h-[60vh]'
    : 'h-[30vh]';

  return (
    <div className={`flex flex-col items-center justify-center ${containerClasses} text-center px-4`}>
      {Icon && (
        <div className="mb-4 text-gray-400 dark:text-gray-600">
          <Icon className="w-12 h-12" />
        </div>
      )}
      <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">{description}</p>
      {action}
    </div>
  );
} 