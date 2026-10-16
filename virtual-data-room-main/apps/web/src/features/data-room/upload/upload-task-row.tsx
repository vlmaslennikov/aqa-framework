import { RotateCcwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { UploadTask } from "@/features/data-room/upload/use-upload-queue";

const STATUS_LABEL: Record<UploadTask["status"], string> = {
  queued: "Queued",
  uploading: "Uploading",
  done: "Done",
  error: "Error",
};

interface UploadTaskRowProps {
  task: UploadTask;
  onRetry: () => void;
}

export function UploadTaskRow({ task, onRetry }: UploadTaskRowProps) {
  return (
    <li className="flex flex-col gap-1.5 border-b px-3 py-2 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm" title={task.name}>
          {task.name}
        </span>
        <span
          className={cn(
            "shrink-0 text-xs text-muted-foreground",
            task.status === "error" && "text-destructive",
            task.status === "done" && "text-primary"
          )}
        >
          {STATUS_LABEL[task.status]}
        </span>
      </div>

      {task.status === "uploading" && <Progress value={task.progress} />}

      {task.status === "error" && (
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-destructive" title={task.error}>
            {task.error}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Retry upload of ${task.name}`}
            onClick={onRetry}
          >
            <RotateCcwIcon />
          </Button>
        </div>
      )}
    </li>
  );
}
