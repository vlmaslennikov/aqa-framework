import { AppHeader } from "@/components/app-header";
import { PageLoadError } from "@/components/page-load-error";
import { DataRoomSkeleton } from "@/features/data-room/components/data-room-skeleton";
import { FolderExplorer } from "@/features/data-room/components/folder-explorer";
import { NoDataRoomState } from "@/features/data-room/components/no-data-room-state";
import { useDataRooms } from "@/features/data-room/hooks";

export function DataRoomPage() {
  const roomsQuery = useDataRooms();
  const firstRoom = roomsQuery.data?.pages[0]?.items[0];

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />

      <main className="flex flex-1 flex-col">
        {roomsQuery.isPending && <DataRoomSkeleton />}

        {roomsQuery.isError && !roomsQuery.data && (
          <PageLoadError message="Could not load your data room." onRetry={() => roomsQuery.refetch()} />
        )}

        {roomsQuery.data && !firstRoom && <NoDataRoomState />}

        {firstRoom && (
          <FolderExplorer
            dataRoomId={firstRoom.id}
            dataRoomName={firstRoom.name}
            folderId={null}
            breadcrumbFolders={[]}
            accessLevel="OWNER"
          />
        )}
      </main>
    </div>
  );
}
