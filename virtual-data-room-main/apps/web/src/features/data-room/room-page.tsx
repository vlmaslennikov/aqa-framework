import { Navigate, useParams } from "react-router-dom";

import { AppHeader } from "@/components/app-header";
import { PageLoadError } from "@/components/page-load-error";
import { isNotFoundError } from "@/lib/api";
import { SHARED_SECTION_PREFIX, useSectionPrefix, withSection } from "@/lib/section";
import { DataRoomSkeleton } from "@/features/data-room/components/data-room-skeleton";
import { DataRoomNotFound } from "@/features/data-room/components/data-room-not-found";
import { FolderExplorer } from "@/features/data-room/components/folder-explorer";
import { useDataRoomDetail } from "@/features/sharing/hooks";

export function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const roomQuery = useDataRoomDetail(id ?? "");
  const prefix = useSectionPrefix();

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />

      <main className="flex flex-1 flex-col">
        {roomQuery.isPending && <DataRoomSkeleton />}

        {roomQuery.isError &&
          (isNotFoundError(roomQuery.error) ? (
            <DataRoomNotFound />
          ) : (
            <PageLoadError message="Could not load this data room." onRetry={() => roomQuery.refetch()} />
          ))}

        {roomQuery.isSuccess &&
          (() => {
            const canonicalPrefix = roomQuery.data.accessLevel === "OWNER" ? "" : SHARED_SECTION_PREFIX;
            if (prefix !== canonicalPrefix) {
              return <Navigate to={withSection(canonicalPrefix, `/room/${roomQuery.data.id}`)} replace />;
            }
            return (
              <FolderExplorer
                dataRoomId={roomQuery.data.id}
                dataRoomName={roomQuery.data.name}
                folderId={null}
                breadcrumbFolders={[]}
                accessLevel={roomQuery.data.accessLevel}
              />
            );
          })()}
      </main>
    </div>
  );
}
