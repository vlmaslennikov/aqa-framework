import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";

import {
  createShare,
  fetchDataRoomDetail,
  fetchReceivedShares,
  listShares,
  revokeShare,
  type CreateShareInput,
  type ReceivedShare,
  type ResourceType,
  type Share,
} from "@/features/sharing/api";
import type { Page } from "@/features/data-room/api";

export type SharesQuery = UseInfiniteQueryResult<InfiniteData<Page<Share>>, unknown>;
export type ReceivedSharesQuery = UseInfiniteQueryResult<InfiniteData<Page<ReceivedShare>>, unknown>;

export function sharesKey(resourceType: ResourceType, resourceId: string) {
  return ["shares", resourceType, resourceId] as const;
}

export const receivedSharesKey = ["shares", "received"] as const;

export function dataRoomDetailKey(dataRoomId: string) {
  return ["data-room-detail", dataRoomId] as const;
}

// Only the USER-mode share list is paginated - a resource has at most one
// active public link (enforced by `create`'s dedup), so it's fetched
// separately below and never falls off a page boundary as email grants
// accumulate.
export function useShares(resourceType: ResourceType, resourceId: string, enabled = true): SharesQuery {
  return useInfiniteQuery({
    queryKey: [...sharesKey(resourceType, resourceId), "USER"] as const,
    queryFn: ({ pageParam }) => listShares(resourceType, resourceId, { cursor: pageParam, mode: "USER" }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
}

export function usePublicLinkShare(resourceType: ResourceType, resourceId: string, enabled = true) {
  return useQuery({
    queryKey: [...sharesKey(resourceType, resourceId), "PUBLIC_LINK"] as const,
    queryFn: () => listShares(resourceType, resourceId, { mode: "PUBLIC_LINK", limit: 1 }),
    enabled,
  });
}

export function useCreateShare(resourceType: ResourceType, resourceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<CreateShareInput, "resourceType" | "resourceId">) =>
      createShare({ resourceType, resourceId, ...input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sharesKey(resourceType, resourceId) }),
  });
}

export function useRevokeShare(resourceType: ResourceType, resourceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shareId: string) => revokeShare(shareId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sharesKey(resourceType, resourceId) }),
  });
}

export function useReceivedShares(): ReceivedSharesQuery {
  return useInfiniteQuery({
    queryKey: receivedSharesKey,
    queryFn: ({ pageParam }) => fetchReceivedShares({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useDataRoomDetail(dataRoomId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: dataRoomDetailKey(dataRoomId),
    queryFn: () => fetchDataRoomDetail(dataRoomId),
    retry: false,
    enabled: options.enabled ?? true,
  });
}
