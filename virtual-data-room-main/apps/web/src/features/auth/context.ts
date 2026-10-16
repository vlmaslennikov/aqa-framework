import { createContext } from "react";

import type { AuthUser } from "@/features/auth/api";

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  sessionCheckFailed: boolean;
  retrySessionCheck: () => void;
  login: (token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
