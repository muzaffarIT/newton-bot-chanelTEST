import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SheetsService } from './sheets.service';
import { SheetsProcessor } from './sheets.processor';

@Module({
    imports: [
        BullModule.registerQueue({ name: 'sheets-queue' }),
    ],
    providers: [SheetsService, SheetsProcessor],
    exports: [SheetsService],
})
export class SheetsModule { }
