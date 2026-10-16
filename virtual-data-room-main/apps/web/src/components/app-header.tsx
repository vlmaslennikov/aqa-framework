import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/use-auth";

export function AppHeader() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isSharedWithMe = location.pathname.startsWith("/shared-with-me");
  const tabClassName = (active: boolean) =>
    active ? "text-sm font-medium text-foreground" : "text-sm text-muted-foreground hover:text-foreground";

  return (
    <header className="flex flex-wrap items-center justify-between gap-y-2 border-b p-4">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-sm font-semibold text-foreground hover:text-foreground/80">
          Data Room
        </Link>
        <nav className="flex items-center gap-3">
          <Link to="/" aria-current={isSharedWithMe ? undefined : "page"} className={tabClassName(!isSharedWithMe)}>
            My data rooms
          </Link>
          <Link
            to="/shared-with-me"
            aria-current={isSharedWithMe ? "page" : undefined}
            className={tabClassName(isSharedWithMe)}
          >
            Shared with me
          </Link>
        </nav>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="max-w-[7rem] truncate text-sm text-muted-foreground sm:max-w-xs">
          {user?.name ?? user?.email}
        </span>
        <Button variant="outline" size="sm" onClick={logout}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
