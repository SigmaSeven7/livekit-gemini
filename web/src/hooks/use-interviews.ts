import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Interview } from '@/types/interview';



interface InterviewsResponse {
  data: Interview[];
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

/**
 * Hook for fetching a single interview by ID
 * Uses TanStack Query's useQuery with 1 minute cache
 */
export function useInterview(id: string) {
  return useQuery<Interview>({
    queryKey: ['interview', id],
    queryFn: async () => {
      const url = new URL('/api/history', window.location.origin);
      url.searchParams.set('id', id);

      const response = await fetch(url.toString());
     
      if (!response.ok) {
        throw new Error('Failed to fetch interview');
      }
      return response.json();
    },
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute cache
  });
}
