import { CopyIcon, LinkIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/api";
import type { ResourceType, Share } from "@/features/sharing/api";
import { useCreateShare, useRevokeShare } from "@/features/sharing/hooks";

interface PublicLinkSectionProps {
  resourceType: ResourceType;
  resourceId: string;
  shares: Share[];
}

export function PublicLinkSection({ resourceType, resourceId, shares }: PublicLinkSectionProps) {
  const createMutation = useCreateShare(resourceType, resourceId);
  const revokeMutation = useRevokeShare(resourceType, resourceId);

  const publicShare = shares.find((share) => share.mode === "PUBLIC_LINK") ?? null;

  function handleCreate() {
    createMutation.mutate(
      { mode: "PUBLIC_LINK" },
      {
        onSuccess: () => toast.success("Public link created"),
        onError: (error) => toast.error(getErrorMessage(error, "Could not create the public link")),
      }
    );
  }

  function handleRevoke() {
    if (!publicShare) return;
    revokeMutation.mutate(publicShare.id, {
      onSuccess: () => toast.success("Public link revoked"),
      onError: (error) => toast.error(getErrorMessage(error, "Could not revoke the public link")),
    });
  }

  function handleCopy() {
    if (!publicShare?.token) return;
    const url = `${window.location.origin}/share/${publicShare.token}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Link copied"))
      .catch(() => toast.error("Could not copy the link"));
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Public link</p>

      {publicShare ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Input readOnly value={`${window.location.origin}/share/${publicShare.token}`} className="font-mono text-xs" />
            <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
              <CopyIcon /> Copy
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start text-destructive hover:text-destructive"
            disabled={revokeMutation.isPending}
            onClick={handleRevoke}
          >
            {revokeMutation.isPending ? "Revoking..." : "Revoke public link"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Anyone with the link can view this, read-only.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            disabled={createMutation.isPending}
            onClick={handleCreate}
          >
            <LinkIcon /> {createMutation.isPending ? "Creating..." : "Create public link"}
          </Button>
        </div>
      )}
    </div>
  );
}
