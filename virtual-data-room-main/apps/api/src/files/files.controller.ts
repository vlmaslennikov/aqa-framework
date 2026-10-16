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
} from '@nestjs/common';
import { FilesService } from './files.service';
import { UploadIntentDto } from './dto/upload-intent.dto';
import { RenameFileDto } from './dto/rename-file.dto';
import { MoveFileDto } from './dto/move-file.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/decorators/current-user.decorator';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload-intent')
  createUploadIntent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadIntentDto,
  ) {
    return this.filesService.createUploadIntent(user.id, dto);
  }

  @Post(':id/complete')
  completeUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.filesService.completeUpload(user.id, id);
  }

  @Patch(':id')
  rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenameFileDto,
  ) {
    return this.filesService.rename(user.id, id, dto);
  }

  @Patch(':id/move')
  move(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveFileDto,
  ) {
    return this.filesService.move(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.filesService.remove(user.id, id);
  }

  @Get(':id/download-url')
  getDownloadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.filesService.getDownloadUrl(user.id, id);
  }

  @Get(':id')
  getFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.filesService.getFile(user.id, id);
  }

  @Get(':id/view-url')
  getViewUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.filesService.getViewUrl(user.id, id);
  }
}
