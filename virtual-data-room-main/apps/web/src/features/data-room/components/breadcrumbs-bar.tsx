import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useSectionPrefix, withSection } from "@/lib/section";
import type { AccessLevel, BreadcrumbFolder } from "@/features/data-room/api";

interface BreadcrumbsBarProps {
  accessLevel: AccessLevel;
  dataRoomId: string;
  // Null when the trail was trimmed at a share boundary below the room root
  // - the room itself isn't a resource the viewer has access to, so there
  // is no room crumb to render at all (its ancestors are never restored).
  dataRoomName: string | null;
  folders: BreadcrumbFolder[];
}

export function BreadcrumbsBar({ accessLevel, dataRoomId, dataRoomName, folders }: BreadcrumbsBarProps) {
  const isShared = accessLevel !== "OWNER";
  const prefix = useSectionPrefix();
  // For a VIEWER, "/" is the viewer's own dashboard, not this room - the
  // room crumb has to point at the read-only /room/:id view instead.
  const roomTo = isShared ? withSection(prefix, `/room/${dataRoomId}`) : "/";

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
      {isShared && (
        <>
          <Crumb to="/shared-with-me" isCurrent={false}>
            Shared with me
          </Crumb>
          <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </>
      )}
      {dataRoomName !== null && (
        <>
          <Crumb to={roomTo} isCurrent={folders.length === 0}>
            {dataRoomName}
          </Crumb>
          {folders.length > 0 && <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />}
        </>
      )}
      {folders.map((folder, index) => (
        <Fragment key={folder.id}>
          {index > 0 && <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />}
          <Crumb to={withSection(prefix, `/folder/${folder.id}`)} isCurrent={index === folders.length - 1}>
            {folder.name}
          </Crumb>
        </Fragment>
      ))}
    </nav>
  );
}

function Crumb({ to, isCurrent, children }: { to: string; isCurrent: boolean; children: ReactNode }) {
  if (isCurrent) {
    return <span className="truncate font-medium text-foreground">{children}</span>;
  }

  return (
    <Link
      to={to}
      className={cn("truncate text-muted-foreground hover:text-foreground hover:underline")}
    >
      {children}
    </Link>
  );
}
