import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SheetsService } from './sheets.service';

@Processor('sheets-queue')
@Injectable()
export class SheetsProcessor extends WorkerHost {
    private readonly logger = new Logger(SheetsProcessor.name);

    constructor(private readonly sheetsService: SheetsService) {
        super();
    }

    async process(job: Job): Promise<any> {
        const { type } = job.data;

        try {
            if (type === 'lead') {
                await this.processLeadWrite(job.data);
            } else if (type === 'result') {
                await this.processResultWrite(job.data);
            } else {
                this.logger.warn(`Unknown sheets job type: ${type}`);
            }
        } catch (e) {
            this.logger.error(`Sheets job failed [${type}] attempt ${job.attemptsMade + 1}`, e);
            throw e; // Re-throw so BullMQ retries with backoff
        }
    }

    private async processLeadWrite(data: any) {
        this.logger.log(`Writing lead to Sheets: ${data.telegramId}`);
        await this.sheetsService.appendRow('Leads!A:J', [
            new Date().toISOString(),
            data.telegramId,
            data.name,
            data.phone,
            data.parentName || '',
            data.parentPhone || '',
            data.grade || '',
            data.direction || '',
            data.language || 'ru',
            'REGISTERED',
        ]);
    }

    private async processResultWrite(data: any) {
        this.logger.log(`Writing result to Sheets: ${data.telegramId}`);
        await this.sheetsService.appendRow('Test Results!A:J', [
            new Date().toISOString(),
            data.telegramId,
            data.name,
            data.testName,
            `${data.scorePercentage}%`,
            data.level,
            data.correctCount,
            data.incorrectCount,
            data.strongTopics,
            data.weakTopics,
        ]);
    }
}
