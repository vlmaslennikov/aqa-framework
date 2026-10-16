import { api } from "@/lib/api";
import type { AccessLevel, ContentItem, Page, PageParams } from "@/features/data-room/api";

export type ResourceType = "DATAROOM" | "FOLDER" | "FILE";
export type ShareMode = "PUBLIC_LINK" | "USER";

export interface Share {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  mode: ShareMode;
  token: string | null;
  granteeEmail: string | null;
  createdById: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface ReceivedShare {
  shareId: string;
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  dataRoomId: string;
  sharedAt: string;
}

export interface DataRoomDetail {
  id: string;
  name: string;
  createdAt: string;
  accessLevel: AccessLevel;
}

export interface PublicShareSummary {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  dataRoomId: string;
  size?: number;
  mimeType?: string;
}

export interface CreateShareInput {
  resourceType: ResourceType;
  resourceId: string;
  mode: ShareMode;
  granteeEmail?: string;
}

export async function createShare(input: CreateShareInput): Promise<Share> {
  const { data } = await api.post<Share>("/shares", input);
  return data;
}

export async function listShares(
  resourceType: ResourceType,
  resourceId: string,
  params: PageParams & { mode?: ShareMode } = {}
): Promise<Page<Share>> {
  const { data } = await api.get<Page<Share>>("/shares", { params: { resourceType, resourceId, ...params } });
  return data;
}

export async function revokeShare(shareId: string): Promise<void> {
  await api.delete(`/shares/${shareId}`);
}

export async function fetchReceivedShares(params: PageParams = {}): Promise<Page<ReceivedShare>> {
  const { data } = await api.get<Page<ReceivedShare>>("/shares/received", { params });
  return data;
}

export async function fetchDataRoomDetail(dataRoomId: string): Promise<DataRoomDetail> {
  const { data } = await api.get<DataRoomDetail>(`/data-rooms/${dataRoomId}`);
  return data;
}

export async function fetchPublicShare(token: string): Promise<PublicShareSummary> {
  const { data } = await api.get<PublicShareSummary>(`/public/${token}`);
  return data;
}

export async function fetchPublicRootContents(token: string, params: PageParams = {}): Promise<Page<ContentItem>> {
  const { data } = await api.get<Page<ContentItem>>(`/public/${token}/contents`, { params });
  return data;
}

export async function fetchPublicFolderContents(
  token: string,
  folderId: string,
  params: PageParams = {}
): Promise<Page<ContentItem>> {
  const { data } = await api.get<Page<ContentItem>>(`/public/${token}/folders/${folderId}/contents`, { params });
  return data;
}

export async function fetchPublicFileViewUrl(token: string, fileId: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(`/public/${token}/files/${fileId}/view-url`);
  return data.url;
}

export async function fetchPublicFileDownloadUrl(token: string, fileId: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(`/public/${token}/files/${fileId}/download-url`);
  return data.url;
}

export interface PublicFileSummary {
  id: string;
  name: string;
  size: number;
  mimeType: string;
}

export async function fetchPublicFileSummary(token: string, fileId: string): Promise<PublicFileSummary> {
  const { data } = await api.get<PublicFileSummary>(`/public/${token}/files/${fileId}`);
  return data;
}
