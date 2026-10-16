import { Button } from "@/components/ui/button";

interface PublicShareErrorProps {
  revoked: boolean;
  onRetry?: () => void;
}

export function PublicShareError({ revoked, onRetry }: PublicShareErrorProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-base font-medium">{revoked ? "This link has been revoked" : "Link not available"}</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {revoked
          ? "This link has been revoked. Ask the owner for a new one."
          : "This link is invalid or no longer available."}
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
