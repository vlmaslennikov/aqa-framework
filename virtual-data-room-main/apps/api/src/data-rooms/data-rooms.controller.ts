import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { DataRoomsService } from './data-rooms.service';
import { CreateDataRoomDto } from './dto/create-data-room.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { ListFoldersQueryDto } from './dto/list-folders-query.dto';

@Controller('data-rooms')
export class DataRoomsController {
  constructor(private readonly dataRoomsService: DataRoomsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDataRoomDto,
  ) {
    return this.dataRoomsService.create(user.id, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.dataRoomsService.findAllForUser(user.id, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dataRoomsService.findOne(user.id, id);
  }

  @Get(':id/contents')
  getContents(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.dataRoomsService.getContents(user.id, id, query);
  }

  @Get(':id/folders')
  getFolders(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListFoldersQueryDto,
  ) {
    return this.dataRoomsService.getFolders(
      user.id,
      id,
      query.parentId ?? null,
      query,
    );
  }
}
