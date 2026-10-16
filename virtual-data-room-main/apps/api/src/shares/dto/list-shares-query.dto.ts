import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ShareMode, ShareResourceType } from '@prisma/client';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

export class ListSharesQueryDto extends PaginationQueryDto {
  @IsEnum(ShareResourceType)
  resourceType!: ShareResourceType;

  @IsUUID()
  resourceId!: string;

  @IsOptional()
  @IsEnum(ShareMode)
  mode?: ShareMode;
}
