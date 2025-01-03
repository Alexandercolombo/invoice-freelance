import { useState } from 'react';
import { useMutation } from 'convex/react';
import { FunctionReference } from 'convex/server';

interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

const defaultConfig: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000,    // 10 seconds
  backoffFactor: 2,   // Exponential backoff multiplier
};

export function useRetryMutation<T extends FunctionReference<"mutation">>(
  mutation: T,
  config: RetryConfig = {}
) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const mutate = useMutation(mutation);

  const { maxRetries, initialDelay, maxDelay, backoffFactor } = {
    ...defaultConfig,
    ...config,
  };

  const calculateDelay = (attemptNumber: number) => {
    const delay = initialDelay * Math.pow(backoffFactor, attemptNumber);
    return Math.min(delay, maxDelay);
  };

  const execute = async (...args: Parameters<typeof mutate>) => {
    setAttempt(0);
    setIsRetrying(false);

    const tryMutation = async (currentAttempt: number): Promise<Awaited<ReturnType<typeof mutate>>> => {
      try {
        const result = await mutate(...args);
        setIsRetrying(false);
        return result;
      } catch (error) {
        // Check if we should retry
        if (currentAttempt < maxRetries) {
          setIsRetrying(true);
          setAttempt(currentAttempt + 1);

          // Calculate delay for this attempt
          const delay = calculateDelay(currentAttempt);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Retry the mutation
          return tryMutation(currentAttempt + 1);
        }

        // If we've exhausted all retries, throw the error
        setIsRetrying(false);
        throw error;
      }
    };

    return tryMutation(0);
  };

  return {
    execute,
    isRetrying,
    attempt,
    mutate, // Original mutation function if needed
  };
} 