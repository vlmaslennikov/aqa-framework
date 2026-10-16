import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { PublicSharesService } from './public-shares.service';
import { Public } from '@/common/decorators/public.decorator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

@Public()
@Controller('public')
export class PublicSharesController {
  constructor(private readonly publicSharesService: PublicSharesService) {}

  @Get(':token')
  getShare(@Param('token') token: string) {
    return this.publicSharesService.getShare(token);
  }

  @Get(':token/contents')
  getRootContents(
    @Param('token') token: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.publicSharesService.getRootContents(token, query);
  }

  @Get(':token/folders/:id/contents')
  getFolderContents(
    @Param('token') token: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.publicSharesService.getFolderContents(token, id, query);
  }

  @Get(':token/files/:id/view-url')
  getFileViewUrl(
    @Param('token') token: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.publicSharesService.getFileViewUrl(token, id);
  }

  @Get(':token/files/:id/download-url')
  getFileDownloadUrl(
    @Param('token') token: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.publicSharesService.getFileDownloadUrl(token, id);
  }

  @Get(':token/files/:id')
  getFileSummary(
    @Param('token') token: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.publicSharesService.getFileSummary(token, id);
  }
}
