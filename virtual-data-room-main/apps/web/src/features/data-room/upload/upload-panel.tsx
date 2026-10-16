import { useEffect } from "react";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { UploadTask } from "@/features/data-room/upload/use-upload-queue";
import { UploadTaskRow } from "@/features/data-room/upload/upload-task-row";

// Auto-dismiss delay for a fully successful batch. Long enough to read the
// final state, short enough not to linger; batches with errors never
// auto-dismiss - the Retry button must stay visible until acted on.
const AUTO_DISMISS_MS = 5000;

interface UploadPanelProps {
  tasks: UploadTask[];
  onRetry: (taskId: string) => void;
  onClose: () => void;
}

export function UploadPanel({ tasks, onRetry, onClose }: UploadPanelProps) {
  const allDone = tasks.length > 0 && tasks.every((task) => task.status === "done");

  useEffect(() => {
    if (!allDone) return;
    const timer = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [allDone, onClose]);

  if (tasks.length === 0) return null;

  const isActive = tasks.some((task) => task.status === "queued" || task.status === "uploading");
  const hasError = tasks.some((task) => task.status === "error");

  const title = isActive ? "Uploading files" : hasError ? "Some uploads failed" : "Uploads complete";

  return (
    <div className="fixed right-4 bottom-4 z-50 w-80 overflow-hidden rounded-lg border bg-background shadow-lg">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">{title}</span>
        {!isActive && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Close upload panel"
            onClick={onClose}
          >
            <XIcon />
          </Button>
        )}
      </div>
      <ul className="max-h-72 overflow-y-auto">
        {tasks.map((task) => (
          <UploadTaskRow key={task.id} task={task} onRetry={() => onRetry(task.id)} />
        ))}
      </ul>
    </div>
  );
}
