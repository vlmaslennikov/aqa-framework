import { api } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AuthResponse {
  accessToken: string;
}

export const authMeKey = ["auth", "me"] as const;

export async function loginRequest(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
  return data;
}

export async function registerRequest(name: string, email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/register", { name, email, password });
  return data;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>("/auth/me");
  return data;
}
