import { Navigate, useParams } from "react-router-dom";

import { AppHeader } from "@/components/app-header";
import { PageLoadError } from "@/components/page-load-error";
import { isNotFoundError } from "@/lib/api";
import { SHARED_SECTION_PREFIX, useSectionPrefix, withSection } from "@/lib/section";
import { DataRoomSkeleton } from "@/features/data-room/components/data-room-skeleton";
import { FolderExplorer } from "@/features/data-room/components/folder-explorer";
import { FolderNotFound } from "@/features/data-room/components/folder-not-found";
import { useBreadcrumbs } from "@/features/data-room/hooks";

export function FolderPage() {
  const { id } = useParams<{ id: string }>();
  const breadcrumbsQuery = useBreadcrumbs(id ?? "");
  const prefix = useSectionPrefix();

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />

      <main className="flex flex-1 flex-col">
        {breadcrumbsQuery.isPending && <DataRoomSkeleton />}

        {breadcrumbsQuery.isError &&
          (isNotFoundError(breadcrumbsQuery.error) ? (
            <FolderNotFound />
          ) : (
            <PageLoadError message="Could not load this folder." onRetry={() => breadcrumbsQuery.refetch()} />
          ))}

        {breadcrumbsQuery.isSuccess &&
          id &&
          (() => {
            const canonicalPrefix = breadcrumbsQuery.data.accessLevel === "OWNER" ? "" : SHARED_SECTION_PREFIX;
            if (prefix !== canonicalPrefix) {
              return <Navigate to={withSection(canonicalPrefix, `/folder/${id}`)} replace />;
            }
            return (
              <FolderExplorer
                dataRoomId={breadcrumbsQuery.data.dataRoomId}
                dataRoomName={breadcrumbsQuery.data.dataRoomName}
                folderId={id}
                breadcrumbFolders={breadcrumbsQuery.data.folders}
                accessLevel={breadcrumbsQuery.data.accessLevel}
              />
            );
          })()}
      </main>
    </div>
  );
}
