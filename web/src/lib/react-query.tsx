'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

/**
 * QueryClient instance with optimized defaults
 * - staleTime: 1 minute - data considered fresh for 1 minute
 * - gcTime: 5 minutes - cache garbage collected after 5 minutes of inactivity
 * - retry: 1 - retry failed requests once
 * - refetchOnWindowFocus: false - don't refetch on window focus (better UX)
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: use singleton pattern to keep the same query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

/**
 * QueryClientProvider wrapper component
 * Provides React Query context to the application
 */
export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const queryClient = useState(() => getQueryClient())[0];

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
