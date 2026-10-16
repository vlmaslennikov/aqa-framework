import { DatabaseIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api";
import { useCreateDataRoom } from "@/features/data-room/hooks";

const DEFAULT_DATA_ROOM_NAME = "My Data Room";

export function NoDataRoomState() {
  const mutation = useCreateDataRoom();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <DatabaseIcon className="size-8 text-muted-foreground" />
      <p className="text-sm font-medium">You don't have a data room yet</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Create one to start uploading documents and organizing them into folders.
      </p>
      <Button
        disabled={mutation.isPending}
        onClick={() =>
          mutation.mutate(DEFAULT_DATA_ROOM_NAME, {
            onSuccess: () => toast.success("Data room created"),
            onError: (error) =>
              toast.error(getErrorMessage(error, "Could not create your data room")),
          })
        }
      >
        <PlusIcon />
        {mutation.isPending ? "Creating..." : "Create data room"}
      </Button>
    </div>
  );
}
