import { InboxIcon } from "lucide-react";

export function NoReceivedSharesState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
      <InboxIcon className="size-8 text-muted-foreground" />
      <p className="text-sm font-medium">Nothing has been shared with you yet.</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        When someone shares a data room, folder, or file with your email, it will show up here.
      </p>
    </div>
  );
}
