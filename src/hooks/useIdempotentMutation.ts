import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { generateIdempotencyKey } from "../lib/idempotency";

export interface UseIdempotentMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables, idempotencyKey: string) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  operationName?: string;
  successMessage?: string;
  errorMessage?: string;
}

export interface UseIdempotentMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData | undefined>;
  isLoading: boolean;
  isPending: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Custom React hook for safely executing mutations with double-click protection,
 * automatic pending state, and deterministic idempotency key attachment.
 */
export function useIdempotentMutation<TData = unknown, TVariables = void>({
  mutationFn,
  onSuccess,
  onError,
  operationName = "operation",
  successMessage,
  errorMessage,
}: UseIdempotentMutationOptions<TData, TVariables>): UseIdempotentMutationResult<TData, TVariables> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Guard against concurrent execution in React component state
  const isExecutingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    isExecutingRef.current = false;
  }, []);

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData | undefined> => {
      // 1. Prevent concurrent double executions if already in progress
      if (isExecutingRef.current) {
        console.warn(`[useIdempotentMutation] Prevented duplicate execution for '${operationName}'`);
        return undefined;
      }

      isExecutingRef.current = true;
      if (isMountedRef.current) {
        setIsLoading(true);
        setError(null);
      }

      // Generate a fresh unique idempotency key for this logical mutation attempt
      const idempotencyKey = generateIdempotencyKey(operationName);

      try {
        const data = await mutationFn(variables, idempotencyKey);

        if (isMountedRef.current) {
          setIsLoading(false);
          isExecutingRef.current = false;
        }

        if (successMessage) {
          toast.success(successMessage);
        }

        if (onSuccess) {
          onSuccess(data, variables);
        }

        return data;
      } catch (err) {
        const catchedError = err instanceof Error ? err : new Error(String(err));

        if (isMountedRef.current) {
          setError(catchedError);
          setIsLoading(false);
          isExecutingRef.current = false;
        }

        const msg = errorMessage || catchedError.message || "An error occurred during submission.";
        toast.error("Operation Failed", { description: msg });

        if (onError) {
          onError(catchedError, variables);
        }

        return undefined;
      }
    },
    [mutationFn, onSuccess, onError, operationName, successMessage, errorMessage]
  );

  return {
    mutate,
    isLoading,
    isPending: isLoading,
    error,
    reset,
  };
}
