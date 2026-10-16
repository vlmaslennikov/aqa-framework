import { createClient, StorageApiError } from '@supabase/supabase-js';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const SIGNED_URL_TTL_SECONDS = 5 * 60;
const REMOVE_CHUNK_SIZE = 100;

@Injectable()
export class StorageService {
  private readonly client: ReturnType<typeof createClient>;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    this.client = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
    );
    this.bucket = config.getOrThrow<string>('SUPABASE_BUCKET');
  }

  async createUploadUrl(storageKey: string): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUploadUrl(storageKey);
    if (error || !data) {
      throw new InternalServerErrorException('Could not prepare the upload');
    }
    return data.signedUrl;
  }

  async createDownloadUrl(
    storageKey: string,
    fileName: string,
  ): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(storageKey, SIGNED_URL_TTL_SECONDS, {
        download: fileName,
      });
    if (error || !data) {
      throw new InternalServerErrorException('Could not prepare the download');
    }
    return data.signedUrl;
  }

  async createViewUrl(storageKey: string): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(storageKey, SIGNED_URL_TTL_SECONDS);
    if (error || !data) {
      throw new InternalServerErrorException('Could not prepare the file');
    }
    return data.signedUrl;
  }

  async removeObject(storageKey: string): Promise<void> {
    await this.removeObjects([storageKey]);
  }

  async removeObjects(storageKeys: string[]): Promise<void> {
    if (storageKeys.length === 0) return;
    for (let i = 0; i < storageKeys.length; i += REMOVE_CHUNK_SIZE) {
      const chunk = storageKeys.slice(i, i + REMOVE_CHUNK_SIZE);
      const { error } = await this.client.storage
        .from(this.bucket)
        .remove(chunk);
      if (error) {
        throw new InternalServerErrorException('Could not delete the file');
      }
    }
  }

  // A missing object (upload never finished) is a 404 from Supabase and
  // means "not uploaded yet" - any other failure (auth, network, 5xx) is a
  // real error and must not be reported to the caller as "not uploaded",
  // or a transient storage blip would permanently block completeUpload.
  async getObjectInfo(storageKey: string): Promise<{ size: number } | null> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .info(storageKey);
    if (error) {
      if (error instanceof StorageApiError && error.status === 404) {
        return null;
      }
      throw new InternalServerErrorException('Could not verify the upload');
    }
    if (!data || !data.size) {
      return null;
    }
    return { size: data.size };
  }
}
