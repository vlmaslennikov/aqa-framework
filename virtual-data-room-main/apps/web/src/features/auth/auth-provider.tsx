import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

import { clearToken, getToken, setToken } from "@/lib/api";
import { authMeKey, fetchMe } from "@/features/auth/api";
import { AuthContext, type AuthContextValue } from "@/features/auth/context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [hasToken, setHasToken] = useState(() => Boolean(getToken()));

  const meQuery = useQuery({
    queryKey: authMeKey,
    queryFn: fetchMe,
    enabled: hasToken,
    retry: false,
  });

  // A real 401 already triggers a hard redirect from the api.ts interceptor.
  // Anything else (network error, 5xx) must not silently look like "logged out".
  const isSessionError = meQuery.isError && !(axios.isAxiosError(meQuery.error) && meQuery.error.response?.status === 401);

  useEffect(() => {
    if (isSessionError) {
      toast.error("Could not verify your session. Check your connection.");
    }
  }, [meQuery.errorUpdatedAt, isSessionError]);

  // Query keys are not scoped by user, so any identity change must drop the
  // whole cache - otherwise the next account sees the previous one's data.
  const login = useCallback(
    (token: string) => {
      queryClient.clear();
      setToken(token);
      setHasToken(true);
    },
    [queryClient]
  );

  const logout = useCallback(() => {
    clearToken();
    setHasToken(false);
    queryClient.clear();
    navigate("/login", { replace: true });
  }, [queryClient, navigate]);

  const retrySessionCheck = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: authMeKey });
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data ?? null,
      isLoading: hasToken && meQuery.isPending,
      sessionCheckFailed: hasToken && isSessionError,
      retrySessionCheck,
      login,
      logout,
    }),
    [meQuery.data, meQuery.isPending, hasToken, isSessionError, retrySessionCheck, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
