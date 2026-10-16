import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/use-auth";

function AuthCheckPlaceholder() {
  return <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">Loading...</div>;
}

function SessionCheckError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-4 text-center">
      <p className="text-sm text-muted-foreground">
        Could not verify your session. Check your connection and try again.
      </p>
      <Button variant="outline" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading, sessionCheckFailed, retrySessionCheck } = useAuth();

  if (isLoading) return <AuthCheckPlaceholder />;

  if (!user && sessionCheckFailed) return <SessionCheckError onRetry={retrySessionCheck} />;

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <AuthCheckPlaceholder />;

  if (user) return <Navigate to="/" replace />;

  return <>{children}</>;
}
