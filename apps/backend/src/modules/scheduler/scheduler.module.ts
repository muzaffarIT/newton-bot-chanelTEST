import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SchedulerService } from './scheduler.service';
import { SchedulerProcessor } from './scheduler.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { SchedulerController } from './scheduler.controller';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'channel-posts-queue',
        }),
        PrismaModule
    ],
    controllers: [SchedulerController],
    providers: [SchedulerService, SchedulerProcessor],
    exports: [SchedulerService]
})
export class SchedulerModule { }
