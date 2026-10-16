import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export class UploadIntentDto {
  @IsUUID()
  dataRoomId!: string;

  @IsOptional()
  @IsUUID()
  folderId?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Enter a file name' })
  @MaxLength(255)
  name!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_FILE_SIZE_BYTES, { message: 'File exceeds the 50 MB limit' })
  size!: number;

  @IsIn(['application/pdf'], { message: 'Only PDF files are supported' })
  mimeType!: string;
}
