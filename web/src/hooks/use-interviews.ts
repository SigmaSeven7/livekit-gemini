import { useInfiniteQuery } from '@tanstack/react-query';

export interface InterviewListItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'in_progress' | 'completed' | 'paused';
  config: Record<string, unknown> | null;
  messageCount: number;
  transcript: any[];
}

interface InterviewsResponse {
  data: InterviewListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Hook for fetching interviews with cursor-based pagination
 * Uses TanStack Query's useInfiniteQuery for automatic caching and state management
 */
export function useInterviews() {
  return useInfiniteQuery<InterviewsResponse>({
    queryKey: ['interviews'],
    queryFn: async ({ pageParam }) => {
      const url = new URL('/api/interviews', window.location.origin);
      if (pageParam) {
        url.searchParams.set('cursor', pageParam as string);
      }
      url.searchParams.set('limit', '10');

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch interviews');
      }
      return response.json();
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
  });
}
