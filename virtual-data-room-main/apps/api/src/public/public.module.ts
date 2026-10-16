import { Module } from '@nestjs/common';
import { PublicSharesController } from './public-shares.controller';
import { PublicSharesService } from './public-shares.service';

@Module({
  controllers: [PublicSharesController],
  providers: [PublicSharesService],
})
export class PublicModule {}
