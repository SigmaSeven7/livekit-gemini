import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchInterviewDto } from '@/lib/api/interviews';
import type { InterviewDto } from '@/types/interview';



interface InterviewsResponse {
  data: InterviewDto[];
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
  return useQuery<InterviewDto>({
    queryKey: ['interview', id],
    queryFn: async () => fetchInterviewDto(id),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute cache
  });
}
