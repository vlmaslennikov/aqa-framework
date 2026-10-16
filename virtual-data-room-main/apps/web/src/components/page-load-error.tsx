import { Button } from "@/components/ui/button";

interface PageLoadErrorProps {
  message: string;
  onRetry?: () => void;
}

export function PageLoadError({ message, onRetry }: PageLoadErrorProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
