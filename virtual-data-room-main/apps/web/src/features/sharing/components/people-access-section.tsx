import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { getErrorMessage } from "@/lib/api";
import type { ResourceType, Share } from "@/features/sharing/api";
import { useCreateShare, useRevokeShare } from "@/features/sharing/hooks";
import { shareByEmailSchema, type ShareByEmailValues } from "@/features/sharing/schemas";

interface PeopleAccessSectionProps {
  resourceType: ResourceType;
  resourceId: string;
  shares: Share[];
}

export function PeopleAccessSection({ resourceType, resourceId, shares }: PeopleAccessSectionProps) {
  const createMutation = useCreateShare(resourceType, resourceId);
  const revokeMutation = useRevokeShare(resourceType, resourceId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShareByEmailValues>({
    resolver: zodResolver(shareByEmailSchema),
    defaultValues: { email: "" },
  });

  const peopleShares = shares.filter((share) => share.mode === "USER");

  function onSubmit(values: ShareByEmailValues) {
    createMutation.mutate(
      { mode: "USER", granteeEmail: values.email },
      {
        onSuccess: () => {
          toast.success(`Shared with ${values.email}`);
          reset();
        },
        onError: (error) => toast.error(getErrorMessage(error, "Could not share with this email")),
      }
    );
  }

  function handleRevoke(share: Share) {
    revokeMutation.mutate(share.id, {
      onSuccess: () => toast.success(`Access revoked for ${share.granteeEmail}`),
      onError: (error) => toast.error(getErrorMessage(error, "Could not revoke access")),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">People with access</p>

      <form noValidate className="flex items-end gap-2" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex-1">
          <FormField
            id="share-email"
            label="Email"
            autoFocus
            placeholder="person@example.com"
            autoComplete="email"
            disabled={createMutation.isPending}
            error={errors.email?.message}
            {...register("email")}
          />
        </div>
        <Button type="submit" size="sm" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Sharing..." : "Share"}
        </Button>
      </form>

      {peopleShares.length === 0 ? (
        <p className="text-sm text-muted-foreground">No one has been given access yet.</p>
      ) : (
        <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
          {peopleShares.map((share) => (
            <li key={share.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{share.granteeEmail}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={revokeMutation.isPending && revokeMutation.variables === share.id}
                onClick={() => handleRevoke(share)}
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
