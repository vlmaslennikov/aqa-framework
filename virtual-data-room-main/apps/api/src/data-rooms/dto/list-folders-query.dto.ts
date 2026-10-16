import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

export class ListFoldersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
