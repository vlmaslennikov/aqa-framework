import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateFolderDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Enter a folder name' })
  @MaxLength(200)
  name!: string;

  @IsUUID()
  dataRoomId!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
