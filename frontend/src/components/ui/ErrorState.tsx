import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load data',
  message = 'An unexpected error occurred while communicating with the server. Please check your connection and retry.',
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50/50 p-8 text-center',
        className
      )}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-rose-900">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-rose-700">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="mt-4 border-rose-300 text-rose-700 hover:bg-rose-100">
          Try Again
        </Button>
      )}
    </div>
  );
};

