import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/api";
import { contentsKey } from "@/features/data-room/hooks";
import {
  completeUpload,
  createUploadIntent,
  uploadFileToStorage,
  type UploadIntent,
} from "@/features/data-room/upload/api";

const MAX_CONCURRENT_UPLOADS = 4;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export type UploadStatus = "queued" | "uploading" | "done" | "error";

export interface UploadTask {
  id: string;
  file: File;
  name: string;
  status: UploadStatus;
  progress: number;
  error?: string;
  intent?: UploadIntent;
}

function isPdf(file: File): boolean {
  if (file.type) return file.type === "application/pdf";
  return file.name.toLowerCase().endsWith(".pdf");
}

export function useUploadQueue(dataRoomId: string, folderId: string | null) {
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const tasksRef = useRef<UploadTask[]>([]);
  const activeCount = useRef(0);

  const updateTask = useCallback((id: string, patch: Partial<UploadTask>) => {
    const next = tasksRef.current.map((task) => (task.id === id ? { ...task, ...patch } : task));
    tasksRef.current = next;
    setTasks(next);
  }, []);

  const runTask = useCallback(
    async (taskId: string) => {
      const task = tasksRef.current.find((t) => t.id === taskId);
      if (!task) return;

      try {
        // Reuse the intent from a previous attempt on retry - minting a new
        // one would leave the old pending row reserving the name and land
        // the retried file as a spurious "name (1).pdf".
        const intent =
          task.intent ??
          (await createUploadIntent({
            dataRoomId,
            folderId: folderId ?? undefined,
            name: task.file.name,
            size: task.file.size,
            mimeType: task.file.type || "application/pdf",
          }));
        updateTask(taskId, { name: intent.name, intent });

        await uploadFileToStorage(intent.uploadUrl, task.file, (pct) => updateTask(taskId, { progress: pct }));
        await completeUpload(intent.fileId);

        updateTask(taskId, { status: "done", progress: 100 });
        queryClient.invalidateQueries({ queryKey: contentsKey(dataRoomId, folderId) });
      } catch (error) {
        updateTask(taskId, { status: "error", error: getErrorMessage(error, "Upload failed") });
      }
    },
    [dataRoomId, folderId, queryClient, updateTask]
  );

  const pumpRef = useRef<() => void>(() => {});

  const pump = useCallback(() => {
    while (activeCount.current < MAX_CONCURRENT_UPLOADS) {
      const next = tasksRef.current.find((task) => task.status === "queued");
      if (!next) return;

      activeCount.current += 1;
      updateTask(next.id, { status: "uploading", progress: 0, error: undefined });

      runTask(next.id).finally(() => {
        activeCount.current -= 1;
        pumpRef.current();
      });
    }
  }, [runTask, updateTask]);

  useEffect(() => {
    pumpRef.current = pump;
  }, [pump]);

  const enqueue = useCallback(
    (files: File[]) => {
      const rejected: string[] = [];
      const accepted: UploadTask[] = [];

      for (const file of files) {
        if (!isPdf(file)) {
          rejected.push(`${file.name} is not a PDF`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          rejected.push(`${file.name} is larger than 50 MB`);
          continue;
        }
        accepted.push({ id: crypto.randomUUID(), file, name: file.name, status: "queued", progress: 0 });
      }

      if (rejected.length > 0) {
        toast.error(rejected.length === 1 ? rejected[0] : `${rejected.length} files were rejected`, {
          description: rejected.length > 1 ? rejected.join(", ") : undefined,
        });
      }

      if (accepted.length > 0) {
        const next = [...tasksRef.current, ...accepted];
        tasksRef.current = next;
        setTasks(next);
        pump();
      }
    },
    [pump]
  );

  const retry = useCallback(
    (taskId: string) => {
      updateTask(taskId, { status: "queued", progress: 0, error: undefined });
      pump();
    },
    [pump, updateTask]
  );

  // Dismissing the panel discards finished tasks (done or error), so the
  // next batch starts with a clean list. In-flight tasks are kept as a
  // safety net, although the panel only offers Close when none are active.
  const clearFinished = useCallback(() => {
    const next = tasksRef.current.filter(
      (task) => task.status === "queued" || task.status === "uploading"
    );
    tasksRef.current = next;
    setTasks(next);
  }, []);

  return { tasks, enqueue, retry, clearFinished };
}
