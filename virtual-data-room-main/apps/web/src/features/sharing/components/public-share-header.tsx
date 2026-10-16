import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/use-auth";

export function PublicShareHeader() {
  const { user, isLoading } = useAuth();

  return (
    <header className="flex items-center justify-between border-b p-4">
      <span className="text-sm font-medium">Data Room — shared view</span>
      {!isLoading && (
        <Button size="sm" variant="outline" render={<Link to={user ? "/" : "/login"} />}>
          {user ? "Go to my data room" : "Log in"}
        </Button>
      )}
    </header>
  );
}
