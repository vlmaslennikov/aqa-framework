import { IsEmail, IsEnum, IsUUID, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { ShareMode, ShareResourceType } from '@prisma/client';

export class CreateShareDto {
  @IsEnum(ShareResourceType)
  resourceType!: ShareResourceType;

  @IsUUID()
  resourceId!: string;

  @IsEnum(ShareMode)
  mode!: ShareMode;

  @ValidateIf((dto: CreateShareDto) => dto.mode === 'USER')
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Enter a valid email' })
  granteeEmail?: string;
}
