import { useLocation } from "react-router-dom";

export const SHARED_SECTION_PREFIX = "/shared-with-me";

export function useSectionPrefix(): string {
  const location = useLocation();
  const { pathname } = location;
  const isShared = pathname === SHARED_SECTION_PREFIX || pathname.startsWith(`${SHARED_SECTION_PREFIX}/`);
  return isShared ? SHARED_SECTION_PREFIX : "";
}

export function withSection(prefix: string, path: string): string {
  return `${prefix}${path}`;
}
