import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';

import { PointsModule } from '../points/points.module';

@Global()
@Module({
    imports: [
        BullModule.registerQueue({
            name: 'test-timer-queue',
        }),
        PointsModule,
    ],
    providers: [SessionsService],
    controllers: [SessionsController],
    exports: [SessionsService],
})
export class SessionsModule { }
