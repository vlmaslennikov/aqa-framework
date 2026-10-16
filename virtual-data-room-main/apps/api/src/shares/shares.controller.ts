import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { SharesService } from './shares.service';
import { CreateShareDto } from './dto/create-share.dto';
import { ListSharesQueryDto } from './dto/list-shares-query.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

@Controller('shares')
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateShareDto) {
    return this.sharesService.create(user.id, dto);
  }

  @Get('received')
  getReceived(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.sharesService.getReceived(user.id, query);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListSharesQueryDto,
  ) {
    return this.sharesService.list(
      user.id,
      query.resourceType,
      query.resourceId,
      query,
    );
  }

  @Delete(':id')
  @HttpCode(204)
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.sharesService.revoke(user.id, id);
  }
}
