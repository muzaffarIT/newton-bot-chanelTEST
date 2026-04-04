import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [PrismaModule, PointsModule],
  providers: [StoreService],
  controllers: [StoreController],
  exports: [StoreService],
})
export class StoreModule {}
