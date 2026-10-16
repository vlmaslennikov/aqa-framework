import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";

import {
  createDataRoom,
  fetchBreadcrumbs,
  fetchDataRoomContents,
  fetchDataRooms,
  fetchDeletePreview,
  fetchFolderContents,
  fetchFolders,
} from "@/features/data-room/api";
import type { ContentItem, DataRoom, FolderNode, Page } from "@/features/data-room/api";

export type ContentsQuery = UseInfiniteQueryResult<InfiniteData<Page<ContentItem>>, unknown>;
export type DataRoomsQuery = UseInfiniteQueryResult<InfiniteData<Page<DataRoom>>, unknown>;
export type FoldersQuery = UseInfiniteQueryResult<InfiniteData<Page<FolderNode>>, unknown>;

export const dataRoomsKey = ["data-rooms"] as const;

export function contentsKey(dataRoomId: string, folderId: string | null) {
  return ["folder-contents", folderId ?? `root:${dataRoomId}`] as const;
}

export function breadcrumbsKey(folderId: string) {
  return ["breadcrumbs", folderId] as const;
}

export function deletePreviewKey(folderId: string) {
  return ["delete-preview", folderId] as const;
}

export const foldersKeyPrefix = ["folders"] as const;

export function foldersKey(dataRoomId: string, parentId: string | null) {
  return [...foldersKeyPrefix, dataRoomId, parentId ?? "root"] as const;
}

export function useDataRooms(): DataRoomsQuery {
  return useInfiniteQuery({
    queryKey: dataRoomsKey,
    queryFn: ({ pageParam }) => fetchDataRooms({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useCreateDataRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createDataRoom(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dataRoomsKey }),
  });
}

export function useFolderContents(dataRoomId: string, folderId: string | null): ContentsQuery {
  return useInfiniteQuery({
    queryKey: contentsKey(dataRoomId, folderId),
    queryFn: ({ pageParam }) =>
      folderId
        ? fetchFolderContents(folderId, { cursor: pageParam })
        : fetchDataRoomContents(dataRoomId, { cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useBreadcrumbs(folderId: string) {
  return useQuery({
    queryKey: breadcrumbsKey(folderId),
    queryFn: () => fetchBreadcrumbs(folderId),
    retry: false,
  });
}

export function useDeletePreview(folderId: string | null) {
  return useQuery({
    queryKey: deletePreviewKey(folderId ?? "none"),
    queryFn: () => fetchDeletePreview(folderId!),
    enabled: folderId !== null,
  });
}

// Folder levels stay fresh for a minute so re-expanding cached branches is
// instant; folder mutations invalidate the whole `foldersKeyPrefix` scope.
export function useFolders(dataRoomId: string, parentId: string | null, enabled: boolean): FoldersQuery {
  return useInfiniteQuery({
    queryKey: foldersKey(dataRoomId, parentId),
    queryFn: ({ pageParam }) => fetchFolders(dataRoomId, parentId, { cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
    staleTime: 60_000,
  });
}
