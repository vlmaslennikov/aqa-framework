import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { RenameFolderDto } from './dto/rename-folder.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFolderDto) {
    return this.foldersService.create(user.id, dto);
  }

  @Get(':id/contents')
  getContents(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.foldersService.getContents(user.id, id, query);
  }

  @Get(':id/breadcrumbs')
  getBreadcrumbs(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.foldersService.getBreadcrumbs(user.id, id);
  }

  @Get(':id/delete-preview')
  getDeletePreview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.foldersService.getDeletePreview(user.id, id);
  }

  @Patch(':id')
  rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenameFolderDto,
  ) {
    return this.foldersService.rename(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.foldersService.remove(user.id, id);
  }
}
